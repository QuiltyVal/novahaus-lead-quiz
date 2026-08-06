import { handleUpload } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/adminRequest'
import { query } from '@/lib/db'
import {
  isVideoReviewPathname,
  VIDEO_REVIEW_CONTENT_TYPE,
  VIDEO_REVIEW_MAX_FILE_SIZE,
} from '@/lib/videoReviewUpload'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  try {
    assertSameOrigin(request)
    const { propertyId } = await params
    const body = await request.json()
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
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
        if (!isVideoReviewPathname(pathname, {
          tenantId: property.tenant_id,
          propertyId: property.id,
        })) {
          throw new Error('Der Speicherpfad des Videos ist ungültig.')
        }

        return {
          allowedContentTypes: [VIDEO_REVIEW_CONTENT_TYPE],
          maximumSizeInBytes: VIDEO_REVIEW_MAX_FILE_SIZE,
          validUntil: Date.now() + 15 * 60 * 1000,
          addRandomSuffix: false,
          allowOverwrite: false,
        }
      },
    })
    return NextResponse.json(response)
  } catch (error) {
    console.error('Admin video Blob handler failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json(
      { error: 'Der Video-Upload wurde abgelehnt.' },
      { status: 400 }
    )
  }
}
