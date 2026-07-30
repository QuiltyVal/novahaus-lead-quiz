import { adminRedirect, assertSameOrigin } from '@/lib/adminRequest'
import {
  applyAdminMigrations,
  safeMigrationError,
} from '@/lib/adminMigrations'

export const runtime = 'nodejs'

function migrationFilenames(migrations = []) {
  return JSON.stringify(migrations.map((migration) => migration.filename))
}

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const result = await applyAdminMigrations()
    return adminRedirect(request, '/admin/migrations', {
      operation: 'apply',
      applied: migrationFilenames(result.applied),
      skipped: migrationFilenames(result.skipped),
    })
  } catch (error) {
    const partial = error?.migrationResult || {}
    const message = safeMigrationError(error)
    console.error(
      `Admin migration apply failed: ${error?.code || error?.name || 'unknown'}: ${message}`
    )
    return adminRedirect(request, '/admin/migrations', {
      operation: 'apply',
      applied: migrationFilenames(partial.applied),
      skipped: migrationFilenames(partial.skipped),
      error: message,
    })
  }
}
