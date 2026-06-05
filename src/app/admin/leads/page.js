import { listLeads } from '@/lib/leadStore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value))
}

function getSegmentClass(segment) {
  return `lead-pill lead-pill--${segment || 'unknown'}`
}

function AdminEmptyState() {
  return (
    <section className="admin-panel">
      <h2>Noch keine Leads in der Datenbank</h2>
      <p>
        Sobald die Quiz-Landingpage einen Lead empfängt und `DATABASE_URL`
        gesetzt ist, erscheint er hier.
      </p>
    </section>
  )
}

function DatabaseSetupState() {
  return (
    <section className="admin-panel">
      <h2>Datenbank noch nicht verbunden</h2>
      <p>
        Die Lead Inbox ist vorbereitet, aber <code>DATABASE_URL</code> ist noch nicht in
        der Umgebung gesetzt. Bis dahin läuft der bestehende n8n/Google-Sheets
        Workflow weiter.
      </p>
      <div className="admin-code-block">
        <span>1. Postgres-Datenbank anlegen</span>
        <span>2. db/schema.sql ausführen</span>
        <span>3. DATABASE_URL und ADMIN_PASSWORD in Vercel setzen</span>
      </div>
    </section>
  )
}

function DatabaseErrorState({ message }) {
  return (
    <section className="admin-panel">
      <h2>Datenbank ist verbunden, aber noch nicht bereit</h2>
      <p>
        Prüfe, ob <code>db/schema.sql</code> bereits auf der Postgres-Datenbank
        ausgeführt wurde.
      </p>
      <div className="admin-code-block">
        <span>{message}</span>
      </div>
    </section>
  )
}

export default async function LeadsAdminPage() {
  let configured = false
  let leads = []
  let databaseError = ''

  try {
    const result = await listLeads({ limit: 100 })
    configured = result.configured
    leads = result.leads
  } catch (error) {
    configured = true
    databaseError = error.message
  }

  const totalLeads = leads.length
  const hotLeads = leads.filter((lead) => lead.segment === 'hot').length
  const followUps = leads.filter((lead) => lead.assigned_to === 'ai_agent').length

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">NovaHaus Admin</p>
          <h1>Lead Inbox</h1>
        </div>
        <a className="admin-link-button" href="/">
          Zur Website
        </a>
      </header>

      <section className="admin-kpis" aria-label="Lead overview">
        <div className="admin-kpi">
          <span>Leads</span>
          <strong>{totalLeads}</strong>
        </div>
        <div className="admin-kpi">
          <span>Hot Leads</span>
          <strong>{hotLeads}</strong>
        </div>
        <div className="admin-kpi">
          <span>AI Follow-ups</span>
          <strong>{followUps}</strong>
        </div>
      </section>

      {databaseError ? (
        <DatabaseErrorState message={databaseError} />
      ) : !configured ? (
        <DatabaseSetupState />
      ) : leads.length === 0 ? (
        <AdminEmptyState />
      ) : (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Neueste Leads</h2>
              <p>Letzte 100 Einträge aus der internen Postgres-Datenbank.</p>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Segment</th>
                  <th>Objekt</th>
                  <th>Budgetsignal</th>
                  <th>Nächster Schritt</th>
                  <th>Eingang</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.lead_id}>
                    <td>
                      <strong>{lead.name || 'Ohne Namen'}</strong>
                      <span>{lead.email || 'Keine E-Mail'}</span>
                      <span>{lead.phone || 'Keine Telefonnummer'}</span>
                    </td>
                    <td>
                      <span className={getSegmentClass(lead.segment)}>
                        {lead.priority} · {lead.segment}
                      </span>
                    </td>
                    <td>{lead.wohnung_label || '—'}</td>
                    <td>
                      <strong>{lead.equity_bucket_label || '—'}</strong>
                      <span>{lead.financing_status_label || '—'}</span>
                    </td>
                    <td>
                      <strong>{lead.assigned_to || '—'}</strong>
                      <span>{lead.next_best_action || lead.next_action || '—'}</span>
                    </td>
                    <td>{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
