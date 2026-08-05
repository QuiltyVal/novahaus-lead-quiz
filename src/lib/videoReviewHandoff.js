export function buildVideoDecisionMessage(decision = {}) {
  const location = [decision.address_label, decision.district]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' · ')

  const approved = decision.decision === 'approved'
  const lines = [
    approved ? 'NovaHaus: Video freigegeben' : 'NovaHaus: Änderung angefordert',
    '',
    `Kunde: ${String(decision.tenant_name || decision.tenant_id || '—').trim()}`,
    `Objekt: ${String(decision.property_title || '—').trim()}`,
  ]

  if (location) lines.push(`Ort: ${location}`)

  lines.push(
    `Video: ${String(decision.video_title || decision.reel_code || '—').trim()}`,
    '',
    `Entschieden von: ${String(decision.decided_by_name || '—').trim()}`,
    `E-Mail: ${String(decision.decided_by_email || '—').trim()}`
  )

  // The note is the whole point of a rework: it is the only instruction the
  // operator gets, and the client is not coming back to explain it.
  const note = String(decision.note || '').trim()
  if (note) lines.push('', `Anmerkung: ${note}`)

  if (decision.video_id) {
    lines.push('', `Video öffnen: /admin/videos/${decision.video_id}`)
  }

  return lines.join('\n')
}
