function truncateText(value, limit = 2800) {
  const text = String(value || '').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 3)}...`
}

export async function sendTelegramLeadReplyNotification({ lead, replyText }) {
  const token = process.env.TELEGRAM_BOT_TOKEN || ''
  const chatId = process.env.TELEGRAM_CHAT_ID || ''

  if (!token || !chatId) {
    return { sent: false, reason: 'telegram_not_configured' }
  }

  const text = [
    'NovaHaus: Antwort erhalten',
    '',
    `Lead: ${lead?.name || 'Unbekannter Lead'}`,
    `Segment: ${lead?.priority || '—'} · ${lead?.segment || '—'}`,
    '',
    truncateText(replyText) || 'Keine Textantwort im Inbound-Event.',
  ].join('\n')

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
    console.warn('Telegram reply notification failed', {
      lead_id: lead?.lead_id || '',
      status: response.status,
    })
    return { sent: false, reason: 'telegram_request_failed' }
  }

  return { sent: true }
}
