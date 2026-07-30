import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createDatabaseClient } from './lib/database.js'
import {
  baselineMigration,
  getMigrationStatus,
  runMigrations,
} from '../src/lib/dbMigrations.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(projectRoot, 'db', 'migrations')

function parseArgs(values) {
  const flags = {}
  const positionals = []

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value.startsWith('--')) {
      positionals.push(value)
      continue
    }

    const key = value.slice(2)
    if (!['dry-run', 'env'].includes(key)) {
      throw new Error(`Unknown option: ${value}`)
    }

    if (key === 'dry-run') {
      flags[key] = true
      continue
    }

    const next = values[index + 1]
    if (!next || next.startsWith('--')) {
      throw new Error(`${value} requires a value`)
    }
    flags[key] = next
    index += 1
  }

  return { flags, positionals }
}

function printStatus(status) {
  for (const migration of status.migrations) {
    const label = migration.status === 'applied' ? 'APPLIED' : 'PENDING'
    const appliedAt = migration.appliedAt
      ? ` applied_at=${new Date(migration.appliedAt).toISOString()}`
      : ''
    console.log(`${label} ${migration.filename} sha256=${migration.sha256}${appliedAt}`)
  }
  if (status.migrations.length === 0) console.log('No migration files found.')
}

async function main() {
  const [command, ...values] = process.argv.slice(2)
  if (!['up', 'status', 'baseline'].includes(command)) {
    throw new Error('Usage: db-migrate.js <up|status|baseline> [filename] [--dry-run] [--env <file>]')
  }

  const { flags, positionals } = parseArgs(values)
  if (flags['dry-run'] && command !== 'up') {
    throw new Error('--dry-run is only valid with the up command')
  }
  if (command === 'status' && positionals.length > 0) {
    throw new Error('status does not accept a filename')
  }
  if (command === 'baseline' && positionals.length !== 1) {
    throw new Error('baseline requires exactly one migration filename')
  }
  if (command === 'up' && positionals.length > 0) {
    throw new Error('up does not accept a filename')
  }

  const client = createDatabaseClient({ envFile: flags.env })
  await client.connect()
  try {
    if (command === 'status') {
      const status = await getMigrationStatus({ client, migrationsDir })
      printStatus(status)
      return
    }

    if (command === 'baseline') {
      const result = await baselineMigration({
        client,
        migrationsDir,
        filename: positionals[0],
      })
      const action = result.alreadyApplied ? 'ALREADY_APPLIED' : 'BASELINED'
      console.log(
        `${action} ${result.migration.filename} sha256=${result.migration.sha256} `
        + '(migration SQL was not executed)'
      )
      return
    }

    const result = await runMigrations({
      client,
      migrationsDir,
      dryRun: Boolean(flags['dry-run']),
    })
    if (result.dryRun) {
      printStatus(result)
      console.log(`DRY_RUN pending=${result.pending.length}; no database changes were made.`)
      return
    }

    for (const migration of result.applied) {
      console.log(`APPLIED ${migration.filename} sha256=${migration.sha256}`)
    }
    console.log(`MIGRATE_OK applied=${result.applied.length} pending_before_run=${result.pending.length}`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(`Migration runner error: ${error.message}`)
  process.exitCode = 1
})
