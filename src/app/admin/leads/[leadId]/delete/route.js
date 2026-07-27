import { NextResponse } from 'next/server'
import { deleteLeadRecord } from '@/lib/leadStore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request, { params }) {
  const leadId = params.leadId

  try {
    const result = await deleteLeadRecord(leadId)

    if (result.reason === 'database_not_configured') {
      return NextResponse.json({ error: 'database_not_configured' }, { status: 503 })
    }

    if (!result.deleted) {
      return NextResponse.json({ error: 'lead_not_found' }, { status: 404 })
    }

    return NextResponse.redirect(new URL('/admin/leads', request.url), { status: 303 })
  } catch (error) {
    console.error(`Lead deletion failed: lead_id=${leadId} message=${error.message}`)
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }
}
