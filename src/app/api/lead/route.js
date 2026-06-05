import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { randomUUID } from 'crypto'
import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import { DEFAULT_TENANT_CONFIG, optionMap } from '@/lib/tenantConfig'

/* ============================================
   CONFIG — from env variables
   ============================================ */
// Google Sheets (support both naming conventions)
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_ID || ''
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || process.env.GOOGLE_SHEET_TAB_NAME || 'Leads'

// Email notifications (optional)
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || '' // where to send lead notifications

// n8n Lead Collector (primary destination for the AI Lead-to-Call MVP)
const N8N_LEAD_WEBHOOK_URL = process.env.N8N_LEAD_WEBHOOK_URL || ''
const N8N_LEAD_WEBHOOK_SECRET = process.env.N8N_LEAD_WEBHOOK_SECRET || ''

// AI email draft generation (optional; template fallback stays active)
const AI_EMAIL_PROVIDER = (process.env.AI_EMAIL_PROVIDER || 'template').toLowerCase()
const AI_EMAIL_MODEL = process.env.AI_EMAIL_MODEL || 'openrouter/free'
const AI_EMAIL_TIMEOUT_MS = parseInt(process.env.AI_EMAIL_TIMEOUT_MS || '9000', 10)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || ''
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || 'NovaHaus Lead-to-Call Demo'
const FREE_LLM_MODELS_URL = process.env.FREE_LLM_MODELS_URL || 'https://shir-man.com/api/free-llm/top-models'
const FREE_LLM_FALLBACK_MODEL = process.env.FREE_LLM_FALLBACK_MODEL || 'openrouter/free'
const TENANT_CONFIG = DEFAULT_TENANT_CONFIG
const BRAND_NAME = TENANT_CONFIG.brand.name

/**
 * Build Google Auth from env.
 */
function parsePrivateKey(raw) {
  if (!raw) return ''
  // 1. Strip surrounding quotes (single or double)
  let key = raw.replace(/^["']|["']$/g, '')
  // 2. Replace literal two-char \n with real newlines (Vercel, some .env parsers)
  key = key.replace(/\\n/g, '\n')
  // 3. If still no real newlines, try JSON.parse as last resort
  if (!key.includes('\n') && key.includes('BEGIN')) {
    try { key = JSON.parse(`"${key}"`) } catch {}
  }
  return key
}

function getAuth() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim()
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ''
  const key = parsePrivateKey(rawKey)

  console.log('🔑 getAuth debug:')
  console.log('   email:', email || '❌ EMPTY')
  console.log('   rawKey length:', rawKey.length)
  console.log('   parsed key length:', key.length)
  console.log('   parsed key starts with BEGIN:', key.startsWith('-----BEGIN'))
  console.log('   parsed key has newlines:', key.includes('\n'))
  console.log('   parsed key line count:', key.split('\n').length)

  if (!email || !key || !key.startsWith('-----BEGIN')) {
    console.log('⚠️ getAuth: FAILED — missing or invalid credentials')
    return null
  }

  console.log('✅ getAuth: creating JWT...')

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

/* ============================================
   Human-readable labels
   ============================================ */
const WOHNUNG_LABELS = optionMap(TENANT_CONFIG.quiz.propertyOptions, 'label')
const ZEITRAHMEN_LABELS = optionMap(TENANT_CONFIG.quiz.purchaseTimelineOptions, 'label')
const EIGENKAPITAL_LABELS = optionMap(TENANT_CONFIG.quiz.equityBucketOptions, 'label')
const FINANZIERUNG_LABELS = optionMap(TENANT_CONFIG.quiz.financingStatusOptions, 'label')

const SCORE_EMOJIS = {
  hot: '🔥 HOT',
  warm: '🟡 WARM',
  cold: '🔵 COLD',
  not_qualified: '⚪ NOT QUALIFIED',
}

const LEAD_SHEET_COLUMNS = [
  'created_at',
  'lead_id',
  'status',
  'segment',
  'score',
  'next_best_action',
  'handoff_required',
  'handoff_reason',
  'name',
  'first_name',
  'last_name',
  'email',
  'phone',
  'wohnung',
  'purchase_timeline',
  'equity_bucket',
  'financing_status',
  'underqualified',
  'consent_contact',
  'consent_data_processing',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'priority',
  'next_action',
  'followup_due_at',
  'assigned_to',
  'qualification_reason',
  'lead_summary',
  'email_subject',
  'email_draft',
]

function addMinutes(isoDate, minutes) {
  return new Date(new Date(isoDate).getTime() + minutes * 60 * 1000).toISOString()
}

function getSalesQualification({ leadScore, zeitrahmen, eigenkapital, finanzierung, underqualified }) {
  const { scoring, workflow } = TENANT_CONFIG
  const hasMinimumCapital = scoring.warm.equityBuckets.includes(eigenkapital)
  const hasStrongCapital = scoring.hot.equityBuckets.includes(eigenkapital)
  const isActiveBuyer = scoring.warm.purchaseTimelines.includes(zeitrahmen)
  const financingReady = finanzierung === scoring.hot.financingStatus

  if (underqualified || scoring.notQualified.equityBuckets.includes(eigenkapital)) {
    return workflow.segments.not_qualified
  }

  if (
    leadScore === 'hot' ||
    (zeitrahmen === scoring.hot.purchaseTimeline && hasStrongCapital && financingReady)
  ) {
    return workflow.segments.hot
  }

  if (
    leadScore === 'warm' ||
    (isActiveBuyer && hasMinimumCapital)
  ) {
    return workflow.segments.warm
  }

  return workflow.segments.cold
}

function buildLeadSummary({ wohnungLabel, zeitrahmenLabel, eigenkapitalLabel, finanzierungLabel }) {
  return [
    `Objekt: ${wohnungLabel || 'nicht angegeben'}`,
    `Zeitrahmen: ${zeitrahmenLabel || 'nicht angegeben'}`,
    `Eigenkapital: ${eigenkapitalLabel || 'nicht angegeben'}`,
    `Finanzierung: ${finanzierungLabel || 'nicht angegeben'}`,
  ].join(' | ')
}

function buildEmailDraft({ firstName, segment, wohnungLabel, zeitrahmenLabel, eigenkapitalLabel, finanzierungLabel }) {
  const greeting = firstName ? `Hallo ${firstName},` : 'Hallo,'
  const objectLine = wohnungLabel ? `zur ${wohnungLabel}` : 'zu Ihrer Anfrage'

  if (segment === 'hot') {
    return {
      email_subject: 'Ihr Exposé und ein kurzer Abstimmungstermin',
      email_draft: `${greeting}\n\nvielen Dank für Ihr Interesse ${objectLine}. Ihre Angaben passen sehr gut zu einem kurzfristigen Beratungsgespräch.\n\nDarf unser Team Sie heute kurz telefonisch erreichen, um die nächsten Schritte und verfügbare Besichtigungstermine abzustimmen?\n\nViele Grüße\n${TENANT_CONFIG.email.signature}`,
    }
  }

  if (segment === 'warm') {
    return {
      email_subject: 'Kurze Rückfrage zu Ihrer Finanzierung',
      email_draft: `${greeting}\n\nvielen Dank für Ihre Anfrage ${objectLine}. Damit wir Ihnen direkt die passenden nächsten Schritte senden können: Haben Sie bereits mit einer Bank oder einem Finanzierungsberater über den Kauf gesprochen?\n\nIhre Angaben: ${zeitrahmenLabel}, ${eigenkapitalLabel}, ${finanzierungLabel}.\n\nWenn Sie möchten, können wir danach einen kurzen Telefontermin mit unserem Team koordinieren.\n\nViele Grüße\n${TENANT_CONFIG.email.signature}`,
    }
  }

  if (segment === 'not_qualified') {
    return {
      email_subject: `Ihre Anfrage bei ${BRAND_NAME}`,
      email_draft: `${greeting}\n\nvielen Dank für Ihr Interesse ${objectLine}. Für dieses Angebot empfehlen wir in der Regel mehr Eigenkapital, damit die Finanzierung realistisch geprüft werden kann.\n\nWir können Ihnen aber gern alternative Optionen oder Hinweise zur Finanzierungsvorbereitung senden.\n\nViele Grüße\n${TENANT_CONFIG.email.signature}`,
    }
  }

  return {
    email_subject: 'Weitere Informationen zu Ihrer Immobiliensuche',
    email_draft: `${greeting}\n\nvielen Dank für Ihre Anfrage ${objectLine}. Wir senden Ihnen gern weitere Informationen und halten Sie zu passenden Angeboten auf dem Laufenden.\n\nFalls Ihr Kaufzeitraum konkreter wird oder Sie Ihre Finanzierung klären möchten, antworten Sie einfach kurz auf diese E-Mail.\n\nViele Grüße\n${TENANT_CONFIG.email.signature}`,
  }
}

function buildAIEmailPrompt(leadRecord) {
  return {
    brand: BRAND_NAME,
    language: TENANT_CONFIG.brand.language,
    lead: {
      first_name: leadRecord.first_name,
      segment: leadRecord.segment,
      status: leadRecord.status,
      priority: leadRecord.priority,
      next_action: leadRecord.next_action,
      property: leadRecord.wohnung_label,
      purchase_timeline: leadRecord.purchase_timeline_label,
      equity_bucket: leadRecord.equity_bucket_label,
      financing_status: leadRecord.financing_status_label,
      handoff_required: leadRecord.handoff_required,
      qualification_reason: leadRecord.qualification_reason,
      lead_summary: leadRecord.lead_summary,
    },
  }
}

function parseAIJson(text) {
  if (!text) return null

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {}

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

function normalizeAIEmailDraft(parsed) {
  if (!parsed || typeof parsed !== 'object') return null

  const subject = String(parsed.subject || parsed.email_subject || '').trim()
  let body = String(parsed.body || parsed.email_draft || '').trim()

  if (!subject || !body || subject.length > 120 || body.length < 80) {
    return null
  }

  if (!body.includes(TENANT_CONFIG.email.signature)) {
    body = `${body.replace(/\s+$/g, '')}\n\nViele Grüße\n${TENANT_CONFIG.email.signature}`
  }

  return {
    email_subject: subject,
    email_draft: body,
  }
}

function buildAIEmailSystemInstruction() {
  return [
    `You write concise German real-estate follow-up email drafts for ${BRAND_NAME}.`,
    'Return only valid JSON with exactly these keys: "subject" and "body".',
    'Rules:',
    '- Write in polite German.',
    '- Keep the subject under 80 characters.',
    '- Keep the body around 90-150 words.',
    '- Ask at most one clear next-step question.',
    '- Never guarantee financing, availability, returns, approval, or legal outcomes.',
    '- Do not pressure the lead or invent facts.',
    '- The email is a draft for human review, not an automatic final send.',
    `- Sign with "Viele Grüße" and "${TENANT_CONFIG.email.signature}".`,
    'Segment handling:',
    `- hot: ${TENANT_CONFIG.email.systemInstructionSegments.hot}`,
    `- warm: ${TENANT_CONFIG.email.systemInstructionSegments.warm}`,
    `- cold: ${TENANT_CONFIG.email.systemInstructionSegments.cold}`,
    `- not_qualified: ${TENANT_CONFIG.email.systemInstructionSegments.not_qualified}`,
  ].join('\n')
}

async function generateGeminiEmailDraft(leadRecord) {
  if (!GEMINI_API_KEY) {
    console.log('⚠️  AI email provider is Gemini, but GEMINI_API_KEY is not set — using template draft')
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_EMAIL_TIMEOUT_MS)
  const model = encodeURIComponent(AI_EMAIL_MODEL)

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildAIEmailSystemInstruction() }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: JSON.stringify(buildAIEmailPrompt(leadRecord), null, 2),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  }).finally(() => clearTimeout(timeout))

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini email draft failed with status ${response.status}: ${errorText.slice(0, 240)}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim()

  return normalizeAIEmailDraft(parseAIJson(text))
}

async function resolveOpenRouterAutoModel() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.min(AI_EMAIL_TIMEOUT_MS, 5000))

  try {
    const response = await fetch(FREE_LLM_MODELS_URL, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`free model endpoint returned ${response.status}`)
    }

    const data = await response.json()
    const model = data.models?.[0]?.id || data.fallback?.id || FREE_LLM_FALLBACK_MODEL
    const baseUrl = data.baseUrl || OPENROUTER_BASE_URL

    return {
      model,
      baseUrl,
      source: 'free_llm_top_models',
      rankingVersion: data.rankingVersion || '',
      updatedAt: data.updatedAt || '',
    }
  } catch (error) {
    console.error('❌ Free LLM model resolver error:', error.message)
    return {
      model: FREE_LLM_FALLBACK_MODEL,
      baseUrl: OPENROUTER_BASE_URL,
      source: 'free_llm_fallback',
      rankingVersion: '',
      updatedAt: '',
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function getOpenRouterModelConfig() {
  if (AI_EMAIL_PROVIDER === 'openrouter_auto_free') {
    return resolveOpenRouterAutoModel()
  }

  return {
    model: AI_EMAIL_MODEL,
    baseUrl: OPENROUTER_BASE_URL,
    source: 'env',
    rankingVersion: '',
    updatedAt: '',
  }
}

async function generateOpenRouterEmailDraft(leadRecord) {
  if (!OPENROUTER_API_KEY) {
    console.log(`⚠️  AI email provider is ${AI_EMAIL_PROVIDER}, but OPENROUTER_API_KEY is not set — using template draft`)
    return null
  }

  const modelConfig = await getOpenRouterModelConfig()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_EMAIL_TIMEOUT_MS)
  const headers = {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  }

  if (OPENROUTER_SITE_URL) headers['HTTP-Referer'] = OPENROUTER_SITE_URL
  if (OPENROUTER_APP_NAME) headers['X-Title'] = OPENROUTER_APP_NAME

  const response = await fetch(`${modelConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    signal: controller.signal,
    headers,
    body: JSON.stringify({
      model: modelConfig.model,
      messages: [
        {
          role: 'system',
          content: buildAIEmailSystemInstruction(),
        },
        {
          role: 'user',
          content: JSON.stringify(buildAIEmailPrompt(leadRecord), null, 2),
        },
      ],
      temperature: 0.35,
      max_tokens: 450,
      response_format: { type: 'json_object' },
    }),
  }).finally(() => clearTimeout(timeout))

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter email draft failed with status ${response.status}: ${errorText.slice(0, 240)}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content?.trim()
  const draft = normalizeAIEmailDraft(parseAIJson(text))

  if (draft) {
    draft.model = data.model || modelConfig.model
    draft.model_source = modelConfig.source
    draft.ranking_version = modelConfig.rankingVersion
  }

  return draft
}

async function attachAIEmailDraft(leadRecord) {
  if (AI_EMAIL_PROVIDER === 'template') {
    return leadRecord
  }

  if (!['gemini', 'openrouter', 'openrouter_auto_free'].includes(AI_EMAIL_PROVIDER)) {
    console.log(`⚠️  Unknown AI_EMAIL_PROVIDER "${AI_EMAIL_PROVIDER}" — using template draft`)
    return leadRecord
  }

  try {
    const draft = AI_EMAIL_PROVIDER === 'gemini'
      ? await generateGeminiEmailDraft(leadRecord)
      : await generateOpenRouterEmailDraft(leadRecord)

    if (!draft) {
      console.log('⚠️  AI email generation returned invalid content — using template draft')
      return leadRecord
    }

    console.log(`✅ AI email draft generated with ${AI_EMAIL_PROVIDER}:${AI_EMAIL_MODEL}`)

    return {
      ...leadRecord,
      email_subject: draft.email_subject,
      email_draft: draft.email_draft,
      email_generation_provider: AI_EMAIL_PROVIDER,
      email_generation_model: draft.model || AI_EMAIL_MODEL,
      email_generation_model_source: draft.model_source || 'env',
      email_generation_ranking_version: draft.ranking_version || '',
      email_generation_status: 'generated',
    }
  } catch (error) {
    console.error('❌ AI email generation error:', error.message)
    return {
      ...leadRecord,
      email_generation_provider: AI_EMAIL_PROVIDER,
      email_generation_model: AI_EMAIL_MODEL,
      email_generation_status: 'fallback_template',
    }
  }
}

function buildLeadRecord(body, requestMeta = {}) {
  const {
    firstName = '',
    lastName = '',
    email = '',
    phone = '',
    wohnung = '',
    zeitrahmen = '',
    eigenkapital = '',
    finanzierung = '',
    lead_score = 'cold',
    underqualified = false,
    source = {},
    timestamp,
  } = body

  const createdAt = timestamp || new Date().toISOString()
  const qualification = getSalesQualification({
    leadScore: lead_score,
    zeitrahmen,
    eigenkapital,
    finanzierung,
    underqualified: Boolean(underqualified),
  })
  const followupDueAt = addMinutes(createdAt, qualification.followupMinutes)
  const wohnungLabel = WOHNUNG_LABELS[wohnung] || wohnung
  const zeitrahmenLabel = ZEITRAHMEN_LABELS[zeitrahmen] || zeitrahmen
  const eigenkapitalLabel = EIGENKAPITAL_LABELS[eigenkapital] || eigenkapital
  const finanzierungLabel = FINANZIERUNG_LABELS[finanzierung] || finanzierung
  const emailDraft = buildEmailDraft({
    firstName,
    segment: qualification.segment,
    wohnungLabel,
    zeitrahmenLabel,
    eigenkapitalLabel,
    finanzierungLabel,
  })

  return {
    lead_id: randomUUID(),
    created_at: createdAt,
    tenant_id: body.tenant_id || TENANT_CONFIG.tenantId,
    project_id: body.project_id || TENANT_CONFIG.projectId,
    source: TENANT_CONFIG.quiz.source,
    quiz_version: body.quiz_version || TENANT_CONFIG.quiz.version,
    status: qualification.status,
    priority: qualification.priority,

    first_name: firstName,
    last_name: lastName,
    name: `${firstName} ${lastName}`.trim(),
    email,
    phone,

    wohnung,
    wohnung_label: wohnungLabel,
    purchase_timeline: zeitrahmen,
    purchase_timeline_label: zeitrahmenLabel,
    equity_bucket: eigenkapital,
    equity_bucket_label: eigenkapitalLabel,
    financing_status: finanzierung,
    financing_status_label: finanzierungLabel,

    score: qualification.segment,
    original_score: lead_score,
    segment: qualification.segment,
    underqualified: Boolean(underqualified),
    next_action: qualification.nextAction,
    next_best_action: qualification.nextAction,
    followup_due_at: followupDueAt,
    assigned_to: qualification.assignedTo,
    handoff_required: qualification.handoffRequired,
    handoff_reason: qualification.handoffReason,
    qualification_reason: qualification.qualificationReason,
    lead_summary: buildLeadSummary({
      wohnungLabel,
      zeitrahmenLabel,
      eigenkapitalLabel,
      finanzierungLabel,
    }),
    email_subject: emailDraft.email_subject,
    email_draft: emailDraft.email_draft,

    consent_contact: true,
    consent_data_processing: true,
    consent_timestamp: createdAt,
    consent_ip: requestMeta.clientIp || '',
    consent_user_agent: requestMeta.userAgent || '',

    utm_source: source.utm_source || '',
    utm_medium: source.utm_medium || '',
    utm_campaign: source.utm_campaign || '',
    utm_content: source.utm_content || '',
    utm_term: source.utm_term || '',

    raw: body,
  }
}

async function sendToN8n(leadRecord) {
  if (!N8N_LEAD_WEBHOOK_URL) return false

  const headers = {
    'Content-Type': 'application/json',
  }

  if (N8N_LEAD_WEBHOOK_SECRET) {
    headers['x-lead-webhook-secret'] = N8N_LEAD_WEBHOOK_SECRET
  }

  const response = await fetch(N8N_LEAD_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(leadRecord),
  })

  if (!response.ok) {
    throw new Error(`n8n webhook failed with status ${response.status}`)
  }

  return true
}

/* ============================================
   Email notification
   ============================================ */
async function sendEmailNotification(leadData) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_EMAIL) {
    console.log('⚠️  Email not configured — skipping notification')
    return
  }

  const {
    firstName, lastName, email, phone,
    wohnung, zeitrahmen, eigenkapital, finanzierung,
    lead_score, underqualified, source = {}, timestamp,
  } = leadData

  const scoreLabel = SCORE_EMOJIS[lead_score] || lead_score
  const wohnungLabel = WOHNUNG_LABELS[wohnung] || wohnung
  const zeitrahmenLabel = ZEITRAHMEN_LABELS[zeitrahmen] || zeitrahmen
  const eigenkapitalLabel = EIGENKAPITAL_LABELS[eigenkapital] || eigenkapital
  const finanzierungLabel = FINANZIERUNG_LABELS[finanzierung] || finanzierung

  const subject = `${scoreLabel} — Neuer Lead: ${firstName} ${lastName}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #be4a74 0%, #2a6784 100%); padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Neuer Lead — NovaHaus Quiz</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${new Date(timestamp || Date.now()).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
      </div>

      <div style="background: #fff; border: 1px solid #e5e5e5; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
        
        <div style="background: ${lead_score === 'hot' ? '#fef2f2' : lead_score === 'warm' ? '#fefce8' : '#eff6ff'}; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <span style="font-size: 28px; font-weight: 700;">${scoreLabel}</span>
        </div>

        <h2 style="font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; border-bottom: 2px solid #eee; padding-bottom: 8px;">Kontaktdaten</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr><td style="padding: 8px 0; color: #888; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${firstName} ${lastName}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">E-Mail</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #be4a74;">${email}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Telefon</td><td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #be4a74;">${phone}</a></td></tr>
        </table>

        <h2 style="font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; border-bottom: 2px solid #eee; padding-bottom: 8px;">Quiz-Antworten</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr><td style="padding: 8px 0; color: #888; width: 140px;">Wohnung</td><td style="padding: 8px 0;">${wohnungLabel}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Zeitrahmen</td><td style="padding: 8px 0;">${zeitrahmenLabel}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Eigenkapital</td><td style="padding: 8px 0;">${eigenkapitalLabel}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Finanzierung</td><td style="padding: 8px 0;">${finanzierungLabel}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Unterqualifiziert</td><td style="padding: 8px 0;">${underqualified ? '⚠️ Ja' : '✅ Nein'}</td></tr>
        </table>

        ${source.utm_source ? `
        <h2 style="font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; border-bottom: 2px solid #eee; padding-bottom: 8px;">Quelle</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #888; width: 140px;">UTM Source</td><td style="padding: 8px 0;">${source.utm_source || '—'}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">UTM Medium</td><td style="padding: 8px 0;">${source.utm_medium || '—'}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">UTM Campaign</td><td style="padding: 8px 0;">${source.utm_campaign || '—'}</td></tr>
        </table>
        ` : ''}
      </div>
    </div>
  `

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  await transporter.sendMail({
    from: `"NovaHaus Quiz" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL,
    subject,
    html,
  })

  console.log(`📧 Email notification sent to ${NOTIFY_EMAIL}`)
}

/* ============================================
   POST /api/lead
   ============================================ */
async function processLead(body, requestMeta = {}) {
  const { clientIp = '', userAgent = '' } = requestMeta

  const {
    firstName,
    lastName,
    email,
    lead_score,
  } = body

    const leadRecord = await attachAIEmailDraft(buildLeadRecord(body, { clientIp, userAgent }))
    let delivery = 'none'

    try {
      const n8nSaved = await sendToN8n(leadRecord)
      if (n8nSaved) {
        delivery = 'n8n'
        console.log(`✅ Lead sent to n8n: ${firstName} ${lastName} (${lead_score})`)
      }
    } catch (n8nErr) {
      console.error('❌ n8n webhook error:', n8nErr.message)
      if (!SPREADSHEET_ID) {
        throw n8nErr
      }
    }

    // ── Debug: log which env vars are set ──
    console.log('📋 Lead API called — checking env vars:')
    console.log('   GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ SET' : '❌ NOT SET')
    console.log('   GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? `✅ SET (${process.env.GOOGLE_PRIVATE_KEY.length} chars)` : '❌ NOT SET')
    console.log('   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? `✅ SET (${process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.length} chars)` : '❌ NOT SET')
    console.log('   GOOGLE_SHEET_ID:', process.env.GOOGLE_SHEET_ID ? '✅ SET' : '❌ NOT SET')
    console.log('   GOOGLE_SHEETS_ID:', process.env.GOOGLE_SHEETS_ID ? '✅ SET' : '❌ NOT SET')
    console.log('   N8N_LEAD_WEBHOOK_URL:', N8N_LEAD_WEBHOOK_URL ? '✅ SET' : '❌ NOT SET')
    console.log('   SHEET_NAME resolved to:', SHEET_NAME)
    console.log('   SPREADSHEET_ID resolved to:', SPREADSHEET_ID ? `✅ ${SPREADSHEET_ID.substring(0, 8)}...` : '❌ EMPTY')
    console.log('   Lead data:', firstName, lastName, email, lead_score)

    // ── Prepare row for Google Sheets fallback ──
    const row = LEAD_SHEET_COLUMNS.map((column) => {
      const value = leadRecord[column]
      if (typeof value === 'boolean') return value ? 'yes' : 'no'
      return value ?? ''
    })

    // ── 1. Write to Google Sheets when n8n is not configured / failed ──
    const auth = delivery !== 'n8n' ? getAuth() : null
    let sheetSaved = false

    console.log('🔑 Auth object created:', auth ? '✅ YES' : '❌ NULL (missing credentials)')

    if (delivery !== 'n8n' && auth && SPREADSHEET_ID) {
      try {
        const sheets = google.sheets({ version: 'v4', auth })
        console.log(`📊 Attempting to write to sheet "${SHEET_NAME}" in spreadsheet ${SPREADSHEET_ID}`)

        // Ensure header row exists
        const existing = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A1:AG1`,
        })

        if (!existing.data.values || existing.data.values.length === 0) {
          console.log('📝 No header row found — creating headers...')
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1:AG1`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [LEAD_SHEET_COLUMNS],
            },
          })
        }

        // Append lead row
        console.log('📝 Appending lead row...')
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:AG`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [row],
          },
        })

        sheetSaved = true
        console.log(`✅ Lead saved to Google Sheets: ${firstName} ${lastName} (${lead_score})`)
      } catch (sheetErr) {
        console.error('❌ Google Sheets Error:', sheetErr.message)
        console.error('❌ Full error:', JSON.stringify(sheetErr.errors || sheetErr.response?.data || sheetErr, null, 2))
      }
    } else {
      console.log('⚠️  Google Sheets not configured — lead logged locally:')
      console.log('   auth:', auth ? 'OK' : 'NULL')
      console.log('   SPREADSHEET_ID:', SPREADSHEET_ID || 'EMPTY')
      console.log('    ', row.join(' | '))
    }

    if (delivery === 'none' && sheetSaved) {
      delivery = 'google_sheets'
    }

    // ── 2. Send email notification when n8n is not handling the lead ──
    if (delivery !== 'n8n') {
      try {
        await sendEmailNotification(body)
      } catch (emailErr) {
        console.error('❌ Email notification error:', emailErr.message)
      }
    }

  return {
    success: true,
    lead_score: leadRecord.segment,
    sheet_saved: sheetSaved,
    delivery,
    lead_id: leadRecord.lead_id,
    status: leadRecord.status,
    priority: leadRecord.priority,
    next_action: leadRecord.next_action,
    next_best_action: leadRecord.next_best_action,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
    const userAgent = request.headers.get('user-agent') || ''
    const isBackground = new URL(request.url).searchParams.get('background') === '1'

    if (isBackground) {
      waitUntil(
        processLead(body, { clientIp, userAgent }).catch((error) => {
          console.error('❌ Background Lead API Error:', error)
        })
      )

      return NextResponse.json(
        {
          success: true,
          queued: true,
        },
        { status: 202 }
      )
    }

    return NextResponse.json(await processLead(body, { clientIp, userAgent }))
  } catch (error) {
    console.error('❌ Lead API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
