'use client'

import { useMemo, useState } from 'react'

export default function ObjectCreateForm({ clients, projects }) {
  const initialClient = clients.find((client) => client.id === 'augenblick')?.id || clients[0]?.id || ''
  const [tenantId, setTenantId] = useState(initialClient)
  const [projectId, setProjectId] = useState(
    projects.find((project) => project.tenant_id === initialClient)?.id || ''
  )
  const clientProjects = useMemo(
    () => projects.filter((project) => project.tenant_id === tenantId),
    [projects, tenantId]
  )

  function changeClient(nextTenantId) {
    setTenantId(nextTenantId)
    setProjectId(projects.find((project) => project.tenant_id === nextTenantId)?.id || '')
  }

  return (
    <form className="admin-form-grid" action="/admin/objects/create" method="post">
      <label>
        Клиент
        <select className="admin-input" name="tenant_id" value={tenantId} onChange={(event) => changeClient(event.target.value)} required>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>

      <label>
        Проект
        <select className="admin-input" name="project_id" required value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="" disabled>Выбрать проект</option>
          {clientProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>

      <label>
        Object key
        <input className="admin-input" name="external_key" placeholder="nauendorfer-2" required />
      </label>

      <label>
        Название
        <input className="admin-input" name="title" placeholder="Nauendorfer Straße 2" required />
      </label>

      <label>
        Внутренняя адресная метка
        <input className="admin-input" name="address_label" />
      </label>

      <label>
        Район
        <input className="admin-input" name="district" placeholder="Plagwitz" />
      </label>

      <label>
        Город
        <input className="admin-input" name="city" defaultValue="Leipzig" />
      </label>

      <label>
        Статус
        <select className="admin-input" name="status" defaultValue="draft">
          <option value="draft">Entwurf</option>
          <option value="active">Aktiv</option>
          <option value="reserved">Reserviert</option>
          <option value="sold">Verkauft</option>
          <option value="archived">Archiviert</option>
        </select>
      </label>

      <label>
        Права на фото
        <select className="admin-input" name="photo_rights_status" defaultValue="open">
          <option value="open">Offen</option>
          <option value="requested">Angefragt</option>
          <option value="confirmed">Bestätigt</option>
          <option value="not_required">Nicht erforderlich</option>
          <option value="blocked">Blockiert</option>
        </select>
      </label>

      <label className="admin-form-wide">
        Заметки
        <textarea className="admin-textarea admin-textarea-compact" name="notes" />
      </label>

      <div className="admin-form-actions admin-form-wide">
        <button className="admin-primary-button" type="submit">Objekt anlegen</button>
      </div>
    </form>
  )
}
