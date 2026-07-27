const workflowSteps = [
  ['01', 'Serielle AI-Reels', 'Aus Objektfotos entsteht regelmäßig bezahlbarer Content für organische Reichweite.'],
  ['02', 'Messbarer Einstieg', 'Profil-Link, Landingpage und UTM-Daten verbinden jedes Reel mit der Anfrage.'],
  ['03', 'Quiz & Qualifizierung', 'Budget, Eigenkapital, Timing und Finanzierung ergeben hot, warm, cold oder not qualified.'],
  ['04', 'Geprüfter E-Mail-Follow-up', 'Das System bereitet die passende Antwort vor; ein Mensch prüft und versendet sie.'],
  ['05', 'Call-Handoff & Feedback', 'Hot Leads erhalten einen klaren Rückrufkontext, spätere Ergebnisse verbessern die Regeln.'],
]

const deliverables = [
  ['Organic AI-Reel System', 'Wiederholbare Reel-Produktion aus vorhandenem Objektmaterial mit passendem CTA.'],
  ['Custom Quiz Funnel', 'Eine schlanke Landingpage, die Interessenten durch die wichtigsten Kaufkriterien führt.'],
  ['Qualification Rules', 'Regeln für Budget, Eigenkapital, Timing, Finanzierungsstatus und Kaufabsicht.'],
  ['CRM-ready Data', 'Lead, Consent, Segment, Quelle und nächster Schritt bleiben über eine stabile Lead-ID verbunden.'],
  ['Human-reviewed E-Mail', 'Follow-up-Entwürfe nach Segment und Antworten des Interessenten, niemals blind versendet.'],
  ['Source Tracking', 'UTM-Kampagne und Reel-Quelle zeigen, welcher Content welche Anfrage ausgelöst hat.'],
]

const packages = [
  ['Pilot Sprint', 'klar begrenzt', 'Ein Objekt, eine Reel-Serie, ein Quiz und ein nachvollziehbarer E-Mail-/Call-Workflow.'],
  ['Implementation', 'nach dem Pilot', 'Eigene Qualifikationsregeln, Lead-Inbox, Tracking und Vertriebshandoff.'],
  ['Monthly Ops', 'laufend', 'Neue Reels, Funnel-Betrieb, Lead-Feedback und verständliches Reporting.'],
]

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'me@valquilty.com'
const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || ''
const linkedinUrl =
  process.env.NEXT_PUBLIC_LINKEDIN_URL ||
  'https://www.linkedin.com/in/valentyn-havrychenko/'
const emailSubject = 'Demo-Anfrage: Reel-to-Lead System für Immobilien'
const emailBody = [
  'Hi,',
  '',
  'ich habe die NovaHaus Reel-to-Lead Demo gesehen und würde gern kurz besprechen, wie organische AI-Reels und der Lead-Workflow für unsere Objekte aussehen könnten.',
  '',
  'Firma:',
  'Lead-Quellen:',
  'CRM / Tooling:',
  'Lead-Volumen pro Monat:',
  '',
  'Viele Grüße',
].join('\n')
const mailtoUrl = `mailto:${contactEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
const primaryContactUrl = calendlyUrl || mailtoUrl
const primaryContactLabel = calendlyUrl ? 'Demo-Call buchen' : 'Demo-Anfrage senden'

export const metadata = {
  title: 'Reel-to-Lead System für Immobilienunternehmen | NovaHaus Demo',
  description:
    'B2B-Demo für Immobilienfirmen: organische AI-Reels, Quiz-Landingpage, Lead-Qualifizierung, geprüfter E-Mail-Follow-up und Call-Handoff.',
}

export default function SystemPage() {
  return (
    <main className="system-page">
      <section className="system-hero">
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

        <div className="system-nav container">
          <a href="/system" className="system-brand">
            Reel-to-Lead System
          </a>
          <div className="system-nav-links">
            <a href="/demo">Live Demo</a>
            <a href="/quiz">Quiz testen</a>
            <a href="#kontakt">Kontakt</a>
          </div>
        </div>

        <div className="container system-hero-inner">
          <div className="system-hero-copy">
            <p className="system-eyebrow">Für Immobilienfirmen, Makler und Projektentwickler</p>
            <h1>Aus Objektfotos werden Reels. Aus Aufmerksamkeit werden qualifizierte Anfragen.</h1>
            <p>
              Bezahlbar produzierbare AI-Reels bringen kontinuierlich organischen
              Traffic in einen messbaren Funnel. Quiz, Qualifizierung und geprüfte
              E-Mails führen passende Interessenten zum richtigen nächsten Schritt.
            </p>
            <div className="system-hero-actions">
              <a href="/demo" className="system-btn system-btn-primary">
                System-Demo ansehen
              </a>
              <a href="/quiz?demo=hot" className="system-btn system-btn-secondary">
                Hot-Lead testen
              </a>
            </div>
          </div>

          <div className="system-hero-panel" aria-label="Systemkennzahlen">
            <div>
              <span>Content-Motor</span>
              <strong>AI-Reels in Serie</strong>
              <p>Vorhandene Objektfotos werden zum wiederholbaren organischen Eingang.</p>
            </div>
            <div>
              <span>Attribution</span>
              <strong>Reel bis Lead</strong>
              <p>UTM-Daten verbinden Content, Quiz und Anfrage.</p>
            </div>
            <div>
              <span>Lead Routing</span>
              <strong>E-Mail oder Call</strong>
              <p>Der nächste Schritt folgt dem Segment, nicht einem pauschalen Autopilot.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="system-section">
        <div className="container system-split">
          <div>
            <p className="system-kicker">Das Problem</p>
            <h2>Ohne regelmäßigen Content entsteht weder Aufmerksamkeit noch ein messbarer Lead-Prozess.</h2>
          </div>
          <div className="system-problem-list">
            <p>Objektfotos liegen vor, aber Social Accounts werden unregelmäßig bespielt.</p>
            <p>Reichweite bleibt vom einzelnen Post abhängig und ist nicht mit Anfragen verbunden.</p>
            <p>Bei eingehenden Leads fehlen Qualifizierung, schneller Follow-up und Rückmeldung zum Ergebnis.</p>
          </div>
        </div>
      </section>

      <section className="system-section system-section-muted">
        <div className="container">
          <div className="system-section-head">
            <p className="system-kicker">Workflow</p>
            <h2>Vom Objektfoto bis zur qualifizierten Anfrage und zurück zum messbaren Ergebnis.</h2>
          </div>
          <div className="system-workflow">
            {workflowSteps.map(([number, title, text]) => (
              <article className="system-step" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="system-section">
        <div className="container">
          <div className="system-section-head">
            <p className="system-kicker">Was geliefert wird</p>
            <h2>Ein begrenzter Pilot, der Content und Lead-Verarbeitung als eine Kette beweist.</h2>
          </div>
          <div className="system-grid">
            {deliverables.map(([title, text]) => (
              <article className="system-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="system-section system-demo-band">
        <div className="container system-demo-inner">
          <div>
            <p className="system-kicker">Live Demo</p>
            <h2>NovaHaus zeigt den Ablauf vom organischen Einstieg bis zu E-Mail oder Rückruf.</h2>
            <p>
              Die sichere Demo verwendet Testdaten: ein Objekt, eine Reel-Quelle, ein Quiz,
              eine stabile Lead-ID, Qualifizierung und einen vorbereiteten nächsten Schritt.
            </p>
          </div>
          <div className="system-demo-actions">
            <a href="/demo" className="system-btn system-btn-primary">
              Demo-Szenarien ansehen
            </a>
            <a href="/quiz?demo=hot" className="system-btn system-btn-light">
              Hot-Lead durchspielen
            </a>
          </div>
        </div>
      </section>

      <section className="system-section">
        <div className="container">
          <div className="system-section-head">
            <p className="system-kicker">Angebot</p>
            <h2>Als Projekt, Pilot oder laufende Sales-Ops-Betreuung.</h2>
          </div>
          <div className="system-package-grid">
            {packages.map(([title, timeline, text]) => (
              <article className="system-package" key={title}>
                <span>{timeline}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <p className="system-note">
            Kein Ersatz für Makler oder Vertrieb: Die organische Content-Produktion schafft
            neue Einstiege, das System macht die daraus entstehenden Anfragen bearbeitbar.
          </p>
        </div>
      </section>

      <section className="system-section system-final">
        <div className="container system-contact-inner" id="kontakt">
          <div className="system-contact-copy">
            <p className="system-kicker">Kontakt</p>
            <h2>Für eine Immobilienfirma wird daraus ein eigener Funnel mit eigenem Objekt, eigener Logik und eigenem CRM.</h2>
            <p>
              Im ersten Call klären wir Objektmaterial, Account, CTA, Qualifikationsregeln,
              Empfänger und Feedback-Prozess für einen klar begrenzten Pilot.
            </p>
            <div className="system-final-actions">
              <a
                href={primaryContactUrl}
                className="system-btn system-btn-primary"
                target={calendlyUrl ? '_blank' : undefined}
                rel={calendlyUrl ? 'noreferrer' : undefined}
              >
                {primaryContactLabel}
              </a>
              <a href="/demo" className="system-btn system-btn-secondary">
                Live Demo teilen
              </a>
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  className="system-btn system-btn-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          <aside className="system-contact-card" aria-label="Kontaktinformationen">
            <h3>Was im Erstgespräch geklärt wird</h3>
            <ul>
              <li>Leadquellen und aktuelles Antworttempo</li>
              <li>Qualifikationsregeln für Budget und Eigenkapital</li>
              <li>CRM, Google Sheets oder bestehende Tools</li>
              <li>Draft-only Follow-up oder spätere Auto-Send-Regeln</li>
            </ul>
            <a href={mailtoUrl} className="system-contact-email">
              {contactEmail}
            </a>
          </aside>
        </div>
      </section>
    </main>
  )
}
