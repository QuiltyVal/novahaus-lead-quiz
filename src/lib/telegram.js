import { buildDataRoomSubmissionMessage } from '@/lib/dataRoomHandoff'
import { buildVideoDecisionMessage } from '@/lib/videoReviewHandoff'

function truncateText(value, limit = 2800) {
  const text = String(value || '').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 3)}...`
}

async function postTelegramMessage(text, context = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN || ''
  const chatId = process.env.TELEGRAM_CHAT_ID || ''

  if (!token || !chatId) {
    return { sent: false, reason: 'telegram_not_configured' }
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  })

  if (!response.ok) {
    console.warn('Telegram notification failed', { ...context, status: response.status })
    return { sent: false, reason: 'telegram_request_failed' }
  }

  return { sent: true }
}

export async function sendTelegramLeadReplyNotification({ lead, replyText }) {
  const text = [
    'NovaHaus: Antwort erhalten',
    '',
    `Lead: ${lead?.name || 'Unbekannter Lead'}`,
    `Segment: ${lead?.priority || '—'} · ${lead?.segment || '—'}`,
    '',
    truncateText(replyText) || 'Keine Textantwort im Inbound-Event.',
  ].join('\n')

  return postTelegramMessage(text, { lead_id: lead?.lead_id || '' })
}

export async function sendTelegramDataRoomSubmissionNotification(submission) {
  return postTelegramMessage(buildDataRoomSubmissionMessage(submission), {
    property_id: submission?.property_id || '',
  })
}

export async function sendTelegramVideoDecisionNotification(decision) {
  return postTelegramMessage(buildVideoDecisionMessage(decision), {
    video_id: decision?.video_id || '',
  })
}
