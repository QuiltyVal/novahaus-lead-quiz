'use client'

import { useState, useEffect, useCallback } from 'react'

const CONSENT_KEY = 'novahaus_cookie_consent'

/**
 * Reads the stored consent choice.
 * Returns 'all' | 'essential' | null
 */
export function getConsent() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CONSENT_KEY)
}

/**
 * Returns true if the user has accepted marketing/analytics cookies.
 */
export function hasMarketingConsent() {
  return getConsent() === 'all'
}

/**
 * Removes all Meta/Facebook cookies so the pixel is fully disabled.
 */
function clearTrackingCookies() {
  const fbCookies = ['_fbp', '_fbc', 'fr', 'datr', 'sb']
  fbCookies.forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
  })
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Only show banner if user hasn't decided yet
    if (!getConsent()) {
      setVisible(true)
    }

    // Listen for "open cookie settings" event (from footer link etc.)
    const onOpenSettings = () => {
      setVisible(true)
      setShowDetails(true)
    }
    window.addEventListener('open-cookie-settings', onOpenSettings)
    return () => window.removeEventListener('open-cookie-settings', onOpenSettings)
  }, [])

  const accept = useCallback((choice) => {
    const previousChoice = getConsent()
    localStorage.setItem(CONSENT_KEY, choice)
    setVisible(false)
    setShowDetails(false)

    if (choice === 'all') {
      // Grant tracking
      window.dispatchEvent(new CustomEvent('consent-granted'))
    } else if (previousChoice === 'all' && choice === 'essential') {
      // User revoked marketing consent — clear tracking cookies & reload
      clearTrackingCookies()
      window.dispatchEvent(new CustomEvent('consent-revoked'))
      // Reload to fully remove pixel scripts from memory
      window.location.reload()
    }
  }, [])

  // Current consent status text for the banner
  const currentConsent = getConsent()

  return (
    <>
      {/* Floating cookie button — always visible when banner is closed */}
      {!visible && (
        <button
          type="button"
          className="cookie-settings-fab"
          onClick={() => { setVisible(true); setShowDetails(true) }}
          aria-label="Cookie-Einstellungen öffnen"
          title="Cookie-Einstellungen"
        >
          🍪
        </button>
      )}

      {/* Cookie consent banner / settings dialog */}
      {visible && (
        <div className="cookie-overlay" role="dialog" aria-label="Cookie-Einstellungen">
          <div className="cookie-banner">
            <div className="cookie-banner-inner">
              <h3>🍪 Cookie-Einstellungen</h3>

              {currentConsent && (
                <p className="cookie-current-status">
                  Aktuelle Einstellung:{' '}
                  <strong>{currentConsent === 'all' ? 'Alle Cookies' : 'Nur essenzielle'}</strong>
                </p>
              )}

              <p>
                Wir verwenden Cookies und ähnliche Technologien, um Ihnen die bestmögliche
                Nutzungserfahrung zu bieten. Marketing-Cookies helfen uns, unsere Angebote zu
                verbessern. Sie können Ihre Einstellungen jederzeit ändern.
              </p>

              {showDetails && (
                <div className="cookie-details">
                  <div className="cookie-category">
                    <div className="cookie-cat-header">
                      <strong>Essenziell</strong>
                      <span className="cookie-always-on">Immer aktiv</span>
                    </div>
                    <p>
                      Notwendig für die Grundfunktionen der Website (Navigation, Formulare,
                      Sicherheit). Ohne diese Cookies kann die Website nicht ordnungsgemäß
                      funktionieren.
                    </p>
                  </div>
                  <div className="cookie-category">
                    <div className="cookie-cat-header">
                      <strong>Marketing &amp; Analyse</strong>
                      <span className="cookie-optional">Optional</span>
                    </div>
                    <p>
                      Meta Pixel &amp; Conversions API — werden verwendet, um die Effektivität
                      unserer Werbung zu messen und Ihnen relevante Inhalte anzuzeigen.
                      Diese Daten werden an Meta (Facebook) übermittelt.
                    </p>
                  </div>
                </div>
              )}

              <div className="cookie-actions">
                <button
                  className="cookie-btn cookie-btn--accept"
                  onClick={() => accept('all')}
                >
                  Alle akzeptieren
                </button>
                <button
                  className="cookie-btn cookie-btn--essential"
                  onClick={() => accept('essential')}
                >
                  Nur essenzielle
                </button>
                <button
                  className="cookie-btn cookie-btn--details"
                  onClick={() => setShowDetails((s) => !s)}
                >
                  {showDetails ? 'Weniger anzeigen' : 'Details anzeigen'}
                </button>
              </div>

              <p className="cookie-legal">
                Mehr erfahren Sie in unserer{' '}
                <a href="/datenschutz">Datenschutzerklärung</a> und im{' '}
                <a href="/impressum">Impressum</a>.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
