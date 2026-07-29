import { NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/adminRequest'
import {
  createTenantAccessToken,
  revokeTenantAccessToken,
} from '@/lib/dataRoomStore'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const input = await request.json()
    const result = await createTenantAccessToken(input.tenantId)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Admin Data Room token creation failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json(
      { error: 'Data-Room-Link konnte nicht erstellt werden.' },
      { status: 400 }
    )
  }
}

export async function DELETE(request) {
  try {
    assertSameOrigin(request)
    const input = await request.json()
    const record = await revokeTenantAccessToken(input.tokenId)
    return NextResponse.json({ record })
  } catch (error) {
    console.error('Admin Data Room token revocation failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json(
      { error: 'Data-Room-Link konnte nicht widerrufen werden.' },
      { status: 400 }
    )
  }
}
