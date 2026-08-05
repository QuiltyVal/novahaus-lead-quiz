export const VIDEO_DECISIONS = ['approved', 'rework']
export const VIDEO_DECISION_TEXT_VERSION = '2026-08-05.de.v1'
export const VIDEO_NOTE_MAX_LENGTH = 2000

function requiredText(value, field, maxLength) {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error(`${field} ist erforderlich.`)
  if (normalized.length > maxLength) throw new Error(`${field} ist zu lang.`)
  return normalized
}

function normalizeEmail(value) {
  const normalized = requiredText(value, 'E-Mail-Adresse', 320).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
  }
  return normalized
}

export function normalizeDecision(value) {
  const normalized = String(value || '').trim()
  if (!VIDEO_DECISIONS.includes(normalized)) {
    throw new Error('Bitte geben Sie das Video frei oder fordern Sie eine Änderung an.')
  }
  return normalized
}

// An approval is the "Freigabe" promised on /pilot: it is what permits
// publication, so it is recorded with the same weight as the rights
// confirmation — wording included, so a later dispute reads what was agreed.
export function videoDecisionText(decision) {
  if (normalizeDecision(decision) === 'approved') {
    return 'Ich gebe dieses Video zur Veröffentlichung frei. Ich habe es vollständig angesehen und bestätige, dass die Darstellung des Objekts zutrifft und keine Rechte Dritter verletzt werden. Die Freigabe gilt für die bei der Materialübergabe gewählte Verwendung.'
  }
  return 'Ich gebe dieses Video nicht frei und fordere eine Änderung an. Bis zu einer erneuten Freigabe darf dieses Video nicht veröffentlicht werden.'
}

export function validateVideoDecision(input) {
  const decision = normalizeDecision(input?.decision)
  const note = String(input?.note || '').trim()

  // Without a note a rework request is a dead end: the client is gone and there
  // is nothing to act on.
  if (decision === 'rework' && !note) {
    throw new Error('Bitte beschreiben Sie kurz, was geändert werden soll.')
  }
  if (note.length > VIDEO_NOTE_MAX_LENGTH) {
    throw new Error('Die Anmerkung ist zu lang.')
  }

  return {
    videoId: requiredText(input?.videoId, 'Video-ID', 80),
    decision,
    note: note || null,
    decidedByName: requiredText(input?.decidedByName, 'Name', 160),
    decidedByEmail: normalizeEmail(input?.decidedByEmail),
    decisionText: videoDecisionText(decision),
    decisionTextVersion: VIDEO_DECISION_TEXT_VERSION,
  }
}
