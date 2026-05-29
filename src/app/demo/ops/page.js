import { getDemoScenario } from '@/lib/demoScenarios'

export const metadata = {
  title: 'Demo Backend-Konsole | NovaHaus Lead-to-Call',
  description:
    'Demo-safe Backend-Ansicht mit Workflow, Sheet-Zeile und Gmail-Draft für NovaHaus.',
}

const workflowNodes = [
  ['Lead Webhook', 'POST empfangen'],
  ['Validate + Normalize', 'Daten bereinigen'],
  ['Secret OK?', 'Quelle prüfen'],
  ['Append Lead to Sheet', 'CRM-Zeile schreiben'],
  ['Route by Segment', 'Hot/Warm/Cold entscheiden'],
  ['Create Gmail Draft', 'Antwort vorbereiten'],
  ['Respond OK', 'Website bestätigen'],
]

function sheetRows(scenario) {
  return [
    ['status', scenario.status],
    ['segment', scenario.segment],
    ['priority', scenario.priority],
    ['score', `${scenario.score}/100`],
    ['name', `${scenario.firstName} ${scenario.lastName}`],
    ['email', scenario.email],
    ['phone', scenario.phone],
    ['wohnung', scenario.wohnungLabel],
    ['purchase_timeline', scenario.zeitrahmenLabel],
    ['equity_bucket', scenario.eigenkapitalLabel],
    ['financing_status', scenario.finanzierungLabel],
    ['next_best_action', scenario.nextAction],
  ]
}

export default function DemoOpsPage({ searchParams }) {
  const scenario = getDemoScenario(searchParams?.scenario)

  return (
    <main className="demo-ops-page">
      <section className="demo-ops-header">
        <div className="container demo-ops-header-inner">
          <div>
            <p className="system-kicker">Demo Backend-Konsole</p>
            <h1>{scenario.label}: Lead wurde verarbeitet.</h1>
            <p>
              Diese Ansicht ist für Aufnahmen gebaut. Sie zeigt denselben
              operativen Ablauf wie n8n, Google Sheets und Gmail Drafts, aber
              ohne private Accounts oder echte Kundendaten.
            </p>
          </div>
          <div className="demo-ops-actions">
            <a href={`/quiz?demo=${scenario.key}`} className="system-btn system-btn-primary">
              Quiz nochmal starten
            </a>
            <a href="/system" className="system-btn system-btn-secondary">
              B2B-Seite
            </a>
          </div>
        </div>
      </section>

      <section className="demo-ops-section">
        <div className="container demo-ops-grid">
          <article className="demo-ops-panel demo-workflow-panel">
            <div className="demo-panel-head">
              <span>n8n Workflow</span>
              <strong>Published</strong>
            </div>
            <div className="demo-workflow-line">
              {workflowNodes.map(([title, subtitle]) => (
                <div className="demo-workflow-node" key={title}>
                  <span />
                  <h3>{title}</h3>
                  <p>{subtitle}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="demo-ops-panel">
            <div className="demo-panel-head">
              <span>Lead Qualification</span>
              <strong>{scenario.priority}</strong>
            </div>
            <div className={`demo-segment-badge demo-segment-${scenario.segment}`}>
              {scenario.segment}
            </div>
            <h2>{scenario.badge}</h2>
            <p>{scenario.nextAction}</p>
          </article>

          <article className="demo-ops-panel demo-sheet-panel">
            <div className="demo-panel-head">
              <span>Google Sheets Row</span>
              <strong>Appended</strong>
            </div>
            <div className="demo-sheet-table">
              {sheetRows(scenario).map(([key, value]) => (
                <div key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="demo-ops-panel demo-email-panel">
            <div className="demo-panel-head">
              <span>Gmail Draft</span>
              <strong>Review required</strong>
            </div>
            <div className="demo-email-window">
              <div>
                <span>To</span>
                <strong>{scenario.email}</strong>
              </div>
              <div>
                <span>Subject</span>
                <strong>{scenario.emailSubject}</strong>
              </div>
              <pre>{scenario.emailDraft}</pre>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
