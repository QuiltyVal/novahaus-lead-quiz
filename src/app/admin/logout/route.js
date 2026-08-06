import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession'

export async function POST(request) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 })
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
  return response
}
