'use client'

import { trackEvent } from '@/lib/tracking'
import { useRouter } from 'next/navigation'

export default function Hero() {
  const router = useRouter()

  const handleCTA = (e) => {
    e.preventDefault()
    trackEvent('ViewContent', {
      content_name: 'Quiz Started',
      content_category: 'NovaHaus Wohnungen Leipzig',
    })
    router.push('/quiz')
  }

  return (
    <section className="hero" id="hero">
      <div className="hero-bg" role="img" aria-label="NovaHaus Wohnquartier Leipzig">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/background.png"
          aria-hidden="true"
        >
          <source src="/media/novahaus-home-hero.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="hero-content">
        <div className="hero-eyebrow">💡 Warum noch Miete zahlen?</div>
        <h1>Kaufen statt Mieten — Ihre Eigentumswohnung in Leipzig</h1>
        <p className="hero-sub">
          Für die gleiche monatliche Rate wie Miete bauen Sie Eigentum auf.
        </p>
        <p className="hero-features">
          Provisionsfrei • Bezugsfertig ab Frühjahr 2026 • Direkt vom Eigentümer
        </p>
        <a href="/quiz" className="hero-cta" onClick={handleCTA}>
          Jetzt passende Wohnung finden →
        </a>
        <div className="hero-trust">
          <span>
            <span className="check">✓</span> Kostenlos &amp; unverbindlich
          </span>
          <span>
            <span className="check">✓</span> In nur 60 Sekunden
          </span>
          <span>
            <span className="check">✓</span> Persönliches Exposé
          </span>
        </div>
      </div>
    </section>
  )
}
