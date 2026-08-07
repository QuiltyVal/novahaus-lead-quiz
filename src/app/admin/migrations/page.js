import AdminNav from '@/components/AdminNav'
import {
  ApplyMigrationsForm,
  BaselineMigrationForm,
  UnbaselineMigrationForm,
} from '@/components/admin/MigrationForms'
import {
  getAdminMigrationStatus,
  safeMigrationError,
} from '@/lib/adminMigrations'

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

function parseMigrationList(value) {
  if (!value || Array.isArray(value)) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((filename) => typeof filename === 'string')
      : []
  } catch {
    return []
  }
}

function OperationResult({ params }) {
  const operation = params?.operation
  if (!operation) return null

  const applied = parseMigrationList(params.applied)
  const skipped = parseMigrationList(params.skipped)
  const baselined = typeof params.baselined === 'string' ? [params.baselined] : []
  const unbaselined = typeof params.unbaselined === 'string' ? [params.unbaselined] : []
  const error = typeof params.error === 'string' ? params.error : ''
  const successful = !error

  const heading = {
    baseline: 'Baseline-Ergebnis',
    unbaseline: 'Markierung entfernt',
  }[operation] || 'Migrationslauf-Ergebnis'

  return (
    <section
      className={`admin-flash admin-operation-result ${
        successful ? 'admin-status-note--success' : 'admin-status-note--error'
      }`}
      aria-live="polite"
    >
      <strong>{heading}</strong>
      <span>
        Angewendet: {applied.length > 0 ? applied.join(', ') : 'keine'}
      </span>
      <span>
        Nur markiert: {baselined.length > 0 ? baselined.join(', ') : 'keine'}
      </span>
      {unbaselined.length > 0 ? (
        <span>Wieder ausstehend: {unbaselined.join(', ')}</span>
      ) : null}
      <span>
        Übersprungen: {skipped.length > 0 ? skipped.join(', ') : 'keine'}
      </span>
      {error ? <span>Fehler: {error}</span> : null}
    </section>
  )
}

export default async function MigrationsAdminPage({ searchParams }) {
  const params = await searchParams
  let status = {
    tableExists: false,
    migrations: [],
  }
  let databaseError = ''

  try {
    status = await getAdminMigrationStatus()
  } catch (error) {
    databaseError = safeMigrationError(error)
  }

  const pendingCount = status.migrations.filter(
    (migration) => migration.status === 'pending'
  ).length

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Operations</p>
          <h1>Datenbank-Migrationen</h1>
        </div>
        <a className="admin-link-button" href="/">Zur Website</a>
      </header>
      <AdminNav active="migrations" />

      <OperationResult params={params} />

      {databaseError ? (
        <section className="admin-panel">
          <h2>Status konnte nicht geladen werden</h2>
          <div className="admin-status-note admin-status-note--error">
            {databaseError}
          </div>
        </section>
      ) : (
        <>
          {!status.tableExists ? (
            <section className="admin-panel admin-section-gap">
              <h2>Migrationsjournal fehlt</h2>
              <p>
                Wenn die SQL-Dateien in dieser Datenbank bereits manuell ausgeführt
                wurden, markiere sie einzeln mit „Nur markieren“. Dabei wird das
                Migrations-SQL nicht ausgeführt.
              </p>
              <div className="admin-status-note admin-status-note--error">
                Nicht „Alle ausstehenden anwenden“ wählen, wenn diese Änderungen
                bereits manuell in der Datenbank vorhanden sind.
              </div>
            </section>
          ) : null}

          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Migrationsstatus</h2>
                <p>
                  {status.migrations.length} Datei(en), davon {pendingCount} ausstehend.
                </p>
              </div>
              <ApplyMigrationsForm pendingCount={pendingCount} />
            </div>

            {status.migrations.length === 0 ? (
              <div className="admin-status-note">Keine Migrationsdateien gefunden.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-migrations-table">
                  <thead>
                    <tr>
                      <th>Datei</th>
                      <th>Status</th>
                      <th>Angewendet am</th>
                      <th>SHA-256</th>
                      <th>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.migrations.map((migration) => (
                      <tr key={migration.filename}>
                        <td><strong>{migration.filename}</strong></td>
                        <td>
                          <span
                            className={`admin-migration-status admin-migration-status--${migration.status}`}
                          >
                            {migration.status === 'applied' ? 'APPLIED' : 'PENDING'}
                          </span>
                        </td>
                        <td>{formatDate(migration.appliedAt)}</td>
                        <td>
                          <code className="admin-migration-hash">{migration.sha256}</code>
                        </td>
                        <td>
                          {migration.status === 'pending' ? (
                            <BaselineMigrationForm filename={migration.filename} />
                          ) : (
                            <UnbaselineMigrationForm filename={migration.filename} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
