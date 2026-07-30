import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  baselineMigration,
  getMigrationStatus,
  runMigrations,
  sha256,
} from '../src/lib/dbMigrations.js'

const temporaryDirectories = []

class FakeDatabaseClient {
  constructor({ applied = [], failOnSql = null, tableExists = applied.length > 0 } = {}) {
    this.applied = new Map(applied.map((migration) => [migration.filename, migration]))
    this.failOnSql = failOnSql
    this.tableExists = tableExists
    this.migrationSql = []
    this.queries = []
    this.transactionSnapshot = null
  }

  async query(sql, params = []) {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    this.queries.push({ sql: normalized, params })

    if (normalized.startsWith("SELECT to_regclass('public.schema_migrations')")) {
      return { rows: [{ table_name: this.tableExists ? 'schema_migrations' : null }] }
    }
    if (normalized.startsWith('CREATE TABLE IF NOT EXISTS public.schema_migrations')) {
      this.tableExists = true
      return { rows: [] }
    }
    if (
      normalized.startsWith('SELECT filename, sha256, applied_at')
      && normalized.includes('ORDER BY filename')
    ) {
      return {
        rows: [...this.applied.values()].sort((left, right) =>
          left.filename.localeCompare(right.filename)
        ),
      }
    }
    if (
      normalized.startsWith('SELECT filename, sha256, applied_at')
      && normalized.includes('WHERE filename = $1')
    ) {
      const migration = this.applied.get(params[0])
      return { rows: migration ? [migration] : [] }
    }
    if (normalized === 'BEGIN') {
      this.transactionSnapshot = new Map(this.applied)
      return { rows: [] }
    }
    if (normalized === 'COMMIT') {
      this.transactionSnapshot = null
      return { rows: [] }
    }
    if (normalized === 'ROLLBACK') {
      if (this.transactionSnapshot) this.applied = this.transactionSnapshot
      this.transactionSnapshot = null
      return { rows: [] }
    }
    if (normalized.startsWith('LOCK TABLE public.schema_migrations')) {
      return { rows: [] }
    }
    if (normalized.startsWith('INSERT INTO public.schema_migrations')) {
      this.applied.set(params[0], {
        filename: params[0],
        sha256: params[1],
        applied_at: new Date('2026-07-30T10:00:00.000Z'),
      })
      return { rows: [] }
    }

    this.migrationSql.push(normalized)
    if (this.failOnSql && normalized.includes(this.failOnSql)) {
      throw new Error('simulated SQL failure')
    }
    return { rows: [] }
  }
}

async function createMigrations(files) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'db-migrations-'))
  temporaryDirectories.push(directory)
  await Promise.all(
    Object.entries(files).map(([filename, sql]) =>
      writeFile(path.join(directory, filename), sql)
    )
  )
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

describe('database migration runner', () => {
  it('applies pending migration files in strict filename order', async () => {
    const migrationsDir = await createMigrations({
      '20260729_third.sql': 'BEGIN;\nSELECT 3 AS migration_three;\nCOMMIT;\n',
      '20260712_first.sql': 'BEGIN;\nSELECT 1 AS migration_one;\nCOMMIT;\n',
      '20260716_second.sql': 'BEGIN;\nSELECT 2 AS migration_two;\nCOMMIT;\n',
    })
    const client = new FakeDatabaseClient()

    const result = await runMigrations({ client, migrationsDir })

    expect(result.applied.map((migration) => migration.filename)).toEqual([
      '20260712_first.sql',
      '20260716_second.sql',
      '20260729_third.sql',
    ])
    expect(client.migrationSql).toEqual([
      'SELECT 1 AS migration_one;',
      'SELECT 2 AS migration_two;',
      'SELECT 3 AS migration_three;',
    ])
  })

  it('stops before running SQL when an applied file checksum changed', async () => {
    const sql = 'SELECT 1 AS changed_migration;'
    const filename = '20260712_changed.sql'
    const migrationsDir = await createMigrations({
      '20260711_pending.sql': 'SELECT 1 AS must_not_run;',
      [filename]: sql,
    })
    const client = new FakeDatabaseClient({
      applied: [{
        filename,
        sha256: '0'.repeat(64),
        applied_at: new Date('2026-07-12T10:00:00.000Z'),
      }],
    })

    await expect(runMigrations({ client, migrationsDir }))
      .rejects.toThrow(`Migration integrity error for ${filename}`)
    expect(client.migrationSql).toEqual([])
  })

  it('does not apply an already recorded migration again', async () => {
    const sql = 'SELECT 1 AS already_applied;'
    const filename = '20260712_applied.sql'
    const migrationsDir = await createMigrations({ [filename]: sql })
    const client = new FakeDatabaseClient({
      applied: [{
        filename,
        sha256: sha256(Buffer.from(sql)),
        applied_at: new Date('2026-07-12T10:00:00.000Z'),
      }],
    })

    const result = await runMigrations({ client, migrationsDir })

    expect(result.applied).toEqual([])
    expect(result.pending).toEqual([])
    expect(result.skipped.map((migration) => migration.filename)).toEqual([filename])
    expect(client.migrationSql).toEqual([])
  })

  it('rolls back the migration and its tracking row when SQL fails', async () => {
    const filename = '20260712_failing.sql'
    const migrationsDir = await createMigrations({
      [filename]: 'SELECT 1;\nSELECT FAIL_ME;',
    })
    const client = new FakeDatabaseClient({ failOnSql: 'FAIL_ME' })

    await expect(runMigrations({ client, migrationsDir }))
      .rejects.toThrow(`Migration ${filename} failed`)
    expect(client.applied.has(filename)).toBe(false)
    expect(client.queries.some((query) => query.sql === 'ROLLBACK')).toBe(true)
  })

  it('reports migrations committed before a later migration fails', async () => {
    const migrationsDir = await createMigrations({
      '20260712_first.sql': 'SELECT 1 AS migration_one;',
      '20260716_failing.sql': 'SELECT FAIL_ME;',
    })
    const client = new FakeDatabaseClient({ failOnSql: 'FAIL_ME' })

    let failure
    try {
      await runMigrations({ client, migrationsDir })
    } catch (error) {
      failure = error
    }

    expect(failure?.message).toContain('20260716_failing.sql')
    expect(failure?.migrationResult.applied.map((migration) => migration.filename)).toEqual([
      '20260712_first.sql',
    ])
    expect(client.applied.has('20260712_first.sql')).toBe(true)
    expect(client.applied.has('20260716_failing.sql')).toBe(false)
  })

  it('keeps status and dry-run read-only when the tracking table is absent', async () => {
    const migrationsDir = await createMigrations({
      '20260712_pending.sql': 'SELECT 1;',
    })
    const client = new FakeDatabaseClient()

    const status = await getMigrationStatus({ client, migrationsDir })
    const dryRun = await runMigrations({ client, migrationsDir, dryRun: true })

    expect(status.migrations[0].status).toBe('pending')
    expect(dryRun.pending).toHaveLength(1)
    expect(client.tableExists).toBe(false)
    expect(client.migrationSql).toEqual([])
  })

  it('baselines an existing migration without executing its SQL', async () => {
    const filename = '20260712_manually_applied.sql'
    const sql = 'SELECT should_not_execute;'
    const migrationsDir = await createMigrations({ [filename]: sql })
    const client = new FakeDatabaseClient()

    const result = await baselineMigration({ client, migrationsDir, filename })

    expect(result.alreadyApplied).toBe(false)
    expect(client.applied.get(filename)?.sha256).toBe(sha256(Buffer.from(sql)))
    expect(client.migrationSql).toEqual([])
  })
})
