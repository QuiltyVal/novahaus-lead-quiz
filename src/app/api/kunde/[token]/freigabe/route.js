import { NextResponse } from 'next/server'
import { assertDataRoomSameOrigin, dataRoomErrorMessage } from '@/lib/dataRoomRequest'
import { recordVideoDecision } from '@/lib/videoReviewStore'
import { sendTelegramVideoDecisionNotification } from '@/lib/telegram'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  try {
    assertDataRoomSameOrigin(request)
    const { token } = await params
    const input = await request.json()

    const decision = await recordVideoDecision({ accessToken: token, input })

    // A second submission for the same video claims nothing: the judgement is
    // already recorded, so the client sees success rather than an error they
    // cannot act on.
    if (!decision) return NextResponse.json({ recorded: false })

    // Telling the operator must not turn a recorded decision into a failed one.
    try {
      await sendTelegramVideoDecisionNotification(decision)
    } catch (error) {
      console.error('Video decision notice failed:', error?.message || 'unknown')
    }

    return NextResponse.json({
      recorded: true,
      decision: decision.decision,
      decided_at: decision.decided_at,
    })
  } catch (error) {
    console.error('Video decision failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json({ error: dataRoomErrorMessage(error) }, { status: 400 })
  }
}
