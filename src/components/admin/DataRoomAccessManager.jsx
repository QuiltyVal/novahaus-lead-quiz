'use client'

import { useMemo, useState } from 'react'
import { adminFetch } from '@/lib/adminFetch'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function DataRoomAccessManager({ clients, initialTokens }) {
  const [tenantId, setTenantId] = useState(clients[0]?.id || '')
  const [tokens, setTokens] = useState(initialTokens)
  const [generatedLink, setGeneratedLink] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const activeTokens = useMemo(
    () => tokens.filter((token) => !token.revoked_at),
    [tokens]
  )

  async function createLink() {
    setBusy(true)
    setGeneratedLink('')
    setStatus('')
    try {
      const response = await adminFetch('/admin/clients/access-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      setTokens((current) => [result.record, ...current])
      setGeneratedLink(`${window.location.origin}/kunde/${result.token}`)
      setStatus('Link erstellt. Er wird nur jetzt vollständig angezeigt.')
    } catch (error) {
      setStatus(error.message || 'Link konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(generatedLink)
    setStatus('Link wurde kopiert.')
  }

  async function revokeLink(tokenId) {
    if (!window.confirm('Diesen Data-Room-Link wirklich widerrufen?')) return
    setBusy(true)
    setStatus('')
    try {
      const response = await adminFetch('/admin/clients/access-tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setTokens((current) => current.map((token) => (
        token.id === tokenId ? { ...token, revoked_at: result.record.revoked_at } : token
      )))
      setStatus('Link wurde widerrufen.')
    } catch (error) {
      setStatus(error.message || 'Link konnte nicht widerrufen werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-draft-form">
      <div className="admin-form-grid">
        <label>
          Kunde
          <select
            className="admin-input"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            disabled={busy}
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </label>
        <div className="admin-form-actions admin-token-action">
          <button
            className="admin-primary-button"
            type="button"
            onClick={createLink}
            disabled={busy || !tenantId}
          >
            Neuen Zugangslink erstellen
          </button>
        </div>
      </div>

      {generatedLink ? (
        <div className="admin-token-result">
          <code>{generatedLink}</code>
          <button className="admin-primary-button" type="button" onClick={copyLink}>
            Link kopieren
          </button>
        </div>
      ) : null}
      {status ? <div className="admin-status-note">{status}</div> : null}

      {activeTokens.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-token-table">
            <thead>
              <tr>
                <th>Kunde</th>
                <th>Token</th>
                <th>Erstellt</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {activeTokens.map((token) => (
                <tr key={token.id}>
                  <td>{clients.find((client) => client.id === token.tenant_id)?.name || token.tenant_id}</td>
                  <td><code>{token.token_prefix}…</code></td>
                  <td>{formatDate(token.created_at)}</td>
                  <td>
                    <button
                      className="admin-primary-button admin-delete-button"
                      type="button"
                      onClick={() => revokeLink(token.id)}
                      disabled={busy}
                    >
                      Widerrufen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-status-note">Noch kein aktiver Data-Room-Link.</div>
      )}
    </div>
  )
}
