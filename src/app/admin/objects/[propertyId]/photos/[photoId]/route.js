import { get } from '@vercel/blob'
import { getDataRoomBlobAccess } from '@/lib/dataRoomBlob'
import { query } from '@/lib/db'

export const runtime = 'nodejs'

function safeDownloadName(value) {
  return String(value || 'foto')
    .replace(/[\r\n"]/g, '')
    .replace(/[^\p{L}\p{N}._ -]/gu, '_')
    .slice(0, 180)
}

export async function GET(_request, { params }) {
  try {
    const { propertyId, photoId } = await params
    const result = await query(
      `
        SELECT blob_pathname, original_filename, content_type
        FROM property_photos
        WHERE id = $1
          AND property_id = $2
          AND upload_status = 'ready'
        LIMIT 1
      `,
      [photoId, propertyId]
    )
    const photo = result.rows[0]
    if (!photo) return new Response('Not found', { status: 404 })

    const blob = await get(photo.blob_pathname, { access: getDataRoomBlobAccess() })
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(blob.stream, {
      headers: {
        'Content-Type': photo.content_type,
        'Content-Disposition': `attachment; filename="${safeDownloadName(photo.original_filename)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Admin photo download failed:', error?.code || error?.name || 'unknown')
    return new Response('Not found', { status: 404 })
  }
}
