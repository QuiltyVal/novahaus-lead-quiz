export const ADMIN_SESSION_COOKIE = 'admin_session'
export const ADMIN_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

const encoder = new TextEncoder()
const HMAC_ALGORITHM = { name: 'HMAC', hash: 'SHA-256' }

async function importHmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    HMAC_ALGORITHM,
    false,
    usages
  )
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }

  return bytes
}

async function signExpiry(expiresAt, secret) {
  const key = await importHmacKey(secret, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(expiresAt))
  return bytesToHex(signature)
}

export async function createAdminSession(secret, now = Date.now()) {
  const expiresAt = now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000
  const expiresAtText = String(expiresAt)
  const signature = await signExpiry(expiresAtText, secret)

  return {
    value: `${expiresAtText}.${signature}`,
    expiresAt,
  }
}

export async function verifyAdminSession(value, secret, now = Date.now()) {
  if (!value || !secret) return false

  const parts = value.split('.')
  if (parts.length !== 2) return false

  const [expiresAtText, signatureHex] = parts
  if (!/^\d+$/.test(expiresAtText) || !/^[a-f0-9]{64}$/.test(signatureHex)) return false

  const expiresAt = Number(expiresAtText)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false

  try {
    const key = await importHmacKey(secret, ['verify'])
    return crypto.subtle.verify(
      'HMAC',
      key,
      hexToBytes(signatureHex),
      encoder.encode(expiresAtText)
    )
  } catch {
    return false
  }
}

export async function constantTimeEqual(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ])
  const leftBytes = new Uint8Array(leftDigest)
  const rightBytes = new Uint8Array(rightDigest)
  let difference = 0

  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index]
  }

  return difference === 0
}
