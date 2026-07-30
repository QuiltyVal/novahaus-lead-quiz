const USAGE_LABELS = {
  organic: 'nur organisch',
  paid: 'nur bezahlte Werbung',
  both: 'organisch und bezahlt',
}

export function usageLabel(value) {
  return USAGE_LABELS[String(value || '')] || String(value || '—')
}

export function buildDataRoomSubmissionMessage(submission = {}) {
  const location = [submission.address_label, submission.district]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' · ')

  const lines = [
    'NovaHaus: Objektmaterial eingegangen',
    '',
    `Kunde: ${String(submission.tenant_name || submission.tenant_id || '—').trim()}`,
    `Objekt: ${String(submission.property_title || '—').trim()}`,
  ]

  if (location) lines.push(`Ort: ${location}`)

  lines.push(
    `Fotos: ${Number(submission.ready_count || 0)}`,
    `Nutzung: ${usageLabel(submission.material_usage)}`,
    '',
    `Rechte bestätigt von: ${String(submission.confirmed_by_name || '—').trim()}`,
    `E-Mail: ${String(submission.confirmed_by_email || '—').trim()}`
  )

  // A rejected file is the operator's problem, not the client's: the client saw
  // an error and moved on, so the count only surfaces here.
  const rejected = Number(submission.rejected_count || 0)
  if (rejected > 0) lines.push('', `Abgelehnte Dateien: ${rejected}`)

  if (submission.property_id) {
    lines.push('', `Objekt öffnen: /admin/objects/${submission.property_id}`)
  }

  return lines.join('\n')
}
