import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const CREATE_SCHEMA_MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS public.schema_migrations (
    filename text PRIMARY KEY,
    sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`

const TABLE_EXISTS_SQL = `
  SELECT to_regclass('public.schema_migrations') AS table_name
`

const SELECT_APPLIED_MIGRATIONS_SQL = `
  SELECT filename, sha256, applied_at
  FROM public.schema_migrations
  ORDER BY filename
`

const SELECT_MIGRATION_FOR_UPDATE_SQL = `
  SELECT filename, sha256, applied_at
  FROM public.schema_migrations
  WHERE filename = $1
  FOR UPDATE
`

const INSERT_MIGRATION_SQL = `
  INSERT INTO public.schema_migrations (filename, sha256)
  VALUES ($1, $2)
`

function compareFilenames(left, right) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

export function stripTransactionWrapper(sql) {
  return sql
    .replace(/^\uFEFF?\s*BEGIN\s*;\s*/i, '')
    .replace(/\s*COMMIT\s*;\s*$/i, '')
}

export async function loadMigrations(migrationsDir) {
  const entries = await readdir(migrationsDir, { withFileTypes: true })
  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort(compareFilenames)

  return Promise.all(filenames.map(async (filename) => {
    const filePath = path.join(migrationsDir, filename)
    const content = await readFile(filePath)
    return {
      filename,
      filePath,
      sha256: sha256(content),
      sql: stripTransactionWrapper(content.toString('utf8')),
    }
  }))
}

export async function readAppliedMigrations(client) {
  const tableResult = await client.query(TABLE_EXISTS_SQL)
  if (!tableResult.rows[0]?.table_name) {
    return {
      tableExists: false,
      migrations: [],
    }
  }

  const result = await client.query(SELECT_APPLIED_MIGRATIONS_SQL)
  return {
    tableExists: true,
    migrations: result.rows,
  }
}

function assertMatchingChecksum(migration, appliedMigration) {
  if (migration.sha256 === appliedMigration.sha256) return

  throw new Error(
    `Migration integrity error for ${migration.filename}: `
    + `file sha256 ${migration.sha256} does not match recorded sha256 `
    + `${appliedMigration.sha256}. Applied migrations are immutable; `
    + 'restore the original file or add a new migration.'
  )
}

export function buildMigrationPlan(migrations, appliedMigrations) {
  const appliedByFilename = new Map(
    appliedMigrations.map((migration) => [migration.filename, migration])
  )

  return migrations.map((migration) => {
    const appliedMigration = appliedByFilename.get(migration.filename)
    if (!appliedMigration) {
      return {
        ...migration,
        status: 'pending',
        appliedAt: null,
      }
    }

    assertMatchingChecksum(migration, appliedMigration)
    return {
      ...migration,
      status: 'applied',
      appliedAt: appliedMigration.applied_at,
    }
  })
}

export async function getMigrationStatus({ client, migrationsDir }) {
  const migrations = await loadMigrations(migrationsDir)
  const applied = await readAppliedMigrations(client)
  return {
    tableExists: applied.tableExists,
    migrations: buildMigrationPlan(migrations, applied.migrations),
  }
}

async function ensureSchemaMigrationsTable(client) {
  await client.query(CREATE_SCHEMA_MIGRATIONS_TABLE_SQL)
}

async function findAppliedMigrationForUpdate(client, filename) {
  const result = await client.query(SELECT_MIGRATION_FOR_UPDATE_SQL, [filename])
  return result.rows[0] || null
}

async function applyMigration(client, migration) {
  await client.query('BEGIN')
  try {
    await client.query('LOCK TABLE public.schema_migrations IN SHARE ROW EXCLUSIVE MODE')
    const existing = await findAppliedMigrationForUpdate(client, migration.filename)
    if (existing) {
      assertMatchingChecksum(migration, existing)
      await client.query('COMMIT')
      return false
    }

    await client.query(migration.sql)
    await client.query(INSERT_MIGRATION_SQL, [migration.filename, migration.sha256])
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw new Error(`Migration ${migration.filename} failed: ${error.message}`, {
      cause: error,
    })
  }
}

export async function runMigrations({ client, migrationsDir, dryRun = false }) {
  const status = await getMigrationStatus({ client, migrationsDir })
  const pending = status.migrations.filter((migration) => migration.status === 'pending')
  const skipped = status.migrations.filter((migration) => migration.status === 'applied')

  if (dryRun) {
    return {
      ...status,
      applied: [],
      pending,
      skipped,
      dryRun: true,
    }
  }

  await ensureSchemaMigrationsTable(client)
  const applied = []
  for (const migration of pending) {
    try {
      if (await applyMigration(client, migration)) applied.push(migration)
      else skipped.push(migration)
    } catch (error) {
      error.migrationResult = {
        applied,
        skipped,
        pending,
      }
      throw error
    }
  }

  return {
    ...status,
    applied,
    pending,
    skipped,
    dryRun: false,
  }
}

export async function baselineMigration({ client, migrationsDir, filename }) {
  const status = await getMigrationStatus({ client, migrationsDir })
  const migration = status.migrations.find((item) => item.filename === filename)
  if (!migration) {
    throw new Error(`Migration file not found: ${filename}`)
  }
  if (migration.status === 'applied') {
    return {
      migration,
      alreadyApplied: true,
    }
  }

  await ensureSchemaMigrationsTable(client)
  await client.query('BEGIN')
  try {
    await client.query('LOCK TABLE public.schema_migrations IN SHARE ROW EXCLUSIVE MODE')
    const existing = await findAppliedMigrationForUpdate(client, migration.filename)
    if (existing) {
      assertMatchingChecksum(migration, existing)
      await client.query('COMMIT')
      return {
        migration,
        alreadyApplied: true,
      }
    }

    await client.query(INSERT_MIGRATION_SQL, [migration.filename, migration.sha256])
    await client.query('COMMIT')
    return {
      migration,
      alreadyApplied: false,
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw new Error(`Could not baseline ${migration.filename}: ${error.message}`, {
      cause: error,
    })
  }
}

// A baselined migration is recorded as applied without its SQL ever running.
// That is correct for schema that predates the ledger, and wrong for anything
// else — the file is then never offered again, so the columns it was supposed
// to create are missing while the ledger claims otherwise. Removing the row
// puts the file back in the pending list; the SQL itself is untouched.
export async function unbaselineMigration({ client, migrationsDir, filename }) {
  const status = await getMigrationStatus({ client, migrationsDir })
  const migration = status.migrations.find((item) => item.filename === filename)
  if (!migration) {
    throw new Error(`Migration file not found: ${filename}`)
  }
  if (migration.status === 'pending') {
    return { migration, alreadyPending: true }
  }

  const result = await client.query(
    'DELETE FROM public.schema_migrations WHERE filename = $1 RETURNING filename',
    [migration.filename]
  )
  return { migration, alreadyPending: !result.rows[0] }
}
