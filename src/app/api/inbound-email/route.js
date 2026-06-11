import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import {
  extractEmailAddress,
  extractReplyText,
  fetchReceivedEmail,
} from '@/lib/inboundEmail'
import {
  findLatestLeadByEmail,
  recordLeadEvent,
  updateLeadStatus,
} from '@/lib/leadStore'
import { sendTelegramLeadReplyNotification } from '@/lib/telegram'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function verifyResendWebhook(rawBody, headers) {
  const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET || ''
  if (!webhookSecret) {
    throw new Error('missing_webhook_secret')
  }

  const webhook = new Webhook(webhookSecret)
  return webhook.verify(rawBody, {
    'svix-id': headers.get('svix-id') || '',
    'svix-timestamp': headers.get('svix-timestamp') || '',
    'svix-signature': headers.get('svix-signature') || '',
  })
}

export async function POST(request) {
  const rawBody = await request.text()

  let event
  try {
    event = verifyResendWebhook(rawBody, request.headers)
  } catch (error) {
    console.warn('Rejected inbound email webhook', {
      reason: error?.message || 'invalid_signature',
    })
    return NextResponse.json(
      { success: false, error: 'invalid_signature' },
      { status: 401 }
    )
  }

  if (event?.type !== 'email.received') {
    return NextResponse.json({ success: true, ignored: true })
  }

  const emailId = event?.data?.email_id || event?.data?.id || ''
  if (!emailId) {
    return NextResponse.json({ success: true, ignored: true, reason: 'missing_email_id' })
  }

  let receivedEmail
  try {
    receivedEmail = await fetchReceivedEmail(emailId)
  } catch (error) {
    console.error('Inbound email body fetch failed', {
      email_id: emailId,
      error: error?.message || 'unknown_error',
    })
    return NextResponse.json(
      { success: false, error: 'received_email_fetch_failed' },
      { status: 500 }
    )
  }

  const fromEmail = extractEmailAddress(receivedEmail?.from || event?.data?.from)
  if (!fromEmail) {
    return NextResponse.json({ success: true, ignored: true, reason: 'missing_from_email' })
  }

  const lead = await findLatestLeadByEmail(fromEmail)
  if (!lead) {
    return NextResponse.json({ success: true, matched: false })
  }

  const replyText = extractReplyText(receivedEmail)
  const receivedAt = receivedEmail?.created_at
    || event?.data?.created_at
    || event?.created_at
    || new Date().toISOString()

  await recordLeadEvent({
    leadId: lead.lead_id,
    tenantId: lead.tenant_id,
    type: 'reply_received',
    payload: {
      text: replyText,
      from: fromEmail,
      from_raw: receivedEmail?.from || event?.data?.from || '',
      to: receivedEmail?.to || event?.data?.to || [],
      cc: receivedEmail?.cc || event?.data?.cc || [],
      subject: receivedEmail?.subject || event?.data?.subject || '',
      received_email_id: emailId,
      message_id: receivedEmail?.message_id || event?.data?.message_id || '',
      received_at: receivedAt,
    },
  })

  await updateLeadStatus({ leadId: lead.lead_id, status: 'replied' })
  await sendTelegramLeadReplyNotification({ lead, replyText })

  console.log('Inbound lead reply stored', {
    lead_id: lead.lead_id,
    segment: lead.segment,
  })

  return NextResponse.json({
    success: true,
    matched: true,
    lead_id: lead.lead_id,
  })
}
