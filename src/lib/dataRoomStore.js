import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { isDatabaseConfigured, query, withTransaction } from '@/lib/db'
import { normalizeSlug } from '@/lib/contentValidation'
import {
  DATA_ROOM_MAX_FILES,
  validateDataRoomSubmission,
} from '@/lib/dataRoomValidation'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,200}$/
const PHOTO_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export { isDatabaseConfigured }

function normalizeUuid(value, field) {
  const normalized = String(value || '').trim()
  if (!UUID_PATTERN.test(normalized)) throw new Error(`${field} ist ungültig.`)
  return normalized
}

function normalizeAccessToken(value) {
  const token = String(value || '').trim()
  if (!TOKEN_PATTERN.test(token)) throw new Error('Der Zugangslink ist ungültig oder wurde widerrufen.')
  return token
}

function tokenHash(token) {
  return createHash('sha256').update(normalizeAccessToken(token)).digest('hex')
}

function safePathPart(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '-')
}

async function findActiveAccessByHash(hash, database = { query }) {
  const result = await database.query(
    `
      SELECT tat.id, tat.tenant_id, t.name AS tenant_name
      FROM tenant_access_tokens tat
      JOIN tenants t ON t.id = tat.tenant_id
      WHERE tat.token_hash = $1
        AND tat.revoked_at IS NULL
      LIMIT 1
    `,
    [hash]
  )
  return result.rows[0] || null
}

export async function resolveDataRoomAccess(accessToken) {
  if (!isDatabaseConfigured()) throw new Error('Der Datenraum ist vorübergehend nicht verfügbar.')
  const access = await findActiveAccessByHash(tokenHash(accessToken))
  if (!access) throw new Error('Der Zugangslink ist ungültig oder wurde widerrufen.')
  return access
}

export async function getDataRoom(accessToken) {
  const access = await resolveDataRoomAccess(accessToken)
  const { rows } = await query(
    `
      SELECT
        p.id,
        p.title,
        p.address_label,
        p.district,
        p.notes AS eckdaten,
        p.material_usage,
        p.photo_rights_status,
        p.updated_at,
        COALESCE(photo_stats.photo_count, 0) AS photo_count,
        COALESCE(photo_stats.photos, '[]'::json) AS photos
      FROM properties p
      LEFT JOIN LATERAL (
        SELECT
          count(*)::int AS photo_count,
          json_agg(
            json_build_object(
              'id', pp.id,
              'name', pp.original_filename,
              'content_type', pp.content_type,
              'byte_size', pp.byte_size,
              'uploaded_at', pp.uploaded_at
            )
            ORDER BY pp.uploaded_at DESC
          ) AS photos
        FROM property_photos pp
        WHERE pp.property_id = p.id
          AND pp.tenant_id = p.tenant_id
          AND pp.upload_status = 'ready'
      ) photo_stats ON true
      WHERE p.tenant_id = $1
        AND p.status <> 'archived'
      ORDER BY p.updated_at DESC, p.title ASC
    `,
    [access.tenant_id]
  )

  return {
    tenant: { id: access.tenant_id, name: access.tenant_name },
    properties: rows,
  }
}

export async function listTenantAccessTokens() {
  if (!isDatabaseConfigured()) return []
  const { rows } = await query(`
    SELECT
      tat.id,
      tat.tenant_id,
      tat.token_prefix,
      tat.created_at,
      tat.revoked_at
    FROM tenant_access_tokens tat
    ORDER BY tat.created_at DESC
  `)
  return rows
}

export async function createTenantAccessToken(tenantId) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL is not configured')
  const normalizedTenantId = normalizeSlug(tenantId, 'client ID')
  const token = randomBytes(32).toString('base64url')
  const result = await query(
    `
      INSERT INTO tenant_access_tokens (tenant_id, token_hash, token_prefix)
      SELECT id, $2, $3
      FROM tenants
      WHERE id = $1
      RETURNING id, tenant_id, token_prefix, created_at
    `,
    [normalizedTenantId, tokenHash(token), token.slice(0, 8)]
  )
  if (!result.rows[0]) throw new Error('client was not found')
  return { token, record: result.rows[0] }
}

export async function revokeTenantAccessToken(tokenId) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL is not configured')
  const id = normalizeUuid(tokenId, 'Token-ID')
  const result = await query(
    `
      UPDATE tenant_access_tokens
      SET revoked_at = COALESCE(revoked_at, now())
      WHERE id = $1
      RETURNING id, tenant_id, revoked_at
    `,
    [id]
  )
  if (!result.rows[0]) throw new Error('access token was not found')
  return result.rows[0]
}

export async function prepareDataRoomUpload({ accessToken, input }) {
  const payload = validateDataRoomSubmission(input)
  const hash = tokenHash(accessToken)

  return withTransaction(async (client) => {
    const access = await findActiveAccessByHash(hash, client)
    if (!access) throw new Error('Der Zugangslink ist ungültig oder wurde widerrufen.')

    let property
    if (payload.propertyId) {
      const propertyId = normalizeUuid(payload.propertyId, 'Objekt-ID')
      const propertyResult = await client.query(
        `
          SELECT *
          FROM properties
          WHERE id = $1
            AND tenant_id = $2
            AND status <> 'archived'
          FOR UPDATE
        `,
        [propertyId, access.tenant_id]
      )
      property = propertyResult.rows[0]
      if (!property) throw new Error('Das ausgewählte Objekt wurde nicht gefunden.')
    } else {
      const projectResult = await client.query(
        `
          SELECT id
          FROM projects
          WHERE tenant_id = $1
          ORDER BY created_at ASC
          LIMIT 1
        `,
        [access.tenant_id]
      )
      const externalKey = `kunde-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
      const propertyResult = await client.query(
        `
          INSERT INTO properties (
            tenant_id, project_id, external_key, title, address_label,
            district, status, photo_rights_status, notes, material_usage
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'draft', 'confirmed', $7, $8)
          RETURNING *
        `,
        [
          access.tenant_id,
          projectResult.rows[0]?.id || null,
          externalKey,
          payload.title,
          payload.addressLabel,
          payload.district,
          payload.eckdaten,
          payload.usageScope,
        ]
      )
      property = propertyResult.rows[0]
    }

    const updatedPropertyResult = await client.query(
      `
        UPDATE properties
        SET title = $3,
            address_label = $4,
            district = $5,
            notes = $6,
            material_usage = $7,
            photo_rights_status = 'confirmed'
        WHERE id = $1
          AND tenant_id = $2
        RETURNING *
      `,
      [
        property.id,
        access.tenant_id,
        payload.title,
        payload.addressLabel,
        payload.district,
        payload.eckdaten,
        payload.usageScope,
      ]
    )
    property = updatedPropertyResult.rows[0]

    const confirmationResult = await client.query(
      `
        INSERT INTO property_rights_confirmations (
          property_id, tenant_id, confirmed_by_name, confirmed_by_email,
          text_version, confirmation_text, material_usage
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        property.id,
        access.tenant_id,
        payload.confirmerName,
        payload.confirmerEmail,
        payload.rightsTextVersion,
        payload.rightsText,
        payload.usageScope,
      ]
    )
    const confirmation = confirmationResult.rows[0]

    await client.query(
      `
        UPDATE property_photos
        SET upload_status = 'rejected',
            rejection_reason = 'Upload-Zeitfenster abgelaufen'
        WHERE property_id = $1
          AND tenant_id = $2
          AND upload_status = 'pending'
          AND expires_at <= now()
      `,
      [property.id, access.tenant_id]
    )

    const countResult = await client.query(
      `
        SELECT count(*)::int AS photo_count
        FROM property_photos
        WHERE property_id = $1
          AND tenant_id = $2
          AND upload_status IN ('pending', 'ready')
      `,
      [property.id, access.tenant_id]
    )
    const currentCount = countResult.rows[0]?.photo_count || 0
    if (currentCount + payload.files.length > DATA_ROOM_MAX_FILES) {
      throw new Error(`Für dieses Objekt sind insgesamt höchstens ${DATA_ROOM_MAX_FILES} Fotos möglich.`)
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const slots = []
    for (const file of payload.files) {
      const slotId = randomUUID()
      const extension = PHOTO_EXTENSIONS[file.type]
      const pathname = [
        'data-room',
        safePathPart(access.tenant_id),
        property.id,
        `${slotId}.${extension}`,
      ].join('/')
      const slotResult = await client.query(
        `
          INSERT INTO property_photos (
            id, property_id, tenant_id, rights_confirmation_id,
            original_filename, expected_pathname, content_type,
            byte_size, expires_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, expected_pathname, original_filename, content_type, byte_size, expires_at
        `,
        [
          slotId,
          property.id,
          access.tenant_id,
          confirmation.id,
          file.name,
          pathname,
          file.type,
          file.size,
          expiresAt,
        ]
      )
      slots.push(slotResult.rows[0])
    }

    return {
      property: {
        id: property.id,
        title: property.title,
        address_label: property.address_label,
        district: property.district,
        eckdaten: property.notes,
        material_usage: property.material_usage,
        photo_rights_status: property.photo_rights_status,
      },
      confirmation: {
        id: confirmation.id,
        confirmed_at: confirmation.confirmed_at,
        text_version: confirmation.text_version,
      },
      slots,
    }
  })
}

export async function authorizePhotoUpload({ accessToken, slotId, pathname, allowReady = false }) {
  const access = await resolveDataRoomAccess(accessToken)
  const id = normalizeUuid(slotId, 'Upload-ID')
  const allowedStatus = allowReady
    ? `pp.upload_status IN ('pending', 'ready')`
    : `pp.upload_status = 'pending'`
  const { rows } = await query(
    `
      SELECT pp.*
      FROM property_photos pp
      JOIN properties p
        ON p.id = pp.property_id
       AND p.tenant_id = pp.tenant_id
      JOIN property_rights_confirmations prc
        ON prc.id = pp.rights_confirmation_id
       AND prc.tenant_id = pp.tenant_id
      WHERE pp.id = $1
        AND pp.tenant_id = $2
        AND ${allowedStatus}
        AND (pp.upload_status = 'ready' OR pp.expires_at > now())
        AND p.photo_rights_status = 'confirmed'
      LIMIT 1
    `,
    [id, access.tenant_id]
  )
  const slot = rows[0]
  if (!slot) throw new Error('Dieser Upload ist nicht mehr gültig.')
  if (pathname && pathname !== slot.expected_pathname) {
    throw new Error('Der Upload-Pfad ist ungültig.')
  }
  return slot
}

export async function getPhotoSlotForCompletion(slotId, pathname) {
  const id = normalizeUuid(slotId, 'Upload-ID')
  const { rows } = await query(
    `
      SELECT *
      FROM property_photos
      WHERE id = $1
        AND expected_pathname = $2
      LIMIT 1
    `,
    [id, String(pathname || '')]
  )
  return rows[0] || null
}

export async function markPhotoReady({ slotId, blob }) {
  const id = normalizeUuid(slotId, 'Upload-ID')
  const result = await query(
    `
      UPDATE property_photos
      SET blob_pathname = $2,
          blob_url = $3,
          content_type = $4,
          byte_size = $5,
          upload_status = 'ready',
          rejection_reason = NULL,
          uploaded_at = now()
      WHERE id = $1
        AND upload_status = 'pending'
      RETURNING *
    `,
    [id, blob.pathname, blob.url, blob.contentType, blob.size]
  )
  if (result.rows[0]) return result.rows[0]

  const existing = await query(`SELECT * FROM property_photos WHERE id = $1 LIMIT 1`, [id])
  if (existing.rows[0]?.upload_status === 'ready') return existing.rows[0]
  throw new Error('Dieser Upload kann nicht abgeschlossen werden.')
}

// The browser knows when a submission is over: it prepares the package, moves
// every file, and returns. Closing it is that one statement, made once, instead
// of being inferred from whichever file happened to finish last.
//
// Anything still pending at that point did not make it. The client already saw
// the error and moved on, so the slot is settled here rather than left to time
// out and reappear as an abandoned package hours later.
export async function closeSubmission({ accessToken, confirmationId }) {
  const access = await resolveDataRoomAccess(accessToken)
  const id = normalizeUuid(confirmationId, 'Bestätigungs-ID')

  return withTransaction(async (client) => {
    const claimed = await client.query(
      `
        UPDATE property_rights_confirmations
        SET closed_at = now(), closed_reason = 'client_submitted'
        WHERE id = $1
          AND tenant_id = $2
          AND closed_at IS NULL
        RETURNING id
      `,
      [id, access.tenant_id]
    )
    if (!claimed.rows[0]) return null

    await client.query(
      `
        UPDATE property_photos
        SET upload_status = 'rejected',
            rejection_reason = 'Upload wurde nicht abgeschlossen'
        WHERE rights_confirmation_id = $1
          AND tenant_id = $2
          AND upload_status = 'pending'
      `,
      [id, access.tenant_id]
    )
    return claimed.rows[0]
  })
}

// A browser that dies mid-submission never closes its package, and the photos
// that did arrive would otherwise sit unannounced forever: the only other
// cleanup runs inside prepare, which needs the same client to come back.
//
// Slots carry their own upload window, so an expired one is proof the transfer
// is not merely slow. A package whose slots have all expired is over.
export async function sweepAbandonedSubmissions() {
  if (!isDatabaseConfigured()) return { expired_slots: 0, closed_submissions: 0 }

  return withTransaction(async (client) => {
    const expired = await client.query(
      `
        UPDATE property_photos
        SET upload_status = 'rejected',
            rejection_reason = 'Upload-Zeitfenster abgelaufen'
        WHERE upload_status = 'pending'
          AND expires_at <= now()
        RETURNING id
      `
    )

    const closed = await client.query(
      `
        UPDATE property_rights_confirmations prc
        SET closed_at = now(), closed_reason = 'timed_out'
        WHERE prc.closed_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM property_photos pp
            WHERE pp.rights_confirmation_id = prc.id
              AND pp.upload_status = 'pending'
          )
        RETURNING prc.id
      `
    )

    return {
      expired_slots: expired.rows.length,
      closed_submissions: closed.rows.length,
    }
  })
}

// Claims the right to announce a closed package. Both the browser and the sweep
// can close one, and a retry can ask again, so the claim settles in the database
// instead of in whichever caller got there first.
export async function claimSubmissionNotice({ confirmationId = null, tenantId = null } = {}) {
  if (!isDatabaseConfigured()) return []
  const id = confirmationId ? normalizeUuid(confirmationId, 'Bestätigungs-ID') : null
  const { rows } = await query(
    `
      UPDATE property_rights_confirmations prc
      SET notified_at = now()
      FROM properties p
      JOIN tenants t ON t.id = p.tenant_id
      WHERE ($1::uuid IS NULL OR prc.id = $1::uuid)
        AND ($2::text IS NULL OR prc.tenant_id = $2::text)
        AND prc.closed_at IS NOT NULL
        AND prc.notified_at IS NULL
        AND p.id = prc.property_id
        AND p.tenant_id = prc.tenant_id
      RETURNING
        prc.id,
        prc.tenant_id,
        prc.property_id,
        prc.confirmed_by_name,
        prc.confirmed_by_email,
        prc.material_usage,
        prc.closed_reason,
        t.name AS tenant_name,
        p.title AS property_title,
        p.address_label,
        p.district,
        (
          SELECT count(*)::int FROM property_photos pp
          WHERE pp.rights_confirmation_id = prc.id AND pp.upload_status = 'ready'
        ) AS ready_count,
        (
          SELECT count(*)::int FROM property_photos pp
          WHERE pp.rights_confirmation_id = prc.id AND pp.upload_status = 'rejected'
        ) AS rejected_count
    `,
    [id, tenantId]
  )
  return rows
}

export async function rejectPhotoUpload(slotId, reason) {
  const id = normalizeUuid(slotId, 'Upload-ID')
  await query(
    `
      UPDATE property_photos
      SET upload_status = 'rejected',
          rejection_reason = $2
      WHERE id = $1
        AND upload_status = 'pending'
    `,
    [id, String(reason || 'Dateiprüfung fehlgeschlagen').slice(0, 500)]
  )
}

export async function cancelPhotoUploads({ accessToken, slotIds }) {
  const access = await resolveDataRoomAccess(accessToken)
  const ids = Array.isArray(slotIds)
    ? [...new Set(slotIds.map((slotId) => normalizeUuid(slotId, 'Upload-ID')))]
    : []
  if (ids.length === 0 || ids.length > DATA_ROOM_MAX_FILES) return []

  const result = await query(
    `
      UPDATE property_photos
      SET upload_status = 'rejected',
          rejection_reason = 'Upload vom Kunden abgebrochen'
      WHERE tenant_id = $1
        AND id = ANY($2::uuid[])
        AND upload_status = 'pending'
      RETURNING id, rights_confirmation_id
    `,
    [access.tenant_id, ids]
  )
  return result.rows
}
