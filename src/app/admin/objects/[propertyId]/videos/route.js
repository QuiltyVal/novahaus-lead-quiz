import { randomUUID } from 'node:crypto'
import { head } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/adminRequest'
import { query } from '@/lib/db'
import { openVideoForReview } from '@/lib/videoReviewStore'
import {
  isVideoReviewPathname,
  validateVideoDescriptor,
} from '@/lib/videoReviewUpload'

export const runtime = 'nodejs'

function validateTitle(value) {
  const title = String(value || '').trim()
  if (!title) throw new Error('Ein Titel ist erforderlich.')
  if (title.length > 240) throw new Error('Der Titel ist zu lang.')
  return title
}

async function createReadyVideo({ tenantId, title }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reelCode = `kundenvideo-${randomUUID()}`
    const result = await query(
      `
        INSERT INTO videos (
          tenant_id, reel_code, title, purpose, format_slug, status
        )
        VALUES ($1, $2, $3, 'property', 'kundenvideo', 'ready')
        ON CONFLICT (tenant_id, reel_code) DO NOTHING
        RETURNING id, tenant_id, reel_code, title, purpose, format_slug, status
      `,
      [tenantId, reelCode, title]
    )
    if (result.rows[0]) return result.rows[0]
  }

  throw new Error('Für das Video konnte keine eindeutige Kennung erzeugt werden.')
}

export async function POST(request, { params }) {
  try {
    assertSameOrigin(request)
    const { propertyId } = await params
    const body = await request.json()
    const title = validateTitle(body?.title)

    const propertyResult = await query(
      `
        SELECT id, tenant_id
        FROM properties
        WHERE id = $1 AND status <> 'archived'
        LIMIT 1
      `,
      [propertyId]
    )
    const property = propertyResult.rows[0]
    if (!property) throw new Error('Das Objekt wurde nicht gefunden.')

    const pathname = String(body?.blob?.pathname || '')
    if (!isVideoReviewPathname(pathname, {
      tenantId: property.tenant_id,
      propertyId: property.id,
    })) {
      throw new Error('Der Speicherpfad des Videos ist ungültig.')
    }

    const blob = await head(pathname)
    if (blob.pathname !== pathname) throw new Error('Das hochgeladene Video wurde nicht gefunden.')
    validateVideoDescriptor({
      name: blob.pathname,
      type: blob.contentType,
      size: blob.size,
    })

    const video = await createReadyVideo({
      tenantId: property.tenant_id,
      title,
    })
    const review = await openVideoForReview({
      videoId: video.id,
      tenantId: property.tenant_id,
      propertyId: property.id,
      blob,
    })

    return NextResponse.json({ video: { ...video, ...review } }, { status: 201 })
  } catch (error) {
    console.error('Admin video review creation failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json(
      { error: error?.message || 'Das Video konnte nicht gespeichert werden.' },
      { status: 400 }
    )
  }
}
