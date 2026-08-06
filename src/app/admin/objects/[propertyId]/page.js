import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminNav from '@/components/AdminNav'
import VideoForReviewForm from '@/components/admin/VideoForReviewForm'
import { formatAdminDate, metricValue, objectStatusLabel, rightsStatusLabel } from '@/lib/adminDisplay'
import { getPropertyDetail, isDatabaseConfigured } from '@/lib/contentStore'
import { getDataRoomBlobAccess } from '@/lib/dataRoomBlob'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function ObjectDetailPage({ params, searchParams }) {
  const { propertyId } = await params
  const queryParams = await searchParams
  if (!isDatabaseConfigured()) return <main className="admin-shell"><div className="admin-status-note">DATABASE_URL ist nicht konfiguriert.</div></main>

  // A failing query used to be swallowed into notFound(), so a broken lookup
  // was indistinguishable from an object that does not exist.
  let property
  let loadError = ''
  try {
    property = await getPropertyDetail(propertyId)
  } catch (error) {
    console.error(`Object detail failed: property_id=${propertyId} message=${error.message}`)
    loadError = error.message
  }

  if (loadError) {
    return (
      <main className="admin-shell">
        <header className="admin-header">
          <div><h1>Objekt konnte nicht geladen werden</h1></div>
          <Link className="admin-link-button" href="/admin/objects">Zurück</Link>
        </header>
        <AdminNav active="objects" />
        <div className="admin-status-note">{loadError}</div>
      </main>
    )
  }

  if (!property) notFound()

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="admin-eyebrow">{property.external_key}</p><h1>{property.title}</h1></div>
        <Link className="admin-link-button" href="/admin/objects">Zurück</Link>
      </header>
      <AdminNav active="objects" />

      {queryParams?.created ? <div className="admin-flash admin-status-note--success">Objekt wurde angelegt.</div> : null}

      <section className="admin-kpis">
        <div className="admin-kpi"><span>Reels</span><strong>{property.post_count}</strong></div>
        <div className="admin-kpi"><span>Views / Reach</span><strong>{metricValue(property.views)} / {metricValue(property.reach)}</strong></div>
        <div className="admin-kpi"><span>Leads</span><strong>{property.lead_count}</strong></div>
      </section>

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Objektstatus</h2></div></div>
          <div className="admin-field-grid">
            <div className="admin-field"><span>Kunde</span><strong>{property.client_name}</strong></div>
            <div className="admin-field"><span>Projekt</span><strong>{property.project_name || '—'}</strong></div>
            <div className="admin-field"><span>Status</span><strong>{objectStatusLabel(property.status)}</strong></div>
            <div className="admin-field"><span>Bildrechte</span><strong>{rightsStatusLabel(property.photo_rights_status)}</strong></div>
            <div className="admin-field"><span>Nutzung</span><strong>{property.material_usage || '—'}</strong></div>
            <div className="admin-field"><span>Ort</span><strong>{[property.address_label, property.district, property.city].filter(Boolean).join(' · ')}</strong></div>
            <div className="admin-field"><span>Hot / Warm</span><strong>{property.hot_leads} / {property.warm_leads}</strong></div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Ergebnis</h2></div></div>
          <div className="admin-field-grid">
            <div className="admin-field"><span>Views</span><strong>{metricValue(property.views)}</strong></div>
            <div className="admin-field"><span>Reach</span><strong>{metricValue(property.reach)}</strong></div>
            <div className="admin-field"><span>Likes</span><strong>{metricValue(property.likes)}</strong></div>
            <div className="admin-field"><span>Saves / Shares</span><strong>{metricValue(property.saves)} / {metricValue(property.shares)}</strong></div>
          </div>
        </section>

        <section className="admin-panel admin-detail-wide">
          <div className="admin-panel-heading"><div><h2>Video an den Kunden senden</h2></div></div>
          <VideoForReviewForm
            propertyId={property.id}
            tenantId={property.tenant_id}
            blobAccess={getDataRoomBlobAccess()}
          />
        </section>

        <section className="admin-panel admin-detail-wide">
          <div className="admin-panel-heading"><div><h2>Data-Room-Fotos</h2></div></div>
          {property.photos.length === 0 ? <div className="admin-status-note">Noch keine geprüften Fotos hochgeladen.</div> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Datei</th><th>Typ</th><th>Größe</th><th>Upload</th><th>Aktion</th></tr></thead><tbody>
              {property.photos.map((photo) => (
                <tr key={photo.id}>
                  <td><strong>{photo.original_filename}</strong></td>
                  <td>{photo.content_type}</td>
                  <td>{(Number(photo.byte_size) / 1024 / 1024).toFixed(1)} MB</td>
                  <td>{formatAdminDate(photo.uploaded_at)}</td>
                  <td><a className="admin-small-link" href={`/admin/objects/${property.id}/photos/${photo.id}`}>Herunterladen</a></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </section>

        <section className="admin-panel admin-detail-wide">
          <div className="admin-panel-heading"><div><h2>Rechtebestätigungen</h2></div></div>
          {property.rightsConfirmations.length === 0 ? <div className="admin-status-note">Noch keine dokumentierte Bestätigung.</div> : (
            <div className="admin-replies">
              {property.rightsConfirmations.map((confirmation) => (
                <article className="admin-reply" key={confirmation.id}>
                  <div className="admin-reply-header">
                    <strong>{confirmation.confirmed_by_name} · {confirmation.confirmed_by_email}</strong>
                    <span>{formatAdminDate(confirmation.confirmed_at)}</span>
                  </div>
                  <p className="admin-reply-text">{confirmation.confirmation_text}</p>
                  <div className="admin-help">Textversion {confirmation.text_version} · Nutzung {confirmation.material_usage}</div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel admin-detail-wide">
          <div className="admin-panel-heading"><div><h2>Reels zum Objekt</h2></div></div>
          {property.posts.length === 0 ? <div className="admin-status-note">Noch kein Reel verknüpft.</div> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reel</th><th>Account</th><th>Views / Reach</th><th>Leads</th><th>Aktion</th></tr></thead><tbody>
              {property.posts.map((post) => <tr key={post.id}><td><strong>{post.title}</strong><span>{formatAdminDate(post.published_on, { withTime: false })}</span></td><td>@{post.account_handle}</td><td>{metricValue(post.views)} / {metricValue(post.reach)}</td><td>{post.lead_count}</td><td><Link className="admin-small-link" href={`/admin/content/${post.id}`}>Öffnen</Link></td></tr>)}
            </tbody></table></div>
          )}
        </section>

        <section className="admin-panel admin-detail-wide">
          <div className="admin-panel-heading"><div><h2>Leads zum Objekt</h2></div></div>
          {property.leads.length === 0 ? <div className="admin-status-note">Noch keine Leads verknüpft.</div> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Lead</th><th>Segment</th><th>Status</th><th>Eingang</th><th>Aktion</th></tr></thead><tbody>
              {property.leads.map((lead) => <tr key={lead.lead_id}><td><strong>{lead.name || 'Ohne Namen'}</strong><span>{lead.email}</span></td><td>{lead.priority} · {lead.segment}</td><td>{lead.status}</td><td>{formatAdminDate(lead.created_at)}</td><td><Link className="admin-small-link" href={`/admin/leads/${lead.lead_id}`}>Öffnen</Link></td></tr>)}
            </tbody></table></div>
          )}
        </section>
      </div>
    </main>
  )
}
