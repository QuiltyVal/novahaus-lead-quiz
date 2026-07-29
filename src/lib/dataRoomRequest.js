export function assertDataRoomSameOrigin(request) {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')

  if (origin && origin !== requestUrl.origin) throw new Error('Die Anfrage wurde blockiert.')
  if (fetchSite === 'cross-site') throw new Error('Die Anfrage wurde blockiert.')
}

export function dataRoomErrorMessage(error) {
  const message = String(error?.message || '')
  const safeStarts = [
    'Bitte ',
    'Die ',
    'Der ',
    'Das ',
    'Eine ',
    'Ein ',
    'Für ',
    'Pro ',
  ]
  if (safeStarts.some((prefix) => message.startsWith(prefix))) return message
  if (/^[^:]{1,255}: (Nur|Die Datei)/.test(message)) return message
  return 'Speichern fehlgeschlagen. Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.'
}
