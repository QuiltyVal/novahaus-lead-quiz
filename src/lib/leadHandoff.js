export function resolveHotLeadNotificationEmail({
  hotLeadNotifyEmail = '',
  notifyEmail = '',
  leadEmailBcc = '',
} = {}) {
  return [hotLeadNotifyEmail, notifyEmail, leadEmailBcc]
    .map((value) => String(value || '').trim())
    .find(Boolean) || ''
}

export function buildHotLeadHandoffContent(leadRecord) {
  const name = String(leadRecord.name || '').trim() || 'Unbekannter Lead'
  const lines = [
    `Lead-ID: ${leadRecord.lead_id}`,
    `Name: ${name}`,
    `Telefon: ${leadRecord.phone}`,
    `E-Mail: ${leadRecord.email}`,
    `Objekt: ${leadRecord.wohnung_label || leadRecord.wohnung || 'nicht angegeben'}`,
    `Zeitrahmen: ${leadRecord.purchase_timeline_label || leadRecord.purchase_timeline || 'nicht angegeben'}`,
    `Eigenkapital: ${leadRecord.equity_bucket_label || leadRecord.equity_bucket || 'nicht angegeben'}`,
    `Finanzierung: ${leadRecord.financing_status_label || leadRecord.financing_status || 'nicht angegeben'}`,
    `Quelle: ${leadRecord.utm_campaign || leadRecord.utm_source || 'nicht angegeben'}`,
    `Nächster Schritt: ${leadRecord.next_action || 'Rückruf prüfen'}`,
  ]

  return {
    subject: `[HOT] Rückruf prüfen: ${name}`,
    body: lines.join('\n'),
  }
}
