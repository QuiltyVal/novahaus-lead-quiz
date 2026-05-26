'use client'

import { useEffect, useRef } from 'react'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || ''

/**
 * Loads Google Tag Manager only after marketing consent.
 * Add tags in GTM, not in this repo, so the site stays deploy-safe.
 */
export default function GoogleTagManagerLoader() {
  const initRef = useRef(false)

  useEffect(() => {
    if (!GTM_ID) return

    const loadGtm = () => {
      if (initRef.current) return
      initRef.current = true

      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js',
      })

      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`
      document.head.appendChild(script)

      console.log(`Google Tag Manager loaded: ${GTM_ID}`)
    }

    if (localStorage.getItem('novahaus_cookie_consent') === 'all') {
      loadGtm()
    }

    window.addEventListener('consent-granted', loadGtm)
    return () => window.removeEventListener('consent-granted', loadGtm)
  }, [])

  return null
}
