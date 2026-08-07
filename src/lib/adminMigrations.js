import path from 'node:path'
import {
  baselineMigration,
  getMigrationStatus,
  runMigrations,
  unbaselineMigration,
} from '@/lib/dbMigrations'
import { withDatabaseClient } from '@/lib/db'

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations')
const POSTGRES_URL_PATTERN = /postgres(?:ql)?:\/\/[^\s"'<>]+/gi

function withMigrationClient(callback) {
  return withDatabaseClient((client) => callback({
    client,
    migrationsDir: MIGRATIONS_DIR,
  }))
}

export function getAdminMigrationStatus() {
  return withMigrationClient(getMigrationStatus)
}

export function applyAdminMigrations() {
  return withMigrationClient(runMigrations)
}

export function baselineAdminMigration(filename) {
  return withMigrationClient(({ client, migrationsDir }) =>
    baselineMigration({ client, migrationsDir, filename })
  )
}

export function safeMigrationError(error) {
  let message = String(error?.message || 'Unbekannter Migrationsfehler.')

  for (const secret of [process.env.DATABASE_URL, process.env.POSTGRES_URL]) {
    if (secret) message = message.split(secret).join('[redacted]')
  }

  return message
    .replace(POSTGRES_URL_PATTERN, 'postgresql://[redacted]')
    .slice(0, 1200)
}

export function unbaselineAdminMigration(filename) {
  return withMigrationClient(({ client, migrationsDir }) =>
    unbaselineMigration({ client, migrationsDir, filename })
  )
}
