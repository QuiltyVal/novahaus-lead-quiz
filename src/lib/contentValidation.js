export const CONTENT_PURPOSES = ['engagement', 'property', 'conversion', 'b2b_demo']
export const CONTENT_CLASSES = [
  'mood-silent',
  'mood-vo',
  'transform',
  'local-fact',
  'utility',
  'avatar',
  'narrative',
  'ad-style',
]
export const PROPERTY_STATUSES = ['draft', 'active', 'reserved', 'sold', 'archived']
export const PHOTO_RIGHTS_STATUSES = ['open', 'requested', 'confirmed', 'not_required', 'blocked']
export const METRIC_WINDOWS = ['24h', '72h', '7d', '30d', 'manual', 'backfill']

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeSlug(value, field = 'slug') {
  const normalized = String(value || '').trim().toLowerCase()
  if (!SLUG_PATTERN.test(normalized)) {
    throw new Error(`${field} must contain lowercase letters, numbers, and hyphens only`)
  }
  return normalized
}

export function normalizeRequiredText(value, field, maxLength = 240) {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error(`${field} is required`)
  if (normalized.length > maxLength) throw new Error(`${field} is too long`)
  return normalized
}

export function normalizeOptionalText(value, maxLength = 4000) {
  const normalized = String(value || '').trim()
  if (!normalized) return null
  if (normalized.length > maxLength) throw new Error('value is too long')
  return normalized
}

export function normalizeInstagramHandle(value) {
  const normalized = String(value || '').trim().replace(/^@/, '').toLowerCase()
  if (!normalized) return null
  if (!/^[a-z0-9._]{1,30}$/.test(normalized)) {
    throw new Error('Instagram handle is invalid')
  }
  return normalized
}

export function normalizeInstagramPermalink(value) {
  const raw = normalizeRequiredText(value, 'Instagram permalink', 500)
  let url

  try {
    url = new URL(raw)
  } catch {
    throw new Error('Instagram permalink is invalid')
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const path = url.pathname.replace(/\/+$/, '')
  const segments = path.split('/').filter(Boolean)
  const isReelPath =
    (segments.length === 2 && segments[0] === 'reel') ||
    (segments.length === 3 && segments[1] === 'reel')
  if (host !== 'instagram.com' || !isReelPath || !/^[A-Za-z0-9_-]+$/.test(segments.at(-1))) {
    throw new Error('Use a Reel URL from instagram.com')
  }

  return `https://www.instagram.com${path}/`
}

export function normalizePurpose(value) {
  const purpose = String(value || '').trim()
  if (!CONTENT_PURPOSES.includes(purpose)) throw new Error('Content purpose is invalid')
  return purpose
}

export function normalizeContentClass(value, { required = false } = {}) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) {
    if (required) throw new Error('Growth Lab class is required')
    return null
  }
  if (!CONTENT_CLASSES.includes(normalized)) throw new Error('Growth Lab class is invalid')
  return normalized
}

export function normalizeGrowthHypothesis(value, { required = false } = {}) {
  const normalized = normalizeOptionalText(value, 2000)
  if (required && !normalized) throw new Error('Growth Lab hypothesis is required')
  return normalized
}

export function normalizePillarSlugs(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(',')
  return [...new Set(items.map((item) => item.trim().toLowerCase()).filter(Boolean).map((item) => {
    if (!/^[a-z0-9_]+$/.test(item)) throw new Error(`Invalid pillar: ${item}`)
    return item
  }))]
}

export function normalizeUuidList(values) {
  const items = Array.isArray(values) ? values : [values]
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean).map((item) => {
    if (!UUID_PATTERN.test(item)) throw new Error('Object ID is invalid')
    return item
  }))]
}

export function parseNullableNonNegativeInteger(value, field) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (!/^\d+$/.test(raw)) throw new Error(`${field} must be a non-negative integer`)
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isSafeInteger(parsed)) throw new Error(`${field} is too large`)
  return parsed
}

export function parseNullableNonNegativeNumber(value, field) {
  const raw = String(value ?? '').trim().replace(',', '.')
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${field} must be non-negative`)
  return parsed
}

export function normalizeMetricWindow(value) {
  const normalized = String(value || 'manual').trim()
  if (!METRIC_WINDOWS.includes(normalized)) throw new Error('Metric window is invalid')
  return normalized
}

export function propertyKeysForQuizSelection(tenantConfig, selectionValue) {
  const selected = tenantConfig?.quiz?.propertyOptions?.find((option) => option.value === selectionValue)
  if (!selected) return []
  if (Array.isArray(selected.propertyKeys)) return selected.propertyKeys
  return []
}

export function latestSnapshotsByPost(snapshots) {
  const latest = new Map()

  for (const snapshot of snapshots) {
    const current = latest.get(snapshot.post_id)
    const currentTime = current ? new Date(current.captured_at).getTime() : -Infinity
    const candidateTime = new Date(snapshot.captured_at).getTime()
    if (!current || candidateTime > currentTime) latest.set(snapshot.post_id, snapshot)
  }

  return [...latest.values()]
}
