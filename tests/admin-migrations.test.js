import { afterEach, describe, expect, it } from 'vitest'
import { safeMigrationError } from '../src/lib/adminMigrations.js'

const originalDatabaseUrl = process.env.DATABASE_URL
const originalPostgresUrl = process.env.POSTGRES_URL

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl

  if (originalPostgresUrl === undefined) delete process.env.POSTGRES_URL
  else process.env.POSTGRES_URL = originalPostgresUrl
})

describe('admin migration error output', () => {
  it('redacts configured and embedded PostgreSQL connection strings', () => {
    const databaseUrl = 'postgresql://operator:super-secret@example.com/app'
    process.env.DATABASE_URL = databaseUrl

    const message = safeMigrationError(
      new Error(`Connection failed for ${databaseUrl}; fallback postgres://user:pass@db.example/app`)
    )

    expect(message).not.toContain('super-secret')
    expect(message).not.toContain('user:pass')
    expect(message).toContain('postgresql://[redacted]')
  })
})
