'use client'

export function ApplyMigrationsForm({ pendingCount }) {
  function confirmApplication(event) {
    const confirmed = window.confirm(
      `${pendingCount} ausstehende Migration(en) jetzt in der Datenbank ausführen?`
    )

    if (!confirmed) event.preventDefault()
  }

  return (
    <form
      method="post"
      action="/admin/migrations/apply"
      onSubmit={confirmApplication}
    >
      <button
        className="admin-primary-button"
        type="submit"
        disabled={pendingCount === 0}
      >
        Alle ausstehenden anwenden
      </button>
    </form>
  )
}

export function BaselineMigrationForm({ filename }) {
  function confirmBaseline(event) {
    const confirmed = window.confirm(
      `${filename} als angewendet markieren, OHNE das SQL auszuführen?`
    )

    if (!confirmed) event.preventDefault()
  }

  return (
    <form
      method="post"
      action="/admin/migrations/baseline"
      onSubmit={confirmBaseline}
    >
      <input type="hidden" name="filename" value={filename} />
      <button className="admin-primary-button admin-baseline-button" type="submit">
        Nur markieren
      </button>
    </form>
  )
}
