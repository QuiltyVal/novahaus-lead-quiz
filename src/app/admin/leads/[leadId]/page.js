import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeadDetail } from '@/lib/leadStore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value))
}

function getSegmentClass(segment) {
  return `lead-pill lead-pill--${segment || 'unknown'}`
}

function getDraftLabel(draft) {
  if (!draft) return 'Kein Draft'
  if (draft.provider === 'template') return 'Template Draft'
  return `AI Draft · ${draft.provider}${draft.model ? ` · ${draft.model}` : ''}`
}

function StatusMessage({ searchParams }) {
  if (searchParams?.sent === '1') {
    return (
      <div className="admin-status-note admin-status-note--success">
        Reviewed Draft wurde über Resend/SMTP gesendet.
      </div>
    )
  }

  if (searchParams?.error) {
    return (
      <div className="admin-status-note admin-status-note--error">
        Versand nicht abgeschlossen: {searchParams.error}
      </div>
    )
  }

  return null
}

function Field({ label, value }) {
  return (
    <div className="admin-field">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}

function getReplyText(reply) {
  const payload = reply?.payload && typeof reply.payload === 'object' ? reply.payload : {}
  return payload.text || 'Keine Textantwort im Inbound-Event.'
}

function DatabaseSetupState() {
  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <h1>Datenbank noch nicht verbunden</h1>
        <p>Setze <code>DATABASE_URL</code>, damit Lead-Details und Drafts angezeigt werden können.</p>
      </section>
    </main>
  )
}

export default async function LeadDetailPage({ params, searchParams }) {
  const result = await getLeadDetail(params.leadId)

  if (!result.configured) {
    return <DatabaseSetupState />
  }

  if (!result.lead) {
    notFound()
  }

  const { lead, drafts, replies } = result
  const draft = drafts[0] || null
  const isDraftSent = draft?.status === 'sent'
  const raw = lead.raw && typeof lead.raw === 'object' ? lead.raw : {}

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">NovaHaus Admin</p>
          <h1>{lead.name || 'Lead Detail'}</h1>
        </div>
        <div className="admin-actions">
          <Link className="admin-link-button" href="/admin/leads">
            Zurück zur Inbox
          </Link>
          <Link className="admin-link-button" href="/">
            Zur Website
          </Link>
        </div>
      </header>

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Lead Profil</h2>
              <p>Kontakt, Segment und nächster Schritt aus der Quiz-Qualifizierung.</p>
            </div>
            <span className={getSegmentClass(lead.segment)}>
              {lead.priority} · {lead.segment}
            </span>
          </div>

          <div className="admin-field-grid">
            <Field label="E-Mail" value={lead.email} />
            <Field label="Telefon" value={lead.phone} />
            <Field label="Objekt" value={lead.wohnung_label} />
            <Field label="Zeitrahmen" value={lead.purchase_timeline_label} />
            <Field label="Eigenkapital" value={lead.equity_bucket_label} />
            <Field label="Finanzierung" value={lead.financing_status_label} />
            <Field label="Nächster Schritt" value={lead.next_best_action || lead.next_action} />
            <Field label="Assigned To" value={lead.assigned_to} />
            <Field label="Status" value={lead.status} />
            <Field label="Eingang" value={formatDate(lead.created_at)} />
            <Field label="Consent" value={lead.consent_contact ? 'Ja' : 'Nein'} />
          </div>

          {raw.duplicate && (
            <div className="admin-status-note">
              Duplicate Lead: Eine frühere Anfrage mit dieser E-Mail existiert bereits.
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Reviewed Email Draft</h2>
              <p>
                Dieser Text wird nicht automatisch als AI-Mail verschickt. Prüfen, anpassen,
                dann manuell senden.
              </p>
            </div>
            <span className="admin-draft-badge">{getDraftLabel(draft)}</span>
          </div>

          <StatusMessage searchParams={searchParams} />

          {draft ? (
            <form
              className="admin-draft-form"
              method="post"
              action={`/admin/leads/${lead.lead_id}/send-draft`}
            >
              <input type="hidden" name="draft_id" value={draft.id} />
              <label>
                Betreff
                <input
                  className="admin-input"
                  name="subject"
                  defaultValue={draft.subject}
                  disabled={isDraftSent}
                />
              </label>
              <label>
                E-Mail Text
                <textarea
                  className="admin-textarea"
                  name="body"
                  defaultValue={draft.body}
                  rows={14}
                  disabled={isDraftSent}
                />
              </label>
              <div className="admin-draft-footer">
                <span>
                  Status: <strong>{draft.status}</strong> · Erstellt: {formatDate(draft.created_at)}
                </span>
                <button className="admin-primary-button" type="submit" disabled={isDraftSent}>
                  {isDraftSent ? 'Bereits gesendet' : 'Reviewed Draft senden'}
                </button>
              </div>
            </form>
          ) : (
            <div className="admin-code-block">
              <span>Noch kein E-Mail-Draft für diesen Lead.</span>
              <span>
                Neue Leads erzeugen automatisch einen Template Draft oder, wenn
                `AI_EMAIL_PROVIDER` konfiguriert ist, einen AI Draft.
              </span>
            </div>
          )}
        </section>

        <section className="admin-panel admin-detail-wide">
          <div className="admin-panel-heading">
            <div>
              <h2>Antworten</h2>
              <p>Antworten, die über Resend Inbound empfangen und dem Lead zugeordnet wurden.</p>
            </div>
          </div>

          {replies?.length > 0 ? (
            <div className="admin-replies">
              {replies.map((reply) => (
                <article className="admin-reply" key={reply.id}>
                  <div className="admin-reply-header">
                    <strong>Antwort erhalten</strong>
                    <span>{formatDate(reply.created_at)}</span>
                  </div>
                  <p className="admin-reply-text">{getReplyText(reply)}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-code-block">
              <span>Noch keine Antworten für diesen Lead.</span>
              <span>
                Wenn der Kontakt auf die geprüfte E-Mail antwortet, erscheint die Antwort hier.
              </span>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
