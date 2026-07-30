import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  applyAdminMigrationsMock,
  baselineAdminMigrationMock,
  safeMigrationErrorMock,
} = vi.hoisted(() => ({
  applyAdminMigrationsMock: vi.fn(),
  baselineAdminMigrationMock: vi.fn(),
  safeMigrationErrorMock: vi.fn((error) => error.message),
}))

vi.mock('@/lib/adminMigrations', () => ({
  applyAdminMigrations: applyAdminMigrationsMock,
  baselineAdminMigration: baselineAdminMigrationMock,
  safeMigrationError: safeMigrationErrorMock,
}))

import * as applyRoute from '../src/app/admin/migrations/apply/route.js'
import * as baselineRoute from '../src/app/admin/migrations/baseline/route.js'

const ADMIN_ORIGIN = 'https://example.com'

function migration(filename) {
  return { filename, sha256: 'a'.repeat(64) }
}

function request(path, options = {}) {
  return new Request(`${ADMIN_ORIGIN}${path}`, {
    method: 'POST',
    headers: { origin: ADMIN_ORIGIN },
    ...options,
  })
}

describe('admin migration routes', () => {
  beforeEach(() => {
    applyAdminMigrationsMock.mockReset()
    baselineAdminMigrationMock.mockReset()
    safeMigrationErrorMock.mockClear()
  })

  it('applies migrations through POST and reports applied and skipped files', async () => {
    applyAdminMigrationsMock.mockResolvedValue({
      applied: [migration('20260729_data_room.sql')],
      skipped: [migration('20260712_content_inventory.sql')],
    })

    const response = await applyRoute.POST(request('/admin/migrations/apply'))
    const location = new URL(response.headers.get('location'))

    expect(response.status).toBe(303)
    expect(location.pathname).toBe('/admin/migrations')
    expect(JSON.parse(location.searchParams.get('applied'))).toEqual([
      '20260729_data_room.sql',
    ])
    expect(JSON.parse(location.searchParams.get('skipped'))).toEqual([
      '20260712_content_inventory.sql',
    ])
  })

  it('reports partial progress when a later migration fails', async () => {
    const error = new Error('Migration 20260729_data_room.sql failed')
    error.migrationResult = {
      applied: [migration('20260712_content_inventory.sql')],
      skipped: [],
    }
    applyAdminMigrationsMock.mockRejectedValue(error)

    const response = await applyRoute.POST(request('/admin/migrations/apply'))
    const location = new URL(response.headers.get('location'))

    expect(JSON.parse(location.searchParams.get('applied'))).toEqual([
      '20260712_content_inventory.sql',
    ])
    expect(location.searchParams.get('error')).toContain('20260729_data_room.sql')
  })

  it('baselines exactly one migration without a GET handler', async () => {
    baselineAdminMigrationMock.mockResolvedValue({
      migration: migration('20260712_content_inventory.sql'),
      alreadyApplied: false,
    })
    const body = new FormData()
    body.set('filename', '20260712_content_inventory.sql')

    const response = await baselineRoute.POST(
      request('/admin/migrations/baseline', { body })
    )
    const location = new URL(response.headers.get('location'))

    expect(response.status).toBe(303)
    expect(location.searchParams.get('baselined')).toBe(
      '20260712_content_inventory.sql'
    )
    expect(baselineAdminMigrationMock).toHaveBeenCalledWith(
      '20260712_content_inventory.sql'
    )
    expect(applyRoute.GET).toBeUndefined()
    expect(baselineRoute.GET).toBeUndefined()
  })

  it('blocks cross-origin apply requests before touching the database', async () => {
    const response = await applyRoute.POST(
      new Request(`${ADMIN_ORIGIN}/admin/migrations/apply`, {
        method: 'POST',
        headers: {
          origin: 'https://attacker.example',
          'sec-fetch-site': 'cross-site',
        },
      })
    )
    const location = new URL(response.headers.get('location'))

    expect(location.searchParams.get('error')).toBe(
      'Cross-origin admin request blocked'
    )
    expect(applyAdminMigrationsMock).not.toHaveBeenCalled()
  })
})
