export const DATA_ROOM_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]
export const DATA_ROOM_MAX_FILE_SIZE = 15 * 1024 * 1024
export const DATA_ROOM_MAX_FILES = 20
export const DATA_ROOM_USAGE_SCOPES = ['organic', 'paid', 'both']
export const RIGHTS_TEXT_VERSION = '2026-07-29.de.v1'

const USAGE_LABELS = {
  organic: 'ausschließlich organische Inhalte',
  paid: 'ausschließlich bezahlte Werbeinhalte',
  both: 'organische und bezahlte Werbeinhalte',
}

function requiredText(value, field, maxLength) {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error(`${field} ist erforderlich.`)
  if (normalized.length > maxLength) throw new Error(`${field} ist zu lang.`)
  return normalized
}

function optionalText(value, maxLength) {
  const normalized = String(value || '').trim()
  if (!normalized) return null
  if (normalized.length > maxLength) throw new Error('Ein Textfeld ist zu lang.')
  return normalized
}

function normalizeEmail(value) {
  const normalized = requiredText(value, 'E-Mail-Adresse', 320).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
  }
  return normalized
}

function normalizeFileSize(value) {
  const size = Number(value)
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new Error('Eine Bilddatei ist leer oder beschädigt.')
  }
  return size
}

export function normalizeUsageScope(value) {
  const normalized = String(value || '').trim()
  if (!DATA_ROOM_USAGE_SCOPES.includes(normalized)) {
    throw new Error('Bitte wählen Sie den Verwendungszweck aus.')
  }
  return normalized
}

export function rightsConfirmationText(usageScope) {
  const normalizedUsage = normalizeUsageScope(usageScope)
  return `Ich bestätige, dass ich Inhaber/in der erforderlichen Rechte an den hochgeladenen Aufnahmen bin oder vom Rechteinhaber zur Nutzung und Bearbeitung autorisiert wurde. Ich erteile NovaHaus/Augenblick die Erlaubnis, die Aufnahmen für ${USAGE_LABELS[normalizedUsage]} zu speichern, technisch zu bearbeiten und mit KI zu verändern sowie daraus Inhalte zu erstellen und zu veröffentlichen. Rechte abgebildeter Personen und sonstige Rechte Dritter sind geklärt.`
}

export function validatePhotoDescriptor(file) {
  const name = requiredText(file?.name, 'Dateiname', 255)
  const contentType = String(file?.type || '').trim().toLowerCase()
  const size = normalizeFileSize(file?.size)

  if (!DATA_ROOM_ALLOWED_IMAGE_TYPES.includes(contentType)) {
    throw new Error(`${name}: Nur JPEG, PNG oder WebP sind erlaubt.`)
  }
  if (size > DATA_ROOM_MAX_FILE_SIZE) {
    throw new Error(`${name}: Die Datei ist größer als 15 MB.`)
  }

  return { name, type: contentType, size }
}

export function validateDataRoomSubmission(input) {
  if (input?.rightsAccepted !== true) {
    throw new Error('Die Rechtebestätigung ist für den Upload erforderlich.')
  }

  const usageScope = normalizeUsageScope(input?.usageScope)
  const files = Array.isArray(input?.files) ? input.files.map(validatePhotoDescriptor) : []
  if (files.length === 0) throw new Error('Bitte wählen Sie mindestens ein Foto aus.')
  if (files.length > DATA_ROOM_MAX_FILES) {
    throw new Error(`Pro Objekt sind höchstens ${DATA_ROOM_MAX_FILES} Fotos möglich.`)
  }

  return {
    propertyId: optionalText(input?.propertyId, 80),
    title: requiredText(input?.title, 'Objektbezeichnung', 200),
    addressLabel: optionalText(input?.addressLabel, 300),
    district: optionalText(input?.district, 120),
    eckdaten: optionalText(input?.eckdaten, 4000),
    usageScope,
    confirmerName: requiredText(input?.confirmerName, 'Name', 160),
    confirmerEmail: normalizeEmail(input?.confirmerEmail),
    rightsText: rightsConfirmationText(usageScope),
    rightsTextVersion: RIGHTS_TEXT_VERSION,
    files,
  }
}

export function detectImageContentType(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])

  if (
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  ) {
    return 'image/jpeg'
  }

  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (
    data.length >= 12 &&
    String.fromCharCode(...data.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...data.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp'
  }

  return null
}

export function validateImageSignature(bytes, expectedContentType) {
  const detectedType = detectImageContentType(bytes)
  if (!detectedType || detectedType !== expectedContentType) {
    throw new Error('Der Dateiinhalt stimmt nicht mit dem erlaubten Bildformat überein.')
  }
  return detectedType
}
