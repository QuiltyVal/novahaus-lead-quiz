import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from './lib/adminSession'

export async function middleware(request) {
  const adminPassword = process.env.ADMIN_PASSWORD || ''
  const host = request.headers.get('host') || ''
  const isLocalhost = host.startsWith('localhost:') || host.startsWith('127.0.0.1:')

  if (!adminPassword) {
    if (isLocalhost) {
      return NextResponse.next()
    }

    return new NextResponse('Admin is disabled. Set ADMIN_PASSWORD to enable it.', {
      status: 503,
    })
  }

  const pathname = request.nextUrl.pathname
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    if (request.method === 'POST') {
      return NextResponse.rewrite(new URL('/admin/login/submit', request.url))
    }

    return NextResponse.next()
  }

  if (pathname === '/admin/login/submit' || pathname === '/admin/login/submit/') {
    return NextResponse.next()
  }

  const sessionValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const sessionIsValid = await verifyAdminSession(sessionValue, adminPassword)

  if (!sessionIsValid) {
    const acceptsHtml = (request.headers.get('accept') || '').toLowerCase().includes('text/html')
    if (!acceptsHtml) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    return NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
