import { NextResponse } from 'next/server'
import { claimSubmissionNotice, sweepAbandonedSubmissions } from '@/lib/dataRoomStore'
import { sendTelegramDataRoomSubmissionNotification } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Vercel signs its cron requests with CRON_SECRET when the variable is set.
// The sweep only settles upload slots that already expired -- something prepare
// does anyway -- so it stays reachable while the secret is not configured yet,
// rather than silently doing nothing in production.
function authorized(request) {
  const secret = process.env.CRON_SECRET || ''
  if (!secret) return true
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const swept = await sweepAbandonedSubmissions()
    const submissions = await claimSubmissionNotice()

    for (const submission of submissions) {
      try {
        await sendTelegramDataRoomSubmissionNotification(submission)
      } catch (error) {
        console.error('Data Room submission notice failed:', error?.message || 'unknown')
      }
    }

    return NextResponse.json({ ...swept, announced: submissions.length })
  } catch (error) {
    console.error('Data Room sweep failed:', error?.message || 'unknown')
    return NextResponse.json({ error: 'sweep_failed' }, { status: 500 })
  }
}
