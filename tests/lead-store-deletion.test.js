import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { isDatabaseConfiguredMock, queryMock } = vi.hoisted(() => ({
  isDatabaseConfiguredMock: vi.fn(() => true),
  queryMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  isDatabaseConfigured: isDatabaseConfiguredMock,
  query: queryMock,
}))

import { deleteLeadRecord } from '../src/lib/leadStore.js'

const LEAD_ID = '10000000-0000-4000-8000-000000000001'

describe('deleteLeadRecord', () => {
  let records

  beforeEach(() => {
    records = {
      leads: [{ lead_id: LEAD_ID }],
      leadEvents: [{ lead_id: LEAD_ID, type: 'lead_received' }],
      leadProperties: [{ lead_id: LEAD_ID, property_id: 'property-1' }],
      emailDrafts: [{ lead_id: LEAD_ID, subject: 'Draft' }],
    }

    isDatabaseConfiguredMock.mockReturnValue(true)
    queryMock.mockReset()
    queryMock.mockImplementation(async (text, params) => {
      if (!text.includes('DELETE FROM leads')) {
        throw new Error(`Unexpected query: ${text}`)
      }

      const [leadId] = params
      const lead = records.leads.find((entry) => entry.lead_id === leadId)
      if (!lead) return { rows: [], rowCount: 0 }

      records.leads = records.leads.filter((entry) => entry.lead_id !== leadId)
      records.leadEvents = records.leadEvents.filter((entry) => entry.lead_id !== leadId)
      records.leadProperties = records.leadProperties.filter((entry) => entry.lead_id !== leadId)
      records.emailDrafts = records.emailDrafts.filter((entry) => entry.lead_id !== leadId)

      return { rows: [{ lead_id: leadId }], rowCount: 1 }
    })
  })

  it('deletes a lead and all records covered by database cascades', async () => {
    await expect(deleteLeadRecord(LEAD_ID)).resolves.toEqual({
      deleted: true,
      lead_id: LEAD_ID,
    })

    expect(records.leads).toEqual([])
    expect(records.leadEvents).toEqual([])
    expect(records.leadProperties).toEqual([])
    expect(records.emailDrafts).toEqual([])
  })

  it('returns not_found when the lead does not exist', async () => {
    await expect(
      deleteLeadRecord('20000000-0000-4000-8000-000000000002')
    ).resolves.toEqual({
      deleted: false,
      reason: 'not_found',
    })
  })

  it('backs every related deletion with ON DELETE CASCADE constraints', () => {
    const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
    const migration = readFileSync(
      new URL('../db/migrations/20260712_content_inventory.sql', import.meta.url),
      'utf8'
    )

    const leadEvents = schema.match(
      /CREATE TABLE IF NOT EXISTS lead_events \([\s\S]*?\n\);/
    )?.[0]
    const emailDrafts = schema.match(
      /CREATE TABLE IF NOT EXISTS email_drafts \([\s\S]*?\n\);/
    )?.[0]
    const leadProperties = schema.match(
      /CREATE TABLE IF NOT EXISTS lead_properties \([\s\S]*?\n\);/
    )?.[0]
    const migratedLeadProperties = migration.match(
      /CREATE TABLE IF NOT EXISTS lead_properties \([\s\S]*?\n\);/
    )?.[0]

    expect(leadEvents).toMatch(/REFERENCES leads\(lead_id\) ON DELETE CASCADE/)
    expect(emailDrafts).toMatch(/REFERENCES leads\(lead_id\) ON DELETE CASCADE/)
    expect(leadProperties).toMatch(
      /REFERENCES leads\(lead_id, tenant_id\) ON DELETE CASCADE/
    )
    expect(migratedLeadProperties).toMatch(
      /REFERENCES leads\(lead_id, tenant_id\) ON DELETE CASCADE/
    )
  })
})
