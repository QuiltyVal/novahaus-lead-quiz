export function formatAdminDate(value, { withTime = true } = {}) {
  if (!value) return '—'
  const options = withTime
    ? { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Berlin' }
    : { dateStyle: 'medium', timeZone: 'Europe/Berlin' }
  return new Intl.DateTimeFormat('de-DE', options).format(new Date(value))
}

export function metricValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('de-DE').format(Number(value))
}

export function purposeLabel(value) {
  return {
    engagement: 'Engagement',
    property: 'Objekt',
    conversion: 'Conversion',
    b2b_demo: 'B2B Demo',
  }[value] || value || '—'
}

export function objectStatusLabel(value) {
  return {
    draft: 'Entwurf',
    active: 'Aktiv',
    reserved: 'Reserviert',
    sold: 'Verkauft',
    archived: 'Archiviert',
  }[value] || value || '—'
}

export function rightsStatusLabel(value) {
  return {
    open: 'Offen',
    requested: 'Angefragt',
    confirmed: 'Bestätigt',
    not_required: 'Nicht erforderlich',
    blocked: 'Blockiert',
  }[value] || value || '—'
}
