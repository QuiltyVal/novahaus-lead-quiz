import { DEMO_SCENARIO_ORDER, getDemoScenario } from '@/lib/demoScenarios'

export const metadata = {
  title: 'Demo-Regie | NovaHaus Lead-to-Call',
  description:
    'Sicherer Aufnahmemodus für die NovaHaus Lead-to-Call Demo mit fiktiven Leads und Backend-Konsole.',
}

function quizUrl(key) {
  const params = new URLSearchParams({
    demo: key,
    utm_source: 'portfolio_demo',
    utm_medium: 'recording',
    utm_campaign: `novahaus_demo_${key}`,
    utm_content: key,
  })

  return `/quiz?${params.toString()}`
}

export default function DemoPage() {
  const scenarios = DEMO_SCENARIO_ORDER.map(getDemoScenario)

  return (
    <main className="demo-page">
      <section className="demo-hero">
        <video
          className="system-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/background.png"
          aria-hidden="true"
        >
          <source src="/media/novahaus-hero.mp4" type="video/mp4" />
        </video>
        <div className="system-hero-overlay" />

        <div className="container demo-hero-inner">
          <p className="system-eyebrow">Demo-safe recording mode</p>
          <h1>Zeige den kompletten Lead-to-Call Ablauf ohne echte Kundendaten.</h1>
          <p>
            Diese Seite ist für Videoaufnahmen und Kundendemos gedacht:
            fiktiver Lead, klares Szenario, danach eine saubere Backend-Konsole
            mit Sheet-Row, Routing und Gmail-Draft.
          </p>
          <div className="demo-hero-actions">
            <a href={quizUrl('hot')} className="system-btn system-btn-primary">
              Hot Lead aufnehmen
            </a>
            <a href="/demo/ops?scenario=hot" className="system-btn system-btn-secondary">
              Backend-Konsole zeigen
            </a>
          </div>
        </div>
      </section>

      <section className="demo-section">
        <div className="container">
          <div className="system-section-head">
            <p className="system-kicker">Szenarien</p>
            <h2>Vier Lead-Typen für Demo und Verkaufsgespräch.</h2>
          </div>

          <div className="demo-scenario-grid">
            {scenarios.map((scenario) => (
              <article className="demo-scenario-card" key={scenario.key}>
                <div className="demo-scenario-topline">
                  <span>{scenario.priority}</span>
                  <strong>{scenario.label}</strong>
                </div>
                <h3>{scenario.badge}</h3>
                <p>
                  {scenario.firstName} {scenario.lastName} interessiert sich für{' '}
                  {scenario.wohnungLabel}. Segment: {scenario.segment}.
                </p>
                <dl>
                  <div>
                    <dt>Budgetsignal</dt>
                    <dd>{scenario.eigenkapitalLabel}</dd>
                  </div>
                  <div>
                    <dt>Timing</dt>
                    <dd>{scenario.zeitrahmenLabel}</dd>
                  </div>
                  <div>
                    <dt>Nächster Schritt</dt>
                    <dd>{scenario.nextAction}</dd>
                  </div>
                </dl>
                <div className="demo-card-actions">
                  <a href={quizUrl(scenario.key)}>Quiz starten</a>
                  <a href={`/demo/ops?scenario=${scenario.key}`}>Backend ansehen</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="demo-section demo-section-muted">
        <div className="container demo-recording-grid">
          <div>
            <p className="system-kicker">Aufnahmeablauf</p>
            <h2>Was im Video gezeigt wird.</h2>
          </div>
          <ol className="demo-recording-list">
            <li>Landingpage öffnen und kurz erklären: Immobilien-Lead-Quiz.</li>
            <li>Hot-Lead-Szenario im Demo-Modus durchklicken.</li>
            <li>Absenden: Fake Lead wird als Demo markiert.</li>
            <li>Backend-Konsole zeigen: n8n-Schritte, Sheet-Row, Gmail-Draft.</li>
            <li>Mit der B2B-Seite abschließen: was eine Firma bekommt.</li>
          </ol>
        </div>
      </section>
    </main>
  )
}
