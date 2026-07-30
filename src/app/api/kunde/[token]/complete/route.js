import { NextResponse } from 'next/server'
import { assertDataRoomSameOrigin, dataRoomErrorMessage } from '@/lib/dataRoomRequest'
import {
  claimSubmissionNotice,
  closeSubmission,
  resolveDataRoomAccess,
} from '@/lib/dataRoomStore'
import { sendTelegramDataRoomSubmissionNotification } from '@/lib/telegram'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  try {
    assertDataRoomSameOrigin(request)
    const { token } = await params
    const input = await request.json()

    // The claim is scoped to the caller's tenant as well as the package: the id
    // arrives from the browser, and a guessed one must not be able to announce
    // somebody else's submission ahead of time.
    const access = await resolveDataRoomAccess(token)
    const closed = await closeSubmission({
      accessToken: token,
      confirmationId: input.confirmationId,
    })

    // Announcing must not turn a delivered submission into a failed one: the
    // material is already stored, and a broken notifier is the operator's
    // problem, not something to show the client.
    try {
      const submissions = await claimSubmissionNotice({
        confirmationId: input.confirmationId,
        tenantId: access.tenant_id,
      })
      for (const submission of submissions) {
        await sendTelegramDataRoomSubmissionNotification(submission)
      }
    } catch (error) {
      console.error('Data Room submission notice failed:', error?.message || 'unknown')
    }

    return NextResponse.json({ closed: Boolean(closed) })
  } catch (error) {
    console.error('Data Room completion failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json({ error: dataRoomErrorMessage(error) }, { status: 400 })
  }
}
