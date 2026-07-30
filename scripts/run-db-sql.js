import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createDatabaseClient } from './lib/database.js'
import { stripTransactionWrapper } from './lib/db-migrations.js'

function parseArgs(values) {
  const args = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    const next = values[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      index += 1
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
if (!args.file) throw new Error('--file is required')

const filePath = path.resolve(args.file)
const sql = stripTransactionWrapper(readFileSync(filePath, 'utf8'))
const client = createDatabaseClient({ envFile: args.env })

await client.connect()
try {
  await client.query('BEGIN')
  await client.query(sql)
  await client.query(args.rollback ? 'ROLLBACK' : 'COMMIT')
  console.log(JSON.stringify({
    ok: true,
    file: path.relative(process.cwd(), filePath),
    mode: args.rollback ? 'validated_and_rolled_back' : 'applied',
  }))
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  throw error
} finally {
  await client.end()
}
