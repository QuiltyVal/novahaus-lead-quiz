export const VIDEO_REVIEW_CONTENT_TYPE = 'video/mp4'
export const VIDEO_REVIEW_MAX_FILE_SIZE = 200 * 1024 * 1024

const UUID_MP4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.mp4$/i

export function validateVideoDescriptor(file) {
  const descriptor = {
    name: String(file?.name || ''),
    type: String(file?.type || ''),
    size: Number(file?.size),
  }

  if (descriptor.type !== VIDEO_REVIEW_CONTENT_TYPE) {
    throw new Error('Nur MP4-Videos sind erlaubt.')
  }
  if (!Number.isFinite(descriptor.size) || descriptor.size <= 0) {
    throw new Error('Die Videodatei ist leer oder ungültig.')
  }
  if (descriptor.size > VIDEO_REVIEW_MAX_FILE_SIZE) {
    throw new Error('Das Video ist größer als 200 MB.')
  }

  return descriptor
}

export function isVideoReviewPathname(pathname, { tenantId, propertyId }) {
  const parts = String(pathname || '').split('/')
  return parts.length === 4
    && parts[0] === 'client-videos'
    && parts[1] === String(tenantId)
    && parts[2] === String(propertyId)
    && UUID_MP4_PATTERN.test(parts[3])
}
