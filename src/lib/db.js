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

export async function withDatabaseClient(callback) {
  const client = await getPool().connect()

  try {
    return await callback(client)
  } finally {
    client.release()
  }
}

export async function withTransaction(callback) {
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
