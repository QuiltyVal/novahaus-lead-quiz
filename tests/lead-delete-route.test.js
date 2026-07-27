import { beforeEach, describe, expect, it, vi } from 'vitest'

const { deleteLeadRecordMock } = vi.hoisted(() => ({
  deleteLeadRecordMock: vi.fn(),
}))

vi.mock('@/lib/leadStore', () => ({
  deleteLeadRecord: deleteLeadRecordMock,
}))

import * as deleteRoute from '../src/app/admin/leads/[leadId]/delete/route.js'

const LEAD_ID = '10000000-0000-4000-8000-000000000001'
const ROUTE_URL = `https://example.com/admin/leads/${LEAD_ID}/delete`

describe('lead deletion route', () => {
  beforeEach(() => {
    deleteLeadRecordMock.mockReset()
  })

  it('redirects to the lead inbox after deletion', async () => {
    deleteLeadRecordMock.mockResolvedValue({ deleted: true, lead_id: LEAD_ID })

    const response = await deleteRoute.POST(
      new Request(ROUTE_URL, { method: 'POST' }),
      { params: { leadId: LEAD_ID } }
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://example.com/admin/leads')
    expect(deleteLeadRecordMock).toHaveBeenCalledWith(LEAD_ID)
  })

  it('returns 404 for a missing lead_id', async () => {
    deleteLeadRecordMock.mockResolvedValue({ deleted: false, reason: 'not_found' })

    const response = await deleteRoute.POST(
      new Request(ROUTE_URL, { method: 'POST' }),
      { params: { leadId: LEAD_ID } }
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'lead_not_found' })
  })

  it('does not expose GET and therefore cannot delete on navigation', () => {
    expect(deleteRoute.GET).toBeUndefined()
    expect(deleteLeadRecordMock).not.toHaveBeenCalled()
  })
})
