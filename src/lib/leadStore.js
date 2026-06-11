import { query, isDatabaseConfigured } from '@/lib/db'
import { DEFAULT_TENANT_CONFIG } from '@/lib/tenantConfig'

export { isDatabaseConfigured }

const LEAD_SELECT_COLUMNS = `
  lead_id,
  tenant_id,
  project_id,
  created_at,
  received_at,
  status,
  segment,
  priority,
  first_name,
  last_name,
  name,
  email,
  phone,
  wohnung_label,
  purchase_timeline_label,
  equity_bucket_label,
  financing_status_label,
  underqualified,
  next_action,
  next_best_action,
  followup_due_at,
  assigned_to,
  handoff_required,
  handoff_reason,
  qualification_reason,
  lead_summary,
  utm_source,
  utm_medium,
  utm_campaign
`

const LEAD_DETAIL_COLUMNS = `
  ${LEAD_SELECT_COLUMNS},
  consent_contact,
  consent_data_processing,
  raw
`

function normalizeLimit(limit) {
  const parsed = Number.parseInt(limit, 10)
  if (!Number.isFinite(parsed)) return 100
  return Math.min(Math.max(parsed, 1), 250)
}

export async function ensureDefaultTenantProject() {
  if (!isDatabaseConfigured()) {
    return { saved: false, reason: 'database_not_configured' }
  }

  await query(
    `
      INSERT INTO tenants (id, name)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          updated_at = now()
    `,
    [DEFAULT_TENANT_CONFIG.tenantId, DEFAULT_TENANT_CONFIG.brand.name]
  )

  await query(
    `
      INSERT INTO projects (id, tenant_id, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          tenant_id = EXCLUDED.tenant_id,
          updated_at = now()
    `,
    [
      DEFAULT_TENANT_CONFIG.projectId,
      DEFAULT_TENANT_CONFIG.tenantId,
      'Leipzig owner apartments',
    ]
  )

  return { saved: true }
}

export async function saveLeadRecord(leadRecord) {
  if (!isDatabaseConfigured()) {
    return { saved: false, reason: 'database_not_configured' }
  }

  await ensureDefaultTenantProject()

  await query(
    `
      INSERT INTO leads (
        lead_id,
        tenant_id,
        project_id,
        created_at,
        status,
        segment,
        priority,
        first_name,
        last_name,
        name,
        email,
        phone,
        wohnung,
        wohnung_label,
        purchase_timeline,
        purchase_timeline_label,
        equity_bucket,
        equity_bucket_label,
        financing_status,
        financing_status_label,
        score,
        original_score,
        underqualified,
        next_action,
        next_best_action,
        followup_due_at,
        assigned_to,
        handoff_required,
        handoff_reason,
        qualification_reason,
        lead_summary,
        consent_contact,
        consent_data_processing,
        consent_timestamp,
        consent_ip,
        consent_user_agent,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        raw
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42
      )
      ON CONFLICT (lead_id) DO UPDATE
      SET status = EXCLUDED.status,
          segment = EXCLUDED.segment,
          priority = EXCLUDED.priority,
          next_action = EXCLUDED.next_action,
          next_best_action = EXCLUDED.next_best_action,
          followup_due_at = EXCLUDED.followup_due_at,
          assigned_to = EXCLUDED.assigned_to,
          handoff_required = EXCLUDED.handoff_required,
          handoff_reason = EXCLUDED.handoff_reason,
          qualification_reason = EXCLUDED.qualification_reason,
          lead_summary = EXCLUDED.lead_summary,
          raw = EXCLUDED.raw,
          updated_at = now()
    `,
    [
      leadRecord.lead_id,
      leadRecord.tenant_id,
      leadRecord.project_id,
      leadRecord.created_at,
      leadRecord.status,
      leadRecord.segment,
      leadRecord.priority,
      leadRecord.first_name,
      leadRecord.last_name,
      leadRecord.name,
      leadRecord.email,
      leadRecord.phone,
      leadRecord.wohnung,
      leadRecord.wohnung_label,
      leadRecord.purchase_timeline,
      leadRecord.purchase_timeline_label,
      leadRecord.equity_bucket,
      leadRecord.equity_bucket_label,
      leadRecord.financing_status,
      leadRecord.financing_status_label,
      leadRecord.score,
      leadRecord.original_score,
      leadRecord.underqualified,
      leadRecord.next_action,
      leadRecord.next_best_action,
      leadRecord.followup_due_at,
      leadRecord.assigned_to,
      leadRecord.handoff_required,
      leadRecord.handoff_reason,
      leadRecord.qualification_reason,
      leadRecord.lead_summary,
      leadRecord.consent_contact,
      leadRecord.consent_data_processing,
      leadRecord.consent_timestamp,
      leadRecord.consent_ip,
      leadRecord.consent_user_agent,
      leadRecord.utm_source,
      leadRecord.utm_medium,
      leadRecord.utm_campaign,
      leadRecord.utm_content,
      leadRecord.utm_term,
      JSON.stringify(leadRecord.raw || {}),
    ]
  )

  await query(
    `
      INSERT INTO lead_events (lead_id, tenant_id, type, payload)
      VALUES ($1, $2, $3, $4)
    `,
    [
      leadRecord.lead_id,
      leadRecord.tenant_id,
      'lead_received',
      JSON.stringify({
        segment: leadRecord.segment,
        status: leadRecord.status,
        priority: leadRecord.priority,
        next_action: leadRecord.next_action,
        duplicate: Boolean(leadRecord.duplicate),
        duplicate_of_lead_id: leadRecord.duplicate_of_lead_id || '',
      }),
    ]
  )

  if (leadRecord.email_subject && leadRecord.email_draft) {
    await query(
      `
        INSERT INTO email_drafts (
          lead_id,
          tenant_id,
          provider,
          model,
          subject,
          body,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        leadRecord.lead_id,
        leadRecord.tenant_id,
        leadRecord.email_generation_provider || 'template',
        leadRecord.email_generation_model || '',
        leadRecord.email_subject,
        leadRecord.email_draft,
        leadRecord.email_generation_status || 'draft_created',
      ]
    )
  }

  return { saved: true, lead_id: leadRecord.lead_id }
}

export async function recordLeadEvent({ leadId, tenantId, type, payload = {} }) {
  if (!isDatabaseConfigured()) {
    return { saved: false, reason: 'database_not_configured' }
  }

  await query(
    `
      INSERT INTO lead_events (lead_id, tenant_id, type, payload)
      VALUES ($1, $2, $3, $4)
    `,
    [leadId, tenantId, type, JSON.stringify(payload)]
  )

  return { saved: true }
}

export async function findRecentLeadByEmailTenant({ email, tenantId, withinHours = 24 }) {
  if (!isDatabaseConfigured()) {
    return null
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail || !tenantId) {
    return null
  }

  const hours = Math.min(Math.max(Number.parseInt(withinHours, 10) || 24, 1), 168)
  const result = await query(
    `
      SELECT lead_id, created_at
      FROM leads
      WHERE tenant_id = $1
        AND lower(email) = $2
        AND created_at >= now() - ($3::int * interval '1 hour')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [tenantId, normalizedEmail, hours]
  )

  return result.rows[0] || null
}

export async function findLatestLeadByEmail(email) {
  if (!isDatabaseConfigured()) {
    return null
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    return null
  }

  const result = await query(
    `
      SELECT ${LEAD_DETAIL_COLUMNS}
      FROM leads
      WHERE lower(email) = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [normalizedEmail]
  )

  return result.rows[0] || null
}

export async function updateLeadStatus({ leadId, status }) {
  if (!isDatabaseConfigured()) {
    return { saved: false, reason: 'database_not_configured' }
  }

  if (!leadId || !status) {
    return { saved: false, reason: 'missing_input' }
  }

  await query(
    `
      UPDATE leads
      SET status = $2,
          updated_at = now()
      WHERE lead_id = $1
    `,
    [leadId, status]
  )

  return { saved: true }
}

export async function listLeads({ limit = 100 } = {}) {
  if (!isDatabaseConfigured()) {
    return { configured: false, leads: [] }
  }

  const result = await query(
    `
      SELECT ${LEAD_SELECT_COLUMNS}
      FROM leads
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [normalizeLimit(limit)]
  )

  return { configured: true, leads: result.rows }
}

export async function getLeadDetail(leadId) {
  if (!isDatabaseConfigured()) {
    return { configured: false, lead: null, drafts: [], replies: [] }
  }

  const leadResult = await query(
    `
      SELECT ${LEAD_DETAIL_COLUMNS}
      FROM leads
      WHERE lead_id = $1
      LIMIT 1
    `,
    [leadId]
  )

  if (leadResult.rows.length === 0) {
    return { configured: true, lead: null, drafts: [], replies: [] }
  }

  const draftsResult = await query(
    `
      SELECT id, provider, model, subject, body, status, created_at, updated_at
      FROM email_drafts
      WHERE lead_id = $1
      ORDER BY created_at DESC
    `,
    [leadId]
  )

  const repliesResult = await query(
    `
      SELECT id, payload, created_at
      FROM lead_events
      WHERE lead_id = $1
        AND type = 'reply_received'
      ORDER BY created_at DESC
    `,
    [leadId]
  )

  return {
    configured: true,
    lead: leadResult.rows[0],
    drafts: draftsResult.rows,
    replies: repliesResult.rows,
  }
}

export async function getEmailDraftForLead({ leadId, draftId }) {
  if (!isDatabaseConfigured()) {
    return null
  }

  const result = await query(
    `
      SELECT id, lead_id, tenant_id, provider, model, subject, body, status
      FROM email_drafts
      WHERE lead_id = $1
        AND id = $2
      LIMIT 1
    `,
    [leadId, draftId]
  )

  return result.rows[0] || null
}

export async function markEmailDraftSent({ draftId, subject, body }) {
  if (!isDatabaseConfigured()) {
    return { saved: false, reason: 'database_not_configured' }
  }

  await query(
    `
      UPDATE email_drafts
      SET subject = $2,
          body = $3,
          status = 'sent',
          updated_at = now()
      WHERE id = $1
    `,
    [draftId, subject, body]
  )

  return { saved: true }
}
