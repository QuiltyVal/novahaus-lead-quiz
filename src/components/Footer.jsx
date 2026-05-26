'use client'

export default function Footer() {
  const openCookieSettings = () => {
    window.dispatchEvent(new CustomEvent('open-cookie-settings'))
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>NovaHaus Immobilien</h4>
            <p>
              Musterstraße 12
              <br />
              04109 Leipzig
              <br />
              <br />
              📞{' '}
              <a href="tel:+49341000000">+49 (0)341 000000</a>
              <br />
              📧{' '}
              <a href="mailto:kontakt@novahaus-demo.de">
                kontakt@novahaus-demo.de
              </a>
            </p>
          </div>
          <div>
            <h4>Rechtliches</h4>
            <a href="/impressum">Impressum</a>
            <a href="/datenschutz">Datenschutzerklärung</a>
            <button
              type="button"
              className="footer-cookie-link"
              onClick={openCookieSettings}
            >
              🍪 Cookie-Einstellungen
            </button>
          </div>
          <div>
            <h4>Kontakt</h4>
            <p>
              Mo–Fr: 9:00 – 18:00 Uhr
              <br />
              Sa: nach Vereinbarung
              <br />
              <br />
              Oder schreiben Sie uns jederzeit eine E-Mail.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 NovaHaus Immobilien GmbH. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  )
}
