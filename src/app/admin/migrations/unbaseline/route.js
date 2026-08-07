import { adminRedirect, assertSameOrigin } from '@/lib/adminRequest'
import {
  safeMigrationError,
  unbaselineAdminMigration,
} from '@/lib/adminMigrations'

export const runtime = 'nodejs'

const MIGRATION_FILENAME_PATTERN = /^[A-Za-z0-9._-]+\.sql$/

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const formData = await request.formData()
    const filename = String(formData.get('filename') || '').trim()
    if (!MIGRATION_FILENAME_PATTERN.test(filename)) {
      throw new Error('Ungültiger Migrationsdateiname.')
    }

    const result = await unbaselineAdminMigration(filename)
    return adminRedirect(request, '/admin/migrations', {
      operation: 'unbaseline',
      unbaselined: result.alreadyPending ? undefined : filename,
      skipped: result.alreadyPending ? JSON.stringify([filename]) : undefined,
    })
  } catch (error) {
    const message = safeMigrationError(error)
    console.error(
      `Admin migration unbaseline failed: ${error?.code || error?.name || 'unknown'}: ${message}`
    )
    return adminRedirect(request, '/admin/migrations', {
      operation: 'unbaseline',
      error: message,
    })
  }
}
