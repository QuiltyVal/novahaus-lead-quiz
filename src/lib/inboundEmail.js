const RESEND_RECEIVED_EMAIL_BASE_URL = 'https://api.resend.com/emails/receiving'

const HTML_ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

export function extractEmailAddress(value) {
  if (!value) return ''

  if (typeof value === 'object' && !Array.isArray(value)) {
    return extractEmailAddress(value.email || value.address || value.from || '')
  }

  const raw = Array.isArray(value) ? String(value[0] || '') : String(value)
  const angleMatch = raw.match(/<([^>]+)>/)
  const candidate = angleMatch ? angleMatch[1] : raw
  const emailMatch = candidate.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)

  return emailMatch ? emailMatch[0].trim().toLowerCase() : ''
}

export function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot);|&#39;/g, (entity) => HTML_ENTITIES[entity] || entity)
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function extractReplyText(receivedEmail) {
  const text = String(receivedEmail?.text || '').trim()
  if (text) return text.slice(0, 12000)

  const html = stripHtml(receivedEmail?.html || '')
  if (html) return html.slice(0, 12000)

  return ''
}

export async function fetchReceivedEmail(emailId) {
  const apiKey = process.env.RESEND_API_KEY || ''
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const response = await fetch(
    `${RESEND_RECEIVED_EMAIL_BASE_URL}/${encodeURIComponent(emailId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const providerMessage = data?.message ? `: ${String(data.message).slice(0, 160)}` : ''
    throw new Error(`Resend received email fetch failed with status ${response.status}${providerMessage}`)
  }

  return data?.data || data
}
