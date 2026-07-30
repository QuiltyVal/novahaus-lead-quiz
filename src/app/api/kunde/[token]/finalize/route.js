import { NextResponse } from 'next/server'
import {
  DataRoomBlobValidationError,
  deleteDataRoomBlob,
  inspectDataRoomBlob,
} from '@/lib/dataRoomBlob'
import { assertDataRoomSameOrigin, dataRoomErrorMessage } from '@/lib/dataRoomRequest'
import {
  authorizePhotoUpload,
  markPhotoReady,
  rejectPhotoUpload,
} from '@/lib/dataRoomStore'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  let slot
  try {
    assertDataRoomSameOrigin(request)
    const { token } = await params
    const input = await request.json()
    slot = await authorizePhotoUpload({
      accessToken: token,
      slotId: input.slotId,
      allowReady: true,
    })

    if (slot.upload_status === 'ready') {
      return NextResponse.json({ photo: slot })
    }

    const blob = await inspectDataRoomBlob(slot)
    const photo = await markPhotoReady({ slotId: slot.id, blob })
    return NextResponse.json({ photo })
  } catch (error) {
    if (slot && error instanceof DataRoomBlobValidationError) {
      await deleteDataRoomBlob(slot.expected_pathname).catch(() => {})
      await rejectPhotoUpload(slot.id, error.message).catch(() => {})
    }
    console.error('Data Room finalization failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json(
      { error: dataRoomErrorMessage(error) },
      { status: error instanceof DataRoomBlobValidationError ? 400 : 500 }
    )
  }
}
