/**
 * Tracking utilities — Meta Pixel (browser) + CAPI (server)
 *
 * Uses a shared event_id for deduplication between
 * browser-side Pixel events and server-side CAPI events.
 *
 * GDPR: All tracking is gated behind cookie consent.
 * No Pixel fires and no CAPI calls are made until the user
 * clicks "Alle akzeptieren" in the cookie banner.
 */

/* ============================================
   Consent check
   ============================================ */
function hasMarketingConsent() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('novahaus_cookie_consent') === 'all'
}

/* ============================================
   Event ID for deduplication
   ============================================ */
function generateEventId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10)
}

/* ============================================
   Cookie helper (for _fbc, _fbp)
   ============================================ */
function getCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

/* ============================================
   Meta Pixel — browser-side
   ============================================ */
function firePixelEvent(eventName, params = {}, eventId = null) {
  if (typeof window === 'undefined' || typeof window.fbq === 'undefined') return
  const options = eventId ? { eventID: eventId } : {}
  window.fbq('track', eventName, params, options)
}

/* ============================================
   CAPI — server-side via Next.js API Route
   ============================================ */
async function sendCAPIEvent(eventName, eventData = {}, eventId = null) {
  // Guard: only run in the browser
  if (typeof window === 'undefined') return

  try {
    const payload = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId || generateEventId(),
      event_source_url: window.location.href,
      action_source: 'website',
      user_data: {
        client_user_agent: navigator.userAgent,
        fbc: getCookie('_fbc') || null,
        fbp: getCookie('_fbp') || null,
        fn: eventData.firstName || null,
        ln: eventData.lastName || null,
        em: eventData.email || null,
        ph: eventData.phone || null,
      },
      custom_data: eventData.custom || {},
    }

    await fetch('/api/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('CAPI event error:', err)
  }
}

/* ============================================
   Combined: Pixel + CAPI (with deduplication)
   GDPR-gated — only fires if consent given
   ============================================ */
export function trackEvent(eventName, params = {}, userData = {}) {
  if (typeof window === 'undefined') return

  // ── GDPR gate ──
  if (!hasMarketingConsent()) {
    console.log(`🔒 Tracking blocked (no consent): ${eventName}`)
    return
  }

  const eventId = generateEventId()
  // 1. Browser-side Pixel
  firePixelEvent(eventName, params, eventId)
  // 2. Server-side CAPI
  sendCAPIEvent(eventName, { ...userData, custom: params }, eventId)
}
