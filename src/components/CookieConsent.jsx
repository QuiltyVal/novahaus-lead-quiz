'use client'

import { useState, useEffect, useCallback } from 'react'

const CONSENT_KEY = 'novahaus_cookie_consent'
const CONSENT_META_KEY = 'novahaus_cookie_consent_meta'
const CONSENT_VERSION = '2026-06-02'

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

function getConsentLabel(choice) {
  if (choice === 'all') return 'Alle Cookies'
  if (choice === 'essential') return 'Nur notwendige Cookies'
  return ''
}

/**
 * Removes common marketing cookies so trackers are fully disabled.
 */
function clearTrackingCookies() {
  const trackingCookies = [
    '_fbp',
    '_fbc',
    'fr',
    'datr',
    'sb',
    '_ga',
    '_gid',
    '_gat',
    '_gcl_au',
    '__gads',
    '__gpi',
  ]

  trackingCookies.forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
  })
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [consent, setConsent] = useState(null)

  useEffect(() => {
    const storedConsent = getConsent()
    setConsent(storedConsent)

    // The first decision is mandatory: no optional cookies load before this.
    if (!storedConsent) {
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

  useEffect(() => {
    if (!visible) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [visible])

  const accept = useCallback((choice) => {
    const previousChoice = getConsent()
    localStorage.setItem(CONSENT_KEY, choice)
    localStorage.setItem(
      CONSENT_META_KEY,
      JSON.stringify({
        choice,
        version: CONSENT_VERSION,
        updatedAt: new Date().toISOString(),
      }),
    )
    setConsent(choice)
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

  const firstChoiceRequired = visible && !consent

  return (
    <>
      {/* Floating cookie button — always visible when banner is closed */}
      {!visible && consent && (
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
        <div
          className="cookie-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-consent-title"
        >
          <div className="cookie-banner">
            <div className="cookie-banner-inner">
              <h3 id="cookie-consent-title">Cookie-Einwilligung</h3>

              {consent && (
                <p className="cookie-current-status">
                  Aktuelle Einstellung:{' '}
                  <strong>{getConsentLabel(consent)}</strong>
                </p>
              )}

              <p>
                Wir verwenden notwendige Cookies für den Betrieb der Website. Optionale
                Marketing- und Analyse-Technologien wie Google Tag Manager und Meta Pixel
                werden erst nach Ihrer Einwilligung aktiviert.
              </p>

              {firstChoiceRequired && (
                <p className="cookie-required-note">
                  Bitte treffen Sie eine Auswahl, bevor Sie die Website weiter nutzen.
                  Sie können Ihre Entscheidung später jederzeit ändern.
                </p>
              )}

              {showDetails && (
                <div className="cookie-details">
                  <div className="cookie-category">
                    <div className="cookie-cat-header">
                      <strong>Essenziell</strong>
                      <span className="cookie-always-on">Immer aktiv</span>
                    </div>
                    <p>
                      Notwendig für Grundfunktionen wie Navigation, Formularverarbeitung,
                      Sicherheit und das Speichern Ihrer Cookie-Auswahl. Diese Cookies
                      können nicht deaktiviert werden.
                    </p>
                  </div>
                  <div className="cookie-category">
                    <div className="cookie-cat-header">
                      <strong>Marketing &amp; Analyse</strong>
                      <span className="cookie-optional">Optional</span>
                    </div>
                    <p>
                      Google Tag Manager, Meta Pixel und Meta Conversions API können genutzt
                      werden, um Website-Nutzung und Kampagnen zu messen. Diese Dienste
                      werden nur geladen, wenn Sie „Alle akzeptieren“ wählen.
                    </p>
                  </div>
                </div>
              )}

              <div className="cookie-actions">
                <button
                  className="cookie-btn cookie-btn--essential"
                  onClick={() => accept('essential')}
                >
                  Nur notwendige Cookies
                </button>
                <button
                  className="cookie-btn cookie-btn--accept"
                  onClick={() => accept('all')}
                >
                  Alle akzeptieren
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
