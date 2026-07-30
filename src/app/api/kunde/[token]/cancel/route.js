import { NextResponse } from 'next/server'
import { assertDataRoomSameOrigin } from '@/lib/dataRoomRequest'
import { cancelPhotoUploads, claimCompletedSubmission } from '@/lib/dataRoomStore'
import { sendTelegramDataRoomSubmissionNotification } from '@/lib/telegram'

export const runtime = 'nodejs'

// Giving up on the remaining photos still leaves whatever already uploaded, and
// a client who delivered three of six and stopped is worth knowing about.
async function announceCompletedSubmissions(cancelled) {
  const confirmationIds = [...new Set(cancelled.map((slot) => slot.rights_confirmation_id))]
  for (const confirmationId of confirmationIds) {
    try {
      const submission = await claimCompletedSubmission(confirmationId)
      if (submission) await sendTelegramDataRoomSubmissionNotification(submission)
    } catch (error) {
      console.error('Data Room submission notice failed:', error?.message || 'unknown')
    }
  }
}

export async function POST(request, { params }) {
  try {
    assertDataRoomSameOrigin(request)
    const { token } = await params
    const input = await request.json()
    const cancelled = await cancelPhotoUploads({
      accessToken: token,
      slotIds: input.slotIds,
    })
    await announceCompletedSubmissions(cancelled)
    return NextResponse.json({ cancelled: cancelled.map((slot) => slot.id) })
  } catch (error) {
    console.error('Data Room cancellation failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json({ error: 'Upload konnte nicht abgebrochen werden.' }, { status: 400 })
  }
}
