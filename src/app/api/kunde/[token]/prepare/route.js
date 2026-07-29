import { NextResponse } from 'next/server'
import { getDataRoomBlobAccess } from '@/lib/dataRoomBlob'
import { assertDataRoomSameOrigin, dataRoomErrorMessage } from '@/lib/dataRoomRequest'
import { prepareDataRoomUpload } from '@/lib/dataRoomStore'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  try {
    assertDataRoomSameOrigin(request)
    const { token } = await params
    const input = await request.json()
    const result = await prepareDataRoomUpload({ accessToken: token, input })
    return NextResponse.json({
      ...result,
      blobAccess: getDataRoomBlobAccess(),
    })
  } catch (error) {
    console.error('Data Room preparation failed:', error?.code || error?.name || 'unknown')
    return NextResponse.json(
      { error: dataRoomErrorMessage(error) },
      { status: 400 }
    )
  }
}
