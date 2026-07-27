'use client'

import { useState } from 'react'
import { CONTENT_CLASSES } from '@/lib/contentValidation'

export default function GrowthLabPreregisterForm({ clients }) {
  const initialClient = clients.find((client) => client.id === 'augenblick')?.id || clients[0]?.id || ''
  const [tenantId, setTenantId] = useState(initialClient)

  return (
    <form className="admin-form-grid" action="/admin/content/preregister" method="post">
      <label>
        Клиент
        <select className="admin-input" name="tenant_id" value={tenantId} onChange={(event) => setTenantId(event.target.value)} required>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>

      <label>
        Reel code
        <input className="admin-input" name="reel_code" placeholder="reel-018-test-a" required />
      </label>

      <label className="admin-form-wide">
        Рабочее название
        <input className="admin-input" name="title" placeholder="Frozen moment · short hook variant" required />
      </label>

      <label>
        Class
        <select className="admin-input" name="content_class" defaultValue="" required>
          <option value="" disabled>Выбрать класс</option>
          {CONTENT_CLASSES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>

      <label className="admin-form-wide">
        Hypothesis
        <textarea
          className="admin-textarea admin-textarea-compact"
          name="hypothesis"
          placeholder="Что ожидаем, почему и какой сигнал должен измениться"
          required
        />
        <span className="admin-help">Сохраняется до публикации. После публикации class/hypothesis через этот маршрут не переписываются.</span>
      </label>

      <div className="admin-form-actions admin-form-wide">
        <button className="admin-primary-button" type="submit">Growth-Lab карту предзарегистрировать</button>
      </div>
    </form>
  )
}
