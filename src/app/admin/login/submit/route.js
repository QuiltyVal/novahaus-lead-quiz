import { NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  constantTimeEqual,
  createAdminSession,
} from '@/lib/adminSession'

function loginRedirect(request, path) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 })
}

export async function POST(request) {
  const adminPassword = process.env.ADMIN_PASSWORD || ''
  const expectedUsername = process.env.ADMIN_USERNAME || 'admin'

  try {
    const formData = await request.formData()
    const username = String(formData.get('username') || '')
    const password = String(formData.get('password') || '')
    const passwordMatches = adminPassword
      ? await constantTimeEqual(password, adminPassword)
      : false

    if (username !== expectedUsername || !passwordMatches) {
      return loginRedirect(request, '/admin/login?error=1')
    }

    const session = await createAdminSession(adminPassword)
    const response = loginRedirect(request, '/admin')
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: session.value,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      expires: new Date(session.expiresAt),
    })
    return response
  } catch {
    return loginRedirect(request, '/admin/login?error=1')
  }
}
