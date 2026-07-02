import Link from 'next/link'

export const metadata = {
  title: 'NovaHaus Links',
  description: 'Schnelle Links von NovaHaus Immobilien.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function StartPage() {
  return (
    <main className="start-page" aria-label="NovaHaus Instagram Links">
      <section className="start-card">
        <div className="start-logo">NH</div>
        <p className="start-eyebrow">NovaHaus Immobilien</p>
        <h1>Kapitalanlage & Immobilien kompakt</h1>
        <p className="start-description">Schnelle Checks, Unterlagen und rechtliche Informationen an einem Ort.</p>

        <nav className="start-links" aria-label="Start Links">
          <Link className="start-link start-link-primary" href="/invest?utm_source=instagram&utm_medium=bio">
            Kapitalanlage-Check
          </Link>
          <button className="start-link start-link-disabled" type="button" disabled>
            Checkliste · bald verfügbar
          </button>
          <Link className="start-link" href="/impressum">Impressum</Link>
          <Link className="start-link" href="/datenschutz">Datenschutz</Link>
        </nav>
      </section>
    </main>
  )
}
