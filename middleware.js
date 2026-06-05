import { NextResponse } from 'next/server'

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="NovaHaus Admin"',
    },
  })
}

function parseBasicAuth(header) {
  if (!header?.startsWith('Basic ')) return null

  try {
    const decoded = atob(header.slice(6))
    const separatorIndex = decoded.indexOf(':')
    if (separatorIndex === -1) return null

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    }
  } catch {
    return null
  }
}

export function middleware(request) {
  const adminPassword = process.env.ADMIN_PASSWORD || ''

  if (!adminPassword) {
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.next()
    }

    return new NextResponse('Admin is disabled. Set ADMIN_PASSWORD to enable it.', {
      status: 503,
    })
  }

  const expectedUsername = process.env.ADMIN_USERNAME || 'admin'
  const credentials = parseBasicAuth(request.headers.get('authorization'))

  if (
    !credentials ||
    credentials.username !== expectedUsername ||
    credentials.password !== adminPassword
  ) {
    return unauthorized()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}

