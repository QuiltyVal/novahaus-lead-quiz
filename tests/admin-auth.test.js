import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSession,
  verifyAdminSession,
} from '../src/lib/adminSession'
import { middleware } from '../src/middleware'
import * as loginRoute from '../src/app/admin/login/submit/route.js'
import * as logoutRoute from '../src/app/admin/logout/route.js'

function adminRequest(path, { accept = 'text/html', method = 'GET', sessionValue } = {}) {
  const url = new URL(path, 'https://example.com')

  return {
    url: url.toString(),
    nextUrl: url,
    method,
    headers: new Headers({ accept, host: url.host }),
    cookies: {
      get(name) {
        return name === ADMIN_SESSION_COOKIE && sessionValue
          ? { name, value: sessionValue }
          : undefined
      },
    },
  }
}

describe('admin session signing', () => {
  it('rejects a session signed with a different secret', async () => {
    const signingSecret = crypto.randomUUID()
    const otherSecret = crypto.randomUUID()
    const session = await createAdminSession(signingSecret)

    await expect(verifyAdminSession(session.value, otherSecret)).resolves.toBe(false)
  })

  it('rejects an expired session', async () => {
    const secret = crypto.randomUUID()
    const now = Date.now()
    const session = await createAdminSession(secret, now)
    const afterExpiry = now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000 + 1

    await expect(verifyAdminSession(session.value, secret, afterExpiry)).resolves.toBe(false)
  })

  it('rejects a session with a changed signature', async () => {
    const secret = crypto.randomUUID()
    const session = await createAdminSession(secret)
    const replacement = session.value.endsWith('0') ? '1' : '0'
    const tamperedValue = `${session.value.slice(0, -1)}${replacement}`

    await expect(verifyAdminSession(tamperedValue, secret)).resolves.toBe(false)
  })
})

describe('admin login form', () => {
  const form = readFileSync(
    new URL('../src/components/admin/AdminLoginForm.jsx', import.meta.url),
    'utf8'
  )

  it('uses a browser-visible POST form and password-manager field names', () => {
    expect(form).toMatch(/<form[^>]*method="post"/)
    expect(form).toMatch(/name="username"[\s\S]*?autoComplete="username"/)
    expect(form).toMatch(/type="password"[\s\S]*?name="password"[\s\S]*?autoComplete="current-password"/)
    expect(form).not.toContain('fetch(')
  })
})

describe('admin login and logout routes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sets the signed 30-day cookie after a valid form submission', async () => {
    const username = crypto.randomUUID()
    const secret = crypto.randomUUID()
    vi.stubEnv('ADMIN_USERNAME', username)
    vi.stubEnv('ADMIN_PASSWORD', secret)
    const formData = new FormData()
    formData.set('username', username)
    formData.set('password', secret)

    const response = await loginRoute.POST(new Request(
      'https://example.com/admin/login/submit',
      { method: 'POST', body: formData }
    ))
    const cookie = response.cookies.get(ADMIN_SESSION_COOKIE)
    const setCookie = response.headers.get('set-cookie').toLowerCase()

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://example.com/admin')
    expect(cookie.value).toMatch(/^\d+\.[a-f0-9]{64}$/)
    await expect(verifyAdminSession(cookie.value, secret)).resolves.toBe(true)
    expect(setCookie).toContain('httponly')
    expect(setCookie).toContain('secure')
    expect(setCookie).toContain('samesite=lax')
    expect(setCookie).toContain('path=/')
    expect(setCookie).toContain(`max-age=${ADMIN_SESSION_MAX_AGE_SECONDS}`)
  })

  it('redirects a failed login without revealing which field was wrong', async () => {
    const username = crypto.randomUUID()
    vi.stubEnv('ADMIN_USERNAME', username)
    vi.stubEnv('ADMIN_PASSWORD', crypto.randomUUID())
    const formData = new FormData()
    formData.set('username', username)
    formData.set('password', crypto.randomUUID())

    const response = await loginRoute.POST(new Request(
      'https://example.com/admin/login/submit',
      { method: 'POST', body: formData }
    ))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://example.com/admin/login?error=1')
    expect(response.cookies.get(ADMIN_SESSION_COOKIE)).toBeUndefined()
  })

  it('clears the session cookie on logout', async () => {
    const response = await logoutRoute.POST(new Request(
      'https://example.com/admin/logout',
      { method: 'POST' }
    ))
    const setCookie = response.headers.get('set-cookie').toLowerCase()

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://example.com/admin/login')
    expect(setCookie).toContain(`${ADMIN_SESSION_COOKIE}=`)
    expect(setCookie).toContain('max-age=0')
  })
})

describe('admin middleware authentication responses', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lets the login page and its submit route through without a session', async () => {
    vi.stubEnv('ADMIN_PASSWORD', crypto.randomUUID())

    const pageResponse = await middleware(adminRequest('/admin/login'))
    const submitResponse = await middleware(adminRequest('/admin/login/submit'))

    expect(pageResponse.headers.get('x-middleware-next')).toBe('1')
    expect(submitResponse.headers.get('x-middleware-next')).toBe('1')
  })

  it('rewrites the public login POST to its non-conflicting route handler', async () => {
    vi.stubEnv('ADMIN_PASSWORD', crypto.randomUUID())

    const response = await middleware(adminRequest(
      '/admin/login',
      { method: 'POST' }
    ))

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://example.com/admin/login/submit'
    )
  })

  it('returns JSON 401 instead of redirecting a non-HTML request', async () => {
    vi.stubEnv('ADMIN_PASSWORD', crypto.randomUUID())

    const response = await middleware(adminRequest(
      '/admin/objects/example/videos/upload',
      { accept: 'application/json' }
    ))

    expect(response.status).toBe(401)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('content-type')).toContain('application/json')
    await expect(response.json()).resolves.toEqual({ error: 'Authentication required' })
  })

  it('redirects an unauthenticated HTML navigation with status 303', async () => {
    vi.stubEnv('ADMIN_PASSWORD', crypto.randomUUID())

    const response = await middleware(adminRequest('/admin/objects'))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://example.com/admin/login')
  })

  it('lets a valid signed session through', async () => {
    const secret = crypto.randomUUID()
    vi.stubEnv('ADMIN_PASSWORD', secret)
    const session = await createAdminSession(secret)

    const response = await middleware(adminRequest(
      '/admin/objects',
      { sessionValue: session.value }
    ))

    expect(response.headers.get('x-middleware-next')).toBe('1')
  })
})

describe('admin requests after a session ends', () => {
  const helper = readFileSync(
    new URL('../src/lib/adminFetch.js', import.meta.url),
    'utf8'
  )

  it('sends the operator to the login page instead of printing the 401', () => {
    expect(helper).toContain('response.status === 401')
    expect(helper).toContain("window.location.assign('/admin/login')")
  })

  it('is used by every admin call, so no screen can strand on a dead session', () => {
    for (const file of [
      '../src/components/admin/DataRoomAccessManager.jsx',
      '../src/components/admin/VideoForReviewForm.jsx',
    ]) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(source).toContain('adminFetch')
      expect(source).not.toMatch(/await fetch\(/)
    }
  })
})
