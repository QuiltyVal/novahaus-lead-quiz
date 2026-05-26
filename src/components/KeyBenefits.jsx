'use client'

import {
  IconLocation,
  IconSavings,
  IconCalendar,
  IconChartUp,
} from './icons'

const FACTS = [
  /* ── Row 1 ── */
  {
    Icon: IconLocation,
    label: 'TOPLAGE',
    line1: 'Leipzig Zentrum-West',
    line2: 'Ruhige Nebenstraße, Top-Anbindung',
    clickTarget: '#lage',
    linkHint: 'Standort ansehen ↓',
  },
  {
    Icon: IconCalendar,
    label: 'BEZUGSFERTIG',
    line1: 'Frühjahr 2026',
    line2: '3–4 Zimmer, 92–105 m²',
    clickTarget: '#grundrisse',
    linkHint: 'Grundrisse ansehen ↓',
  },
  /* ── Row 2 ── */
  {
    Icon: IconSavings,
    label: 'PROVISIONSFREI',
    line1: 'Direkt vom Eigentümer',
    line2: 'Bis zu €12.000 sparen',
    clickTarget: null,
  },
  {
    Icon: IconChartUp,
    label: 'PREISE',
    line1: '€329.000 – €359.000',
    line2: '(Provisionsfrei)',
    clickTarget: null,
  },
]

export default function KeyBenefits() {
  const handleCardClick = (target) => {
    if (!target) return
    const el = document.querySelector(target)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="facts-section" id="vorteile">
      <div className="container">
        <h2 className="facts-section-title">Ihre Vorteile auf einen Blick</h2>
        <p className="facts-section-sub">
          Neubauprojekt in zentraler Leipziger Lage — provisionsfrei direkt vom Eigentümer
        </p>

        {/* ── Facts Grid ── */}
        <div className="facts-grid">
          {FACTS.map((f) => (
            <div
              className={`fact-card${f.clickTarget ? ' fact-card--clickable' : ''}`}
              key={f.label}
              onClick={() => handleCardClick(f.clickTarget)}
              role={f.clickTarget ? 'button' : undefined}
              tabIndex={f.clickTarget ? 0 : undefined}
            >
              <div className="fact-icon">
                <f.Icon size={28} strokeWidth={1.8} />
              </div>
              <div className="fact-label">{f.label}</div>
              <div className="fact-line1">{f.line1}</div>
              <div className="fact-line2">{f.line2}</div>
              {f.clickTarget && (
                <span className="fact-link-hint">{f.linkHint}</span>
              )}
            </div>
          ))}
        </div>

        {/* ── Wussten Sie? Infobox ── */}
        <div className="infobox-compact">
          <div className="infobox-compact-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#be4a74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <h3 className="infobox-compact-title">Wussten Sie?</h3>
          <p>
            <strong>Schnell sein lohnt sich:</strong> Für die gleiche monatliche Rate wie Miete
            bauen Sie Eigentum auf. Bei 92 m² zahlen Mieter in 10 Jahren <strong style={{ color: '#c0392b' }}>€163.000</strong> — und
            haben nichts davon.
          </p>
        </div>
      </div>
    </section>
  )
}
