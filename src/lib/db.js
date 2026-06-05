import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''

function shouldUseSsl(connectionString) {
  if (!connectionString) return false
  return !/localhost|127\.0\.0\.1/.test(connectionString)
}

function getPool() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }

  if (!globalThis.__novahausPgPool) {
    globalThis.__novahausPgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
      max: 4,
    })
  }

  return globalThis.__novahausPgPool
}

export function isDatabaseConfigured() {
  return Boolean(DATABASE_URL)
}

export async function query(text, params = []) {
  return getPool().query(text, params)
}

