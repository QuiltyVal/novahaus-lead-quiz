import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import ObjectCreateForm from '@/components/admin/ObjectCreateForm'
import { listClients, listProjects, listProperties } from '@/lib/contentStore'
import { metricValue, objectStatusLabel, rightsStatusLabel } from '@/lib/adminDisplay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function ObjectsAdminPage({ searchParams }) {
  const params = await searchParams
  const tenantFilter = String(params?.tenant || '').trim()
  let configured = false
  let properties = []
  let clients = []
  let projects = []
  let databaseError = ''

  try {
    const [propertyResult, clientResult, projectRows] = await Promise.all([
      listProperties({ tenantId: tenantFilter }),
      listClients(),
      listProjects(),
    ])
    configured = propertyResult.configured
    properties = propertyResult.properties
    clients = clientResult.clients
    projects = projectRows
  } catch (error) {
    configured = true
    databaseError = error.message
  }

  const activeObjects = properties.filter((property) => property.status === 'active').length
  const posts = properties.reduce((sum, property) => sum + Number(property.post_count || 0), 0)
  const leads = properties.reduce((sum, property) => sum + Number(property.lead_count || 0), 0)

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Operations</p>
          <h1>Objekte</h1>
        </div>
        <a className="admin-link-button" href="/">Zur Website</a>
      </header>
      <AdminNav active="objects" />

      {params?.error ? <div className="admin-flash admin-status-note--error">{params.error}</div> : null}
      {databaseError ? <div className="admin-flash admin-status-note--error">{databaseError}</div> : null}

      <section className="admin-kpis" aria-label="Object overview">
        <div className="admin-kpi"><span>Objekte</span><strong>{properties.length}</strong></div>
        <div className="admin-kpi"><span>Aktiv / Reels</span><strong>{activeObjects} / {posts}</strong></div>
        <div className="admin-kpi"><span>Leads</span><strong>{leads}</strong></div>
      </section>

      <section className="admin-panel admin-section-gap">
        <div className="admin-panel-heading">
          <div>
            <h2>Objektübersicht</h2>
            <div className="admin-filter-row">
              <a className={!tenantFilter ? 'admin-small-link active' : 'admin-small-link'} href="/admin/objects">Alle Kunden</a>
              {clients.map((client) => (
                <a key={client.id} className={tenantFilter === client.id ? 'admin-small-link active' : 'admin-small-link'} href={`/admin/objects?tenant=${client.id}`}>
                  {client.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        {!configured ? (
          <div className="admin-status-note">DATABASE_URL ist nicht konfiguriert.</div>
        ) : properties.length === 0 ? (
          <div className="admin-status-note">Für diesen Filter gibt es noch keine Objekte.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Objekt</th>
                  <th>Kunde</th>
                  <th>Status</th>
                  <th>Reels</th>
                  <th>Views / Reach</th>
                  <th>Leads</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td><strong>{property.title}</strong><span>{property.external_key}</span><span>{property.district || property.city}</span></td>
                    <td>{property.client_name}</td>
                    <td><strong>{objectStatusLabel(property.status)}</strong><span>Fotos: {rightsStatusLabel(property.photo_rights_status)}</span></td>
                    <td>{property.post_count}</td>
                    <td><strong>{metricValue(property.views)} / {metricValue(property.reach)}</strong><span>{metricValue(property.saves)} Saves · {metricValue(property.shares)} Shares</span></td>
                    <td><strong>{property.lead_count}</strong><span>{property.hot_leads} hot · {property.warm_leads} warm</span></td>
                    <td><Link className="admin-small-link" href={`/admin/objects/${property.id}`}>Öffnen</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Neues Objekt</h2></div></div>
        <ObjectCreateForm clients={clients} projects={projects} />
      </section>
    </main>
  )
}
