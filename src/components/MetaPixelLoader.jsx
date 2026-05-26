'use client'

import { useEffect, useState, useRef } from 'react'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '915201874369045'

/**
 * Loads the Meta Pixel script ONLY after the user grants marketing consent.
 * Listens for the 'consent-granted' custom event from CookieConsent,
 * and also checks on mount in case consent was given in a previous session.
 */
export default function MetaPixelLoader() {
  const [loaded, setLoaded] = useState(false)
  const initRef = useRef(false)

  useEffect(() => {
    if (!PIXEL_ID) {
      console.warn('⚠️ Meta Pixel: No PIXEL_ID configured')
      return
    }

    const loadPixel = () => {
      if (initRef.current) return
      initRef.current = true

      // Inject fbevents.js
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        }
        if (!f._fbq) f._fbq = n
        n.push = n
        n.loaded = !0
        n.version = '2.0'
        n.queue = []
        t = b.createElement(e)
        t.async = !0
        t.src = v
        s = b.getElementsByTagName(e)[0]
        s.parentNode.insertBefore(t, s)
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

      window.fbq('init', PIXEL_ID)
      window.fbq('track', 'PageView')
      setLoaded(true)
      console.log(`✅ Meta Pixel loaded — ID: ${PIXEL_ID}`)
    }

    // Check if consent was already given (returning visitor)
    const consent = localStorage.getItem('novahaus_cookie_consent')
    if (consent === 'all') {
      loadPixel()
    }

    // Listen for fresh consent
    const onConsent = () => loadPixel()
    window.addEventListener('consent-granted', onConsent)
    return () => window.removeEventListener('consent-granted', onConsent)
  }, [])

  // noscript fallback — only if consent was given
  if (!PIXEL_ID || !loaded) return null

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  )
}
