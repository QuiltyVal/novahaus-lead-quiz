import { handleUpload } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import {
  DataRoomBlobValidationError,
  deleteDataRoomBlob,
  inspectDataRoomBlob,
} from '@/lib/dataRoomBlob'
import {
  authorizePhotoUpload,
  getPhotoSlotForCompletion,
  markPhotoReady,
  rejectPhotoUpload,
} from '@/lib/dataRoomStore'
import { DATA_ROOM_MAX_FILE_SIZE } from '@/lib/dataRoomValidation'

export const runtime = 'nodejs'

function parseSlotPayload(value) {
  let parsed
  try {
    parsed = JSON.parse(value || '{}')
  } catch {
    throw new Error('Der Upload-Auftrag ist ungültig.')
  }
  return String(parsed.slotId || '')
}

export async function POST(request, { params }) {
  try {
    const { token } = await params
    const body = await request.json()
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const slotId = parseSlotPayload(clientPayload)
        const slot = await authorizePhotoUpload({
          accessToken: token,
          slotId,
          pathname,
        })
        return {
          allowedContentTypes: [slot.content_type],
          maximumSizeInBytes: DATA_ROOM_MAX_FILE_SIZE,
          validUntil: Math.min(
            new Date(slot.expires_at).getTime(),
            Date.now() + 15 * 60 * 1000
          ),
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ slotId: slot.id }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const slotId = parseSlotPayload(tokenPayload)
        const slot = await getPhotoSlotForCompletion(slotId, blob.pathname)
        if (!slot || slot.upload_status === 'ready') return
        if (slot.upload_status !== 'pending') {
          await deleteDataRoomBlob(blob.pathname).catch(() => {})
          return
        }

        try {
          const verifiedBlob = await inspectDataRoomBlob(slot)
          await markPhotoReady({ slotId, blob: verifiedBlob })
        } catch (error) {
          if (!(error instanceof DataRoomBlobValidationError)) throw error
          await deleteDataRoomBlob(blob.pathname).catch(() => {})
          await rejectPhotoUpload(slotId, error.message)
        }
      },
    })
    return NextResponse.json(response)
  } catch (error) {
    console.error('Data Room Blob handler failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json(
      { error: 'Der Datei-Upload wurde abgelehnt.' },
      { status: 400 }
    )
  }
}
