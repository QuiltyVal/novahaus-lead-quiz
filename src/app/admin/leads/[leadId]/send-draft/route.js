import { NextResponse } from 'next/server'
import {
  getEmailDraftForLead,
  getLeadDetail,
  markEmailDraftSent,
  recordLeadEvent,
} from '@/lib/leadStore'
import { sendReviewedDraftEmail } from '@/lib/reviewedEmailSender'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function redirectToLead(request, leadId, params = {}) {
  const url = new URL(`/admin/leads/${leadId}`, request.url)
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })
  return NextResponse.redirect(url, { status: 303 })
}

function normalizeDraftText(value) {
  return String(value || '').trim()
}

export async function POST(request, { params }) {
  const leadId = params.leadId

  try {
    const formData = await request.formData()
    const draftId = normalizeDraftText(formData.get('draft_id'))
    const subject = normalizeDraftText(formData.get('subject'))
    const body = normalizeDraftText(formData.get('body'))

    if (!draftId || !subject || !body) {
      return redirectToLead(request, leadId, { error: 'missing_draft_fields' })
    }

    const [leadResult, draft] = await Promise.all([
      getLeadDetail(leadId),
      getEmailDraftForLead({ leadId, draftId }),
    ])

    if (!leadResult.configured || !leadResult.lead || !draft) {
      return redirectToLead(request, leadId, { error: 'draft_not_found' })
    }

    const delivery = await sendReviewedDraftEmail({
      lead: leadResult.lead,
      subject,
      body,
    })

    if (!delivery.sent) {
      await recordLeadEvent({
        leadId,
        tenantId: leadResult.lead.tenant_id,
        type: 'email_send_skipped',
        payload: {
          draft_id: draftId,
          reason: delivery.reason,
        },
      })

      return redirectToLead(request, leadId, { error: delivery.reason })
    }

    await markEmailDraftSent({ draftId, subject, body })
    await recordLeadEvent({
      leadId,
      tenantId: leadResult.lead.tenant_id,
      type: 'reviewed_email_sent',
      payload: {
        draft_id: draftId,
        provider: delivery.provider,
        message_id: delivery.message_id,
        redirected: delivery.redirected,
      },
    })

    return redirectToLead(request, leadId, { sent: '1' })
  } catch (error) {
    console.error(`Reviewed draft send failed: lead_id=${leadId} message=${error.message}`)
    return redirectToLead(request, leadId, { error: 'send_failed' })
  }
}
