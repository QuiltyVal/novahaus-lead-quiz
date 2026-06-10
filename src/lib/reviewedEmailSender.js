import nodemailer from 'nodemailer'
import { DEFAULT_TENANT_CONFIG } from '@/lib/tenantConfig'

const BRAND_NAME = DEFAULT_TENANT_CONFIG.brand.name
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const LEAD_EMAIL_PROVIDER = (process.env.LEAD_EMAIL_PROVIDER || '').toLowerCase()
const LEAD_EMAIL_FROM = process.env.LEAD_EMAIL_FROM || ''
const LEAD_EMAIL_REPLY_TO = process.env.LEAD_EMAIL_REPLY_TO || ''
const LEAD_EMAIL_BCC = process.env.LEAD_EMAIL_BCC || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const DEMO_LEAD_TARGET_EMAIL = process.env.DEMO_LEAD_TARGET_EMAIL || ''

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textToHtml(text) {
  return escapeHtml(text)
    .split('\n')
    .map((line) => line || '&nbsp;')
    .join('<br>')
}

function resolveBcc(to) {
  const bcc = LEAD_EMAIL_BCC.trim()
  if (!bcc) return undefined
  if (bcc.toLowerCase() === String(to || '').trim().toLowerCase()) return undefined
  return bcc
}

function resolveProvider() {
  if (LEAD_EMAIL_PROVIDER) return LEAD_EMAIL_PROVIDER
  if (RESEND_API_KEY) return 'resend'
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) return 'smtp'
  return 'none'
}

function resolveRecipient(lead) {
  const email = String(lead.email || '').trim()
  const raw = lead.raw && typeof lead.raw === 'object' ? lead.raw : {}
  const isDemoLead = Boolean(raw.demo_mode)
  const isReservedExampleAddress = /@example\.(com|org|net)$/i.test(email)

  if ((isDemoLead || isReservedExampleAddress) && DEMO_LEAD_TARGET_EMAIL) {
    return {
      to: DEMO_LEAD_TARGET_EMAIL,
      originalTo: email,
      redirected: true,
    }
  }

  if (isDemoLead || isReservedExampleAddress) {
    return {
      to: '',
      originalTo: email,
      redirected: false,
      skipReason: 'demo_or_example_email',
    }
  }

  return {
    to: email,
    originalTo: email,
    redirected: false,
  }
}

function buildHtml({ subject, body }) {
  const preheader = `${BRAND_NAME}: ${subject}`
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <main style="font-family: Arial, Helvetica, sans-serif; color: #18212b; line-height: 1.55; max-width: 640px;">
      <div style="white-space: normal; font-size: 16px;">
        ${textToHtml(body)}
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e0d8; margin: 28px 0;">
      <p style="font-size: 13px; color: #66707d; margin: 0;">
        Diese Nachricht wurde nach manueller Prüfung über die NovaHaus Lead Inbox gesendet.
      </p>
    </main>
  `
}

async function sendViaResend({ to, subject, body, html, originalTo }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const payload = {
    from: LEAD_EMAIL_FROM,
    to,
    subject,
    text: body,
    html,
  }

  if (LEAD_EMAIL_REPLY_TO) payload.reply_to = LEAD_EMAIL_REPLY_TO
  const bcc = resolveBcc(to)
  if (bcc) payload.bcc = bcc
  if (originalTo && originalTo !== to) {
    payload.headers = {
      'X-NovaHaus-Original-To': originalTo,
    }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const providerMessage = data?.message ? `: ${String(data.message).slice(0, 160)}` : ''
    throw new Error(`Resend failed with status ${response.status}${providerMessage}`)
  }

  return data?.id || ''
}

async function sendViaSmtp({ to, subject, body, html }) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are not configured')
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  const result = await transporter.sendMail({
    from: LEAD_EMAIL_FROM || `"${BRAND_NAME}" <${SMTP_USER}>`,
    to,
    bcc: resolveBcc(to),
    replyTo: LEAD_EMAIL_REPLY_TO || undefined,
    subject,
    text: body,
    html,
  })

  return result.messageId || ''
}

export async function sendReviewedDraftEmail({ lead, subject, body }) {
  if (!lead?.consent_contact) {
    return { sent: false, reason: 'missing_contact_consent' }
  }

  if (!LEAD_EMAIL_FROM && !SMTP_USER) {
    return { sent: false, reason: 'from_not_configured' }
  }

  const recipient = resolveRecipient(lead)
  if (!recipient.to) {
    return { sent: false, reason: recipient.skipReason || 'recipient_not_configured' }
  }

  const provider = resolveProvider()
  if (!['resend', 'smtp'].includes(provider)) {
    return { sent: false, reason: 'provider_not_configured' }
  }

  const html = buildHtml({ subject, body })
  const messageId = provider === 'resend'
    ? await sendViaResend({ to: recipient.to, originalTo: recipient.originalTo, subject, body, html })
    : await sendViaSmtp({ to: recipient.to, subject, body, html })

  return {
    sent: true,
    provider,
    message_id: messageId,
    to: recipient.to,
    redirected: recipient.redirected,
  }
}
