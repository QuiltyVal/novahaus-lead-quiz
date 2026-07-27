'use client'

import { useMemo, useState } from 'react'
import { CONTENT_CLASSES } from '@/lib/contentValidation'

export default function ContentCreateForm({ clients, accounts, properties, experiments = [] }) {
  const initialClient = clients.find((client) => client.id === 'augenblick')?.id || clients[0]?.id || ''
  const [tenantId, setTenantId] = useState(initialClient)
  const [reelCode, setReelCode] = useState('')
  const [title, setTitle] = useState('')
  const [contentClass, setContentClass] = useState('')
  const [hypothesis, setHypothesis] = useState('')

  const clientProperties = useMemo(
    () => properties.filter((property) => property.tenant_id === tenantId && property.status !== 'archived'),
    [properties, tenantId]
  )
  const clientAccounts = useMemo(
    () => accounts.filter((account) => account.owner_tenant_id === tenantId),
    [accounts, tenantId]
  )
  const clientExperiments = useMemo(
    () => experiments.filter((experiment) => experiment.tenant_id === tenantId),
    [experiments, tenantId]
  )
  function applyExperiment(experimentId) {
    const experiment = clientExperiments.find((candidate) => candidate.id === experimentId)
    if (!experiment) return
    setReelCode(experiment.reel_code)
    setTitle(experiment.title)
    setContentClass(experiment.content_class || '')
    setHypothesis(experiment.hypothesis || '')
  }

  return (
    <form className="admin-form-grid" action="/admin/content/create" method="post">
      <label>
        Клиент
        <select className="admin-input" name="tenant_id" value={tenantId} onChange={(event) => setTenantId(event.target.value)} required>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </label>

      <label>
        Instagram-аккаунт публикации
        <select className="admin-input" name="account_id" required defaultValue="" key={tenantId}>
          <option value="" disabled>Выбрать аккаунт</option>
          {clientAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              @{account.handle}{account.owner_name ? ` · ${account.owner_name}` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-form-wide">
        Предзарегистрированная Growth-Lab карта
        <select className="admin-input" defaultValue="" onChange={(event) => applyExperiment(event.target.value)}>
          <option value="">Без выбора / заполнить вручную</option>
          {clientExperiments.map((experiment) => (
            <option key={experiment.id} value={experiment.id}>
              {experiment.reel_code} · {experiment.content_class} · {experiment.title}
            </option>
          ))}
        </select>
        <span className="admin-help">Выбор переносит замороженные class/hypothesis в публикацию.</span>
      </label>

      <label>
        Reel code
        <input className="admin-input" name="reel_code" placeholder="reel-012" required value={reelCode} onChange={(event) => setReelCode(event.target.value)} />
      </label>

      <label>
        Название
        <input className="admin-input" name="title" placeholder="Plagwitz am Wasser" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>

      <label>
        Цель
        <select className="admin-input" name="purpose" defaultValue="engagement" required>
          <option value="engagement">Engagement</option>
          <option value="property">Objekt</option>
          <option value="conversion">Conversion</option>
          <option value="b2b_demo">B2B demo</option>
        </select>
      </label>

      <label>
        Формат
        <input className="admin-input" name="format_slug" placeholder="pov_tour" required />
      </label>

      <label className="admin-form-wide">
        Pillars через запятую
        <input className="admin-input" name="pillar_slugs" placeholder="leipzig_local, consumer_choice_utility" />
      </label>

      <label>
        Growth Lab class
        <select className="admin-input" name="content_class" value={contentClass} onChange={(event) => setContentClass(event.target.value)}>
          <option value="">Не применяется</option>
          {CONTENT_CLASSES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>

      <label className="admin-form-wide">
        Growth Lab hypothesis
        <textarea
          className="admin-textarea admin-textarea-compact"
          name="hypothesis"
          value={hypothesis}
          onChange={(event) => setHypothesis(event.target.value)}
          placeholder="Что ожидаем, почему и какой сигнал должен измениться"
        />
        <span className="admin-help">Для нового Growth-Lab теста сначала используй предрегистрацию выше. `class` без hypothesis допустим только для legacy/backfill; при публикации предзарегистрированная пара должна совпасть.</span>
      </label>

      <label>
        Дата публикации
        <input className="admin-input" name="published_on" type="date" required />
      </label>

      <label>
        Точное время, если известно
        <input className="admin-input" name="published_at" type="datetime-local" />
      </label>

      <label className="admin-form-wide">
        Instagram Reel URL
        <input className="admin-input" name="permalink" type="url" placeholder="https://www.instagram.com/account/reel/.../" required />
      </label>

      <label>
        CTA type
        <input className="admin-input" name="cta_type" placeholder="forced_choice_comment" />
      </label>

      <label>
        Tracking key, если используется
        <input className="admin-input" name="tracking_key" placeholder="srm-nauendorfer-01" />
      </label>

      <label className="admin-form-wide">
        Объекты
        <select className="admin-input admin-multi-select" name="property_ids" multiple size={Math.min(Math.max(clientProperties.length, 3), 7)}>
          {clientProperties.length ? clientProperties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.title} · {property.external_key}
            </option>
          )) : <option disabled>У клиента пока нет объектов</option>}
        </select>
        <span className="admin-help">Для нескольких объектов удерживай Cmd. Engagement Reel можно оставить без объекта.</span>
      </label>

      <label className="admin-form-wide">
        Caption
        <textarea className="admin-textarea admin-textarea-compact" name="caption" />
      </label>

      <label className="admin-form-wide">
        CTA / примечание к переходу
        <input className="admin-input" name="cta" />
      </label>

      <label className="admin-form-wide">
        Manifest path
        <input className="admin-input" name="manifest_path" placeholder="nova-haus-organic-engine/editor/manifests/..." />
      </label>

      <label className="admin-form-wide">
        Final file path
        <input className="admin-input" name="final_file_path" placeholder="nova-haus-organic-engine/editor/renders/..." />
      </label>

      <label className="admin-form-wide">
        Внутренние заметки
        <textarea className="admin-textarea admin-textarea-compact" name="video_notes" />
      </label>

      <div className="admin-form-actions admin-form-wide">
        <button className="admin-primary-button" type="submit">Reel registrieren</button>
      </div>
    </form>
  )
}
