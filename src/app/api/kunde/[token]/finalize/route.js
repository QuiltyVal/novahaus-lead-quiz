import { NextResponse } from 'next/server'
import {
  DataRoomBlobValidationError,
  deleteDataRoomBlob,
  inspectDataRoomBlob,
} from '@/lib/dataRoomBlob'
import { assertDataRoomSameOrigin, dataRoomErrorMessage } from '@/lib/dataRoomRequest'
import {
  authorizePhotoUpload,
  claimCompletedSubmission,
  markPhotoReady,
  rejectPhotoUpload,
} from '@/lib/dataRoomStore'
import { sendTelegramDataRoomSubmissionNotification } from '@/lib/telegram'

export const runtime = 'nodejs'

// The client is done once this was the last outstanding photo. Announcing it
// must never turn a successful upload into a failed one, so a broken notifier
// is logged and swallowed -- the material is already stored either way.
async function announceCompletedSubmission(rightsConfirmationId) {
  try {
    const submission = await claimCompletedSubmission(rightsConfirmationId)
    if (submission) await sendTelegramDataRoomSubmissionNotification(submission)
  } catch (error) {
    console.error('Data Room submission notice failed:', error?.message || 'unknown')
  }
}

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
      // A retry of an already finished photo. The claim is idempotent, so this
      // doubles as a second chance for a submission whose notice never went out.
      await announceCompletedSubmission(slot.rights_confirmation_id)
      return NextResponse.json({ photo: slot })
    }

    const blob = await inspectDataRoomBlob(slot)
    const photo = await markPhotoReady({ slotId: slot.id, blob })
    await announceCompletedSubmission(photo.rights_confirmation_id)
    return NextResponse.json({ photo })
  } catch (error) {
    if (slot && error instanceof DataRoomBlobValidationError) {
      await deleteDataRoomBlob(slot.expected_pathname).catch(() => {})
      await rejectPhotoUpload(slot.id, error.message).catch(() => {})
      // Rejecting the last outstanding photo also completes the submission.
      await announceCompletedSubmission(slot.rights_confirmation_id)
    }
    console.error('Data Room finalization failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json(
      { error: dataRoomErrorMessage(error) },
      { status: error instanceof DataRoomBlobValidationError ? 400 : 500 }
    )
  }
}
