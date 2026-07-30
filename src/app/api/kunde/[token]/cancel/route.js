import { NextResponse } from 'next/server'
import { assertDataRoomSameOrigin } from '@/lib/dataRoomRequest'
import { cancelPhotoUploads } from '@/lib/dataRoomStore'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  try {
    assertDataRoomSameOrigin(request)
    const { token } = await params
    const input = await request.json()
    const cancelled = await cancelPhotoUploads({
      accessToken: token,
      slotIds: input.slotIds,
    })
    return NextResponse.json({ cancelled: cancelled.map((slot) => slot.id) })
  } catch (error) {
    console.error('Data Room cancellation failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json({ error: 'Upload konnte nicht abgebrochen werden.' }, { status: 400 })
  }
}
