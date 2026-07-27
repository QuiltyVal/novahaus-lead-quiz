import { NextResponse } from 'next/server'

export function assertSameOrigin(request) {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')

  if (origin && origin !== requestUrl.origin) throw new Error('Cross-origin admin request blocked')
  if (fetchSite === 'cross-site') throw new Error('Cross-site admin request blocked')
}

export function adminRedirect(request, path, params = {}) {
  const url = new URL(path, request.url)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return NextResponse.redirect(url, { status: 303 })
}

export function adminErrorMessage(error) {
  if (error?.code === '23505') return 'Diese ID, URL oder Bezeichnung existiert bereits.'
  if (error?.code === '23503') return 'Die ausgewählte Verknüpfung existiert nicht.'
  if (error?.code === '22P02') return 'Eine technische ID ist ungültig.'

  const message = String(error?.message || '')
  const safePrefixes = [
    'client ',
    'project ',
    'object ',
    'Instagram ',
    'Content ',
    'Property ',
    'Every ',
    'Metric ',
    'Enter ',
    'Use ',
    'Cross-',
    'value ',
  ]
  if (safePrefixes.some((prefix) => message.startsWith(prefix))) return message
  return 'Speichern fehlgeschlagen. Bitte Eingaben prüfen.'
}
