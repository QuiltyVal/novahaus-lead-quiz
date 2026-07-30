import path from 'node:path'
import process from 'node:process'
import dotenv from 'dotenv'
import pg from 'pg'

export function createDatabaseClient({ envFile } = {}) {
  if (envFile) dotenv.config({ path: path.resolve(envFile), override: true })
  else dotenv.config({ path: path.resolve('.env.local') })

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) throw new Error('DATABASE_URL is not configured')

  return new pg.Client({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString)
      ? undefined
      : { rejectUnauthorized: false },
  })
}
