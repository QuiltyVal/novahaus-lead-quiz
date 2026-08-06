export default function AdminLoginForm({ hasError = false }) {
  return (
    <form className="admin-draft-form" method="post" action="/admin/login">
      <label>
        Benutzername
        <input
          className="admin-input"
          name="username"
          autoComplete="username"
          required
        />
      </label>

      <label>
        Passwort
        <input
          className="admin-input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>

      {hasError ? (
        <div className="admin-status-note admin-status-note--error" role="alert">
          Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.
        </div>
      ) : null}

      <div className="admin-form-actions">
        <button className="admin-primary-button" type="submit">Anmelden</button>
      </div>
    </form>
  )
}
