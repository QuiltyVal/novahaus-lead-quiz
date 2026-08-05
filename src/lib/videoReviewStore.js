import { isDatabaseConfigured, query, withTransaction } from '@/lib/db'
import { resolveDataRoomAccess } from '@/lib/dataRoomStore'
import { validateVideoDecision } from '@/lib/videoReviewValidation'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeUuid(value, field) {
  const normalized = String(value || '').trim()
  if (!UUID_PATTERN.test(normalized)) throw new Error(`${field} ist ungültig.`)
  return normalized
}

// Only reels that are actually watchable are listed: a row without a stored file
// would render as a broken player, and the client would blame the product.
export async function getVideoReview(accessToken) {
  const access = await resolveDataRoomAccess(accessToken)
  const { rows } = await query(
    `
      SELECT
        p.id AS property_id,
        p.title AS property_title,
        p.address_label,
        p.district,
        COALESCE(video_list.videos, '[]'::json) AS videos
      FROM properties p
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', v.id,
            'title', v.title,
            'reel_code', v.reel_code,
            'preview_url', v.preview_blob_url,
            'review_status', v.client_review_status,
            'updated_at', v.updated_at,
            'last_note', latest.note,
            'decided_at', latest.decided_at
          )
          ORDER BY v.updated_at DESC
        ) AS videos
        FROM videos v
        LEFT JOIN LATERAL (
          SELECT va.note, va.decided_at
          FROM video_approvals va
          WHERE va.video_id = v.id AND va.tenant_id = v.tenant_id
          ORDER BY va.decided_at DESC
          LIMIT 1
        ) latest ON true
        WHERE v.property_id = p.id
          AND v.tenant_id = p.tenant_id
          AND v.client_review_status <> 'not_requested'
          AND v.preview_blob_url IS NOT NULL
      ) video_list ON true
      WHERE p.tenant_id = $1
        AND p.status <> 'archived'
        AND EXISTS (
          SELECT 1 FROM videos v
          WHERE v.property_id = p.id
            AND v.tenant_id = p.tenant_id
            AND v.client_review_status <> 'not_requested'
            AND v.preview_blob_url IS NOT NULL
        )
      ORDER BY p.updated_at DESC, p.title ASC
    `,
    [access.tenant_id]
  )

  return {
    tenant: { id: access.tenant_id, name: access.tenant_name },
    properties: rows,
  }
}

// The decision is claimed with the same conditional update the rest of the
// platform uses: a double click, a retry, or a second tab must not turn one
// judgement into two rows of evidence.
export async function recordVideoDecision({ accessToken, input }) {
  const payload = validateVideoDecision(input)
  const access = await resolveDataRoomAccess(accessToken)
  const videoId = normalizeUuid(payload.videoId, 'Video-ID')

  return withTransaction(async (client) => {
    const claimed = await client.query(
      `
        UPDATE videos
        SET client_review_status = $3
        WHERE id = $1
          AND tenant_id = $2
          AND client_review_status = 'pending'
          AND property_id IS NOT NULL
          AND preview_blob_url IS NOT NULL
        RETURNING id, title, reel_code, property_id
      `,
      [videoId, access.tenant_id, payload.decision]
    )
    const video = claimed.rows[0]
    if (!video) return null

    const approval = await client.query(
      `
        INSERT INTO video_approvals (
          video_id, tenant_id, decision, note,
          decided_by_name, decided_by_email, text_version, decision_text
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, decision, note, decided_at
      `,
      [
        videoId,
        access.tenant_id,
        payload.decision,
        payload.note,
        payload.decidedByName,
        payload.decidedByEmail,
        payload.decisionTextVersion,
        payload.decisionText,
      ]
    )

    const property = await client.query(
      `SELECT title, address_label, district FROM properties WHERE id = $1 AND tenant_id = $2`,
      [video.property_id, access.tenant_id]
    )

    return {
      ...approval.rows[0],
      tenant_id: access.tenant_id,
      tenant_name: access.tenant_name,
      video_id: video.id,
      video_title: video.title,
      reel_code: video.reel_code,
      decided_by_name: payload.decidedByName,
      decided_by_email: payload.decidedByEmail,
      property_title: property.rows[0]?.title || null,
      address_label: property.rows[0]?.address_label || null,
      district: property.rows[0]?.district || null,
    }
  })
}

// Operator side: a reel only reaches the client once it has both an object and
// a stored file, so this is the single place that opens the review.
export async function openVideoForReview({ videoId, tenantId, propertyId, blob }) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL is not configured')
  const id = normalizeUuid(videoId, 'Video-ID')
  const property = normalizeUuid(propertyId, 'Objekt-ID')

  const result = await query(
    `
      UPDATE videos
      SET property_id = $3,
          preview_blob_pathname = $4,
          preview_blob_url = $5,
          client_review_status = 'pending'
      WHERE id = $1
        AND tenant_id = $2
        AND EXISTS (
          SELECT 1 FROM properties p
          WHERE p.id = $3 AND p.tenant_id = $2 AND p.status <> 'archived'
        )
      RETURNING id, property_id, client_review_status
    `,
    [id, tenantId, property, blob?.pathname || null, blob?.url || null]
  )
  if (!result.rows[0]) throw new Error('Das Video oder das Objekt wurde nicht gefunden.')
  return result.rows[0]
}
