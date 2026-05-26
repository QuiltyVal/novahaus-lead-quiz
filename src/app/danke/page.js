'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/tracking'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function DankePage() {
  useEffect(() => {
    // Fire CompleteRegistration event
    let userData = {}
    try {
      const stored = sessionStorage.getItem('novahaus_lead')
      if (stored) {
        const lead = JSON.parse(stored)
        userData = {
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
        }
      }
    } catch {}

    trackEvent(
      'CompleteRegistration',
      {
        content_name: 'Exposé Anfrage',
        status: 'complete',
      },
      userData
    )
  }, [])

  return (
    <>
      <Header />
      <div className="thankyou-wrapper">
        <div className="thankyou-inner">
          <div className="thankyou-checkmark">✓</div>
          <h1>Vielen Dank für Ihre Anfrage!</h1>
          <p className="sub">Ihr persönliches Exposé ist auf dem Weg zu Ihnen.</p>

          <div className="thankyou-steps">
            <div>
              <span className="step-check">✅</span> Wir haben Ihre Anfrage
              erhalten
            </div>
            <div>
              <span className="step-check">✅</span> Sie erhalten Ihr Exposé
              innerhalb von 24 Stunden per E-Mail
            </div>
            <div>
              <span className="step-check">✅</span> Unser Team wird sich in
              Kürze bei Ihnen melden
            </div>
          </div>

          <div className="thankyou-phone">
            Haben Sie Fragen? Rufen Sie uns an:
            <a href="tel:+49341000000">📞 +49 (0)341 000000</a>
          </div>

          <a href="/" className="thankyou-cta">
            Zurück zur Startseite
          </a>
        </div>
      </div>
      <Footer />
    </>
  )
}
