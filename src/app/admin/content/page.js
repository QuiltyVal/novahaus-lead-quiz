import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import ContentCreateForm from '@/components/admin/ContentCreateForm'
import GrowthLabPreregisterForm from '@/components/admin/GrowthLabPreregisterForm'
import { formatAdminDate, metricValue, purposeLabel } from '@/lib/adminDisplay'
import {
  listClients,
  listContentAccounts,
  listContentExperiments,
  listContentPosts,
  listProperties,
} from '@/lib/contentStore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function ContentAdminPage({ searchParams }) {
  const params = await searchParams
  const tenantFilter = String(params?.tenant || '').trim()
  const purposeFilter = String(params?.purpose || '').trim()
  let configured = false
  let posts = []
  let clients = []
  let accounts = []
  let properties = []
  let experiments = []
  let databaseError = ''

  try {
    const [postResult, clientResult, accountRows, propertyResult, experimentResult] = await Promise.all([
      listContentPosts({ tenantId: tenantFilter, purpose: purposeFilter }),
      listClients(),
      listContentAccounts(),
      listProperties(),
      listContentExperiments({ tenantId: tenantFilter }),
    ])
    configured = postResult.configured
    posts = postResult.posts
    clients = clientResult.clients
    accounts = accountRows
    properties = propertyResult.properties
    experiments = experimentResult.experiments
  } catch (error) {
    configured = true
    databaseError = error.message
  }

  const latestViews = posts.reduce((sum, post) => sum + Number(post.views || 0), 0)
  const latestReach = posts.reduce((sum, post) => sum + Number(post.reach || 0), 0)
  const objectPosts = posts.filter((post) => post.properties.length > 0).length

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Operations</p>
          <h1>Content</h1>
        </div>
        <a className="admin-link-button" href="/">Zur Website</a>
      </header>
      <AdminNav active="content" />

      {params?.error ? <div className="admin-flash admin-status-note--error">{params.error}</div> : null}
      {params?.preregistered ? <div className="admin-flash admin-status-note--success">Growth-Lab карта {params.preregistered} сохранена до публикации.</div> : null}
      {databaseError ? <div className="admin-flash admin-status-note--error">{databaseError}</div> : null}

      <section className="admin-kpis" aria-label="Content overview">
        <div className="admin-kpi"><span>Reels</span><strong>{posts.length}</strong></div>
        <div className="admin-kpi"><span>Views / Reach</span><strong>{metricValue(latestViews)} / {metricValue(latestReach)}</strong></div>
        <div className="admin-kpi"><span>Mit Objekt</span><strong>{objectPosts}</strong></div>
      </section>

      <section className="admin-panel admin-section-gap">
        <div className="admin-panel-heading">
          <div>
            <h2>Growth Lab · предрегистрация</h2>
            <p>Class и hypothesis фиксируются на video-level до публикации. Исторический backfill hypothesis не создаёт.</p>
          </div>
        </div>
        {experiments.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Reel</th><th>Клиент</th><th>Class</th><th>Hypothesis</th><th>Статус</th></tr></thead>
              <tbody>{experiments.map((experiment) => (
                <tr key={experiment.id}>
                  <td><strong>{experiment.title}</strong><span>{experiment.reel_code}</span></td>
                  <td>{experiment.client_name}</td>
                  <td>{experiment.content_class}</td>
                  <td>{experiment.hypothesis}</td>
                  <td>{experiment.status}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="admin-status-note">Нет предзарегистрированных draft/ready экспериментов.</div>}
        <GrowthLabPreregisterForm clients={clients} />
      </section>

      <section className="admin-panel admin-section-gap">
        <div className="admin-panel-heading">
          <div>
            <h2>Veröffentlichte Reels</h2>
            <div className="admin-filter-row">
              <a className={!tenantFilter && !purposeFilter ? 'admin-small-link active' : 'admin-small-link'} href="/admin/content">Alle</a>
              {clients.map((client) => (
                <a key={client.id} className={tenantFilter === client.id ? 'admin-small-link active' : 'admin-small-link'} href={`/admin/content?tenant=${client.id}`}>
                  {client.name}
                </a>
              ))}
            </div>
            <div className="admin-filter-row">
              {['engagement', 'property', 'conversion', 'b2b_demo'].map((purpose) => (
                <a key={purpose} className={purposeFilter === purpose ? 'admin-small-link active' : 'admin-small-link'} href={`/admin/content?purpose=${purpose}${tenantFilter ? `&tenant=${tenantFilter}` : ''}`}>
                  {purposeLabel(purpose)}
                </a>
              ))}
            </div>
          </div>
        </div>

        {!configured ? (
          <div className="admin-status-note">DATABASE_URL ist nicht konfiguriert.</div>
        ) : posts.length === 0 ? (
          <div className="admin-status-note">Für diesen Filter gibt es noch keine Reels.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-content-table">
              <thead>
                <tr>
                  <th>Reel</th>
                  <th>Kunde / Account</th>
                  <th>Ziel / Format</th>
                  <th>Growth Lab</th>
                  <th>Objekte</th>
                  <th>Letzter Snapshot</th>
                  <th>Leads</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td><strong>{post.title}</strong><span>{post.reel_code} · {formatAdminDate(post.published_on, { withTime: false })}</span></td>
                    <td><strong>{post.client_name}</strong><span>@{post.account_handle}</span></td>
                    <td><strong>{purposeLabel(post.purpose)}</strong><span>{post.format_slug}</span><span>{post.pillar_slugs.join(', ') || '—'}</span></td>
                    <td><strong>{post.content_class || '—'}</strong><span>{post.hypothesis || (post.content_class ? 'historical_not_preregistered' : '—')}</span></td>
                    <td>{post.properties.length ? post.properties.map((property) => property.title).join(', ') : '—'}</td>
                    <td><strong>{metricValue(post.views)} Views · {metricValue(post.reach)} Reach</strong><span>{metricValue(post.saves)} Saves · {metricValue(post.shares)} Shares · {metricValue(post.follows)} Follows</span><span>{post.metrics_captured_at ? `${post.metrics_window} · ${formatAdminDate(post.metrics_captured_at)}` : 'Noch keine Metriken'}</span></td>
                    <td>{post.lead_count}</td>
                    <td><Link className="admin-small-link" href={`/admin/content/${post.id}`}>Öffnen</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Reel registrieren</h2><p>Nach der manuellen Veröffentlichung einmalig anlegen.</p></div></div>
        <ContentCreateForm clients={clients} accounts={accounts} properties={properties} experiments={experiments} />
      </section>
    </main>
  )
}
