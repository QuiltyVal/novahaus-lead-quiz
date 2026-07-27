import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminNav from '@/components/AdminNav'
import { formatAdminDate, metricValue, purposeLabel } from '@/lib/adminDisplay'
import { getContentPost, isDatabaseConfigured } from '@/lib/contentStore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function MetricField({ name, label, step = '1' }) {
  return (
    <label>
      {label}
      <input className="admin-input" min="0" name={name} step={step} type="number" />
    </label>
  )
}

export default async function ContentDetailPage({ params, searchParams }) {
  const { postId } = await params
  const queryParams = await searchParams
  if (!isDatabaseConfigured()) {
    return <main className="admin-shell"><div className="admin-status-note">DATABASE_URL ist nicht konfiguriert.</div></main>
  }

  let post
  try {
    post = await getContentPost(postId)
  } catch {
    notFound()
  }
  if (!post) notFound()

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="admin-eyebrow">{post.reel_code}</p><h1>{post.title}</h1></div>
        <div className="admin-actions">
          <Link className="admin-link-button" href="/admin/content">Zurück</Link>
          <a className="admin-link-button" href={post.permalink} target="_blank" rel="noreferrer">Instagram</a>
        </div>
      </header>
      <AdminNav active="content" />

      {queryParams?.created ? <div className="admin-flash admin-status-note--success">Reel wurde registriert.</div> : null}
      {queryParams?.metrics ? <div className="admin-flash admin-status-note--success">Snapshot wurde gespeichert.</div> : null}
      {queryParams?.error ? <div className="admin-flash admin-status-note--error">{queryParams.error}</div> : null}

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Reel</h2></div></div>
          <div className="admin-field-grid">
            <div className="admin-field"><span>Kunde</span><strong>{post.client_name}</strong></div>
            <div className="admin-field"><span>Account</span><strong>@{post.account_handle}</strong></div>
            <div className="admin-field"><span>Ziel</span><strong>{purposeLabel(post.purpose)}</strong></div>
            <div className="admin-field"><span>Format</span><strong>{post.format_slug}</strong></div>
            <div className="admin-field"><span>Pillars</span><strong>{post.pillar_slugs.join(', ') || '—'}</strong></div>
            <div className="admin-field"><span>Growth Lab class</span><strong>{post.content_class || '—'}</strong></div>
            <div className="admin-field"><span>Publiziert</span><strong>{formatAdminDate(post.published_on, { withTime: false })}</strong></div>
            <div className="admin-field"><span>Objekte</span><strong>{post.properties.length ? post.properties.map((property) => property.title).join(', ') : 'Kein Objekt'}</strong></div>
            <div className="admin-field"><span>Leads der Objekte</span><strong>{post.lead_count}</strong></div>
          </div>
          {post.content_class ? (
            <div className="admin-status-note">
              <strong>Hypothesis:</strong> {post.hypothesis || 'historical_not_preregistered'}
            </div>
          ) : null}
          {post.manifest_path ? <div className="admin-code-block"><span>{post.manifest_path}</span>{post.final_file_path ? <span>{post.final_file_path}</span> : null}</div> : null}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Insights Snapshot</h2></div></div>
          <form className="admin-form-grid" action={`/admin/content/${post.id}/metrics`} method="post">
            <label>
              Fenster
              <select className="admin-input" name="window_label" defaultValue="manual">
                <option value="24h">24h</option><option value="72h">72h</option><option value="7d">7d</option><option value="30d">30d</option><option value="manual">Manuell</option>
              </select>
            </label>
            <label>
              Zeitpunkt
              <input className="admin-input" name="captured_at" type="datetime-local" />
            </label>
            <MetricField name="views" label="Views" />
            <MetricField name="reach" label="Reach" />
            <MetricField name="likes" label="Likes" />
            <MetricField name="comments" label="Comments" />
            <MetricField name="saves" label="Saves" />
            <MetricField name="shares" label="Shares" />
            <MetricField name="follows" label="Follows" />
            <MetricField name="profile_activity" label="Profile activity" />
            <MetricField name="website_clicks" label="Website clicks" />
            <MetricField name="watch_time_seconds" label="Watch time, s" step="0.01" />
            <MetricField name="average_watch_time_seconds" label="Ø watch time, s" step="0.01" />
            <label className="admin-form-wide">Notiz<input className="admin-input" name="note" /></label>
            <div className="admin-form-actions admin-form-wide"><button className="admin-primary-button" type="submit">Snapshot speichern</button></div>
          </form>
        </section>

        <section className="admin-panel admin-detail-wide">
          <div className="admin-panel-heading"><div><h2>Snapshot-Verlauf</h2></div></div>
          {post.metrics.length === 0 ? <div className="admin-status-note">Noch keine Metriken.</div> : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Zeitpunkt</th><th>Fenster</th><th>Views / Reach</th><th>Interaktionen</th><th>Profil / Follows</th><th>Quelle</th></tr></thead>
                <tbody>{post.metrics.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td>{formatAdminDate(snapshot.captured_at)}</td>
                    <td>{snapshot.window_label}</td>
                    <td><strong>{metricValue(snapshot.views)} / {metricValue(snapshot.reach)}</strong></td>
                    <td><strong>{metricValue(snapshot.likes)} Likes</strong><span>{metricValue(snapshot.comments)} Comments · {metricValue(snapshot.saves)} Saves · {metricValue(snapshot.shares)} Shares</span></td>
                    <td><strong>{metricValue(snapshot.profile_activity)} / {metricValue(snapshot.follows)}</strong><span>{metricValue(snapshot.website_clicks)} Website clicks</span></td>
                    <td><strong>{snapshot.source}</strong><span>{snapshot.note || '—'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel admin-detail-wide">
          <div className="admin-panel-heading"><div><h2>Leads der verknüpften Objekte</h2></div></div>
          {post.leads.length === 0 ? <div className="admin-status-note">Noch keine objektbezogenen Leads.</div> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Lead</th><th>Segment</th><th>Objektantwort</th><th>Eingang</th><th>Aktion</th></tr></thead><tbody>
              {post.leads.map((lead) => <tr key={lead.lead_id}><td><strong>{lead.name || 'Ohne Namen'}</strong><span>{lead.email}</span></td><td>{lead.priority} · {lead.segment}</td><td>{lead.wohnung_label || '—'}</td><td>{formatAdminDate(lead.created_at)}</td><td><Link className="admin-small-link" href={`/admin/leads/${lead.lead_id}`}>Öffnen</Link></td></tr>)}
            </tbody></table></div>
          )}
        </section>
      </div>
    </main>
  )
}
