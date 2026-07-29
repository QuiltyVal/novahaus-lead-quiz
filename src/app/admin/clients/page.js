import AdminNav from '@/components/AdminNav'
import DataRoomAccessManager from '@/components/admin/DataRoomAccessManager'
import { listClients, listContentAccounts, listProjects } from '@/lib/contentStore'
import { listTenantAccessTokens } from '@/lib/dataRoomStore'
import { metricValue } from '@/lib/adminDisplay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function ClientsAdminPage({ searchParams }) {
  const params = await searchParams
  let configured = false
  let clients = []
  let projects = []
  let accounts = []
  let accessTokens = []
  let databaseError = ''

  try {
    const [clientResult, projectRows, accountRows, tokenRows] = await Promise.all([
      listClients(),
      listProjects(),
      listContentAccounts(),
      listTenantAccessTokens(),
    ])
    configured = clientResult.configured
    clients = clientResult.clients
    projects = projectRows
    accounts = accountRows
    accessTokens = tokenRows
  } catch (error) {
    configured = true
    databaseError = error.message
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Operations</p>
          <h1>Kunden</h1>
        </div>
        <a className="admin-link-button" href="/">Zur Website</a>
      </header>
      <AdminNav active="clients" />

      {params?.created ? <div className="admin-flash admin-status-note--success">Kunde {params.created} wurde angelegt.</div> : null}
      {params?.error ? <div className="admin-flash admin-status-note--error">{params.error}</div> : null}
      {databaseError ? <div className="admin-flash admin-status-note--error">{databaseError}</div> : null}

      <section className="admin-panel admin-section-gap">
        <div className="admin-panel-heading">
          <div>
            <h2>Neuen Kunden anlegen</h2>
            <p>Der Kunde erhält einen stabilen Schlüssel und ein erstes Projekt.</p>
          </div>
        </div>
        <form className="admin-form-grid" action="/admin/clients/create" method="post">
          <label>
            Client ID
            <input className="admin-input" name="client_id" placeholder="srm" required />
          </label>
          <label>
            Name
            <input className="admin-input" name="client_name" placeholder="SRM Immobilien" required />
          </label>
          <label>
            Project ID
            <input className="admin-input" name="project_id" placeholder="srm-pilot" required />
          </label>
          <label>
            Projektname
            <input className="admin-input" name="project_name" placeholder="SRM Lead-to-Call Pilot" required />
          </label>
          <label className="admin-form-wide">
            Instagram handle, falls vorhanden
            <input className="admin-input" name="instagram_handle" placeholder="srm.immobilien" />
          </label>
          <div className="admin-form-actions admin-form-wide">
            <button className="admin-primary-button" type="submit">Kunde anlegen</button>
          </div>
        </form>
      </section>

      <section className="admin-panel admin-section-gap">
        <div className="admin-panel-heading">
          <div>
            <h2>Data-Room-Zugänge</h2>
            <p>Token-Links sind vom Admin-Login getrennt, werden nur gehasht gespeichert und können hier widerrufen werden.</p>
          </div>
        </div>
        <DataRoomAccessManager clients={clients} initialTokens={accessTokens} />
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Mandantenübersicht</h2>
            <p>Alle Inhalte bleiben über die Client ID logisch getrennt.</p>
          </div>
        </div>

        {!configured ? (
          <div className="admin-status-note">DATABASE_URL ist nicht konfiguriert.</div>
        ) : clients.length === 0 ? (
          <div className="admin-status-note">Noch keine Kunden vorhanden.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kunde</th>
                  <th>Projekte</th>
                  <th>Accounts</th>
                  <th>Objekte</th>
                  <th>Reels</th>
                  <th>Views / Reach</th>
                  <th>Leads</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const clientProjects = projects.filter((project) => project.tenant_id === client.id)
                  const clientAccounts = accounts.filter((account) => account.owner_tenant_id === client.id)
                  return (
                    <tr key={client.id}>
                      <td><strong>{client.name}</strong><span>{client.id}</span></td>
                      <td><strong>{client.project_count}</strong><span>{clientProjects.map((project) => project.name).join(', ') || '—'}</span></td>
                      <td><strong>{client.account_count}</strong><span>{clientAccounts.map((account) => `@${account.handle}`).join(', ') || '—'}</span></td>
                      <td>{client.property_count}</td>
                      <td>{client.post_count}</td>
                      <td><strong>{metricValue(client.views)} / {metricValue(client.reach)}</strong><span>{metricValue(client.saves)} Saves · {metricValue(client.shares)} Shares</span></td>
                      <td>{client.lead_count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
