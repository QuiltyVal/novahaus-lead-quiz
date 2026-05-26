const workflowSteps = [
  ['01', 'Quiz-Landingpage', 'Budget, Eigenkapital, Immobilientyp und Timing werden abgefragt.'],
  ['02', 'Lead-Qualifizierung', 'Die Anfrage wird in hot, warm, cold oder not qualified eingeordnet.'],
  ['03', 'Workflow-Automation', 'n8n schreibt den Lead in Sheet oder CRM und startet den Follow-up-Prozess.'],
  ['04', 'AI-E-Mail-Entwurf', 'Ein passender Antwortentwurf wird vorbereitet, aber nicht automatisch versendet.'],
  ['05', 'Manager-Handoff', 'Hot Leads erhalten einen klaren Call-Kontext fuer Vertrieb oder Callcenter.'],
]

const deliverables = [
  ['Custom Quiz Funnel', 'Eine schlanke Landingpage, die Interessenten durch die wichtigsten Kaufkriterien fuehrt.'],
  ['Qualification Rules', 'Regeln fuer Budget, Eigenkapital, Timing, Finanzierungsstatus und Kaufabsicht.'],
  ['n8n Workflow', 'Webhook, Validierung, Segmentierung, Sheet/CRM-Write und E-Mail-Draft in einem Ablauf.'],
  ['CRM-ready Data', 'Saubere Lead-Daten fuer Google Sheets, HubSpot, Pipedrive oder ein bestehendes CRM.'],
  ['AI Draft System', 'Follow-up-Mails nach Segment, Projekt und Antworten des Interessenten.'],
  ['Tracking Setup', 'Slots fuer GTM, Meta Pixel und Meta CAPI, consent-gated und deploy-sicher.'],
]

const packages = [
  ['Pilot Sprint', '1-2 Wochen', 'Live-Demo, ein Objekt, ein Lead-Workflow, Gmail Drafts und Sheet/CRM Export.'],
  ['Implementation', '2-4 Wochen', 'Custom Quiz, Segmentlogik, n8n Automationen, Tracking und Vertriebshandoff.'],
  ['Monthly Ops', 'laufend', 'Monitoring, Prompt-Optimierung, neue Segmente, Reporting und Funnel-Verbesserungen.'],
]

export const metadata = {
  title: 'Lead-to-Call System fuer Immobilienunternehmen | NovaHaus Demo',
  description:
    'B2B-Demo fuer Immobilienfirmen: Quiz-Landingpage, Lead-Qualifizierung, n8n Workflow, AI-E-Mail-Entwurf und Manager-Handoff.',
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
            Lead-to-Call System
          </a>
          <div className="system-nav-links">
            <a href="/">Live Demo</a>
            <a href="/quiz">Quiz testen</a>
          </div>
        </div>

        <div className="container system-hero-inner">
          <div className="system-hero-copy">
            <p className="system-eyebrow">Fuer Immobilienfirmen, Makler und Projektentwickler</p>
            <h1>Mehr aus Immobilien-Leads holen, bevor sie kalt werden.</h1>
            <p>
              Ein schneller Lead-to-Call Funnel: Quiz-Landingpage, Qualifizierung,
              n8n-Automation, Sheet/CRM Sync, AI-E-Mail-Entwurf und klarer
              Handoff an Vertrieb oder Callcenter.
            </p>
            <div className="system-hero-actions">
              <a href="/" className="system-btn system-btn-primary">
                Live-Demo ansehen
              </a>
              <a href="/quiz" className="system-btn system-btn-secondary">
                Quiz testen
              </a>
            </div>
          </div>

          <div className="system-hero-panel" aria-label="Systemkennzahlen">
            <div>
              <span>Antwortfenster</span>
              <strong>5-15 Min.</strong>
              <p>Hot Leads werden sofort fuer den Rueckruf markiert.</p>
            </div>
            <div>
              <span>Lead Routing</span>
              <strong>Hot / Warm / Cold</strong>
              <p>Jede Anfrage bekommt den naechsten sinnvollen Schritt.</p>
            </div>
            <div>
              <span>Sicherer AI-Modus</span>
              <strong>Draft-only</strong>
              <p>AI bereitet Antworten vor, der Mensch gibt sie frei.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="system-section">
        <div className="container system-split">
          <div>
            <p className="system-kicker">Das Problem</p>
            <h2>Viele Immobilien-Leads verlieren ihren Wert in den ersten Minuten.</h2>
          </div>
          <div className="system-problem-list">
            <p>Interessenten fuellen ein Formular aus, aber niemand reagiert schnell genug.</p>
            <p>Der Vertrieb weiss nicht sofort, ob Budget, Eigenkapital und Timing passen.</p>
            <p>Follow-ups werden manuell geschrieben und klingen oft nicht persoenlich.</p>
          </div>
        </div>
      </section>

      <section className="system-section system-section-muted">
        <div className="container">
          <div className="system-section-head">
            <p className="system-kicker">Workflow</p>
            <h2>Vom Klick zur qualifizierten Anfrage mit vorbereitetem Follow-up.</h2>
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
            <h2>Ein verkaufbarer Prototyp, der wie ein echtes Sales-Ops-System arbeitet.</h2>
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
            <h2>NovaHaus zeigt den kompletten Ablauf an einem Immobilienbeispiel.</h2>
            <p>
              Die Demo ist bewusst einfach gehalten: ein Objekt, ein Quiz, ein Lead-Webhook,
              Google Sheets, Gmail Drafts und ein AI-Provider-Switcher fuer E-Mail-Entwuerfe.
            </p>
          </div>
          <div className="system-demo-actions">
            <a href="/" className="system-btn system-btn-primary">
              Website ansehen
            </a>
            <a href="/quiz" className="system-btn system-btn-light">
              Lead erzeugen
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
            Positionierung fuer Kunden: kein Ersatz fuer Vertrieb, sondern ein schnelleres
            Qualifizierungs- und Follow-up-System fuer bestehende Leadquellen.
          </p>
        </div>
      </section>

      <section className="system-section system-final">
        <div className="container">
          <p className="system-kicker">Naechster Schritt</p>
          <h2>Fuer eine Immobilienfirma wird daraus ein eigener Funnel mit eigenem Objekt, eigener Logik und eigenem CRM.</h2>
          <div className="system-final-actions">
            <a href="/" className="system-btn system-btn-primary">
              Demo teilen
            </a>
            <a href="/quiz" className="system-btn system-btn-secondary">
              Testlead durchspielen
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
