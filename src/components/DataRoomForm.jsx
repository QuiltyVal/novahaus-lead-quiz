'use client'

import { upload } from '@vercel/blob/client'
import { useMemo, useRef, useState } from 'react'
import {
  DATA_ROOM_MAX_FILE_SIZE,
  DATA_ROOM_MAX_FILES,
  rightsConfirmationText,
  validatePhotoDescriptor,
} from '@/lib/dataRoomValidation'

const EMPTY_FORM = {
  title: '',
  addressLabel: '',
  district: '',
  eckdaten: '',
  usageScope: 'organic',
}

function formatSize(bytes) {
  return `${(Number(bytes) / 1024 / 1024).toFixed(1)} MB`
}

export default function DataRoomForm({ token, initialProperties, styles }) {
  const [properties, setProperties] = useState(initialProperties)
  const [propertyId, setPropertyId] = useState('new')
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmerName, setConfirmerName] = useState('')
  const [confirmerEmail, setConfirmerEmail] = useState('')
  const [rightsAccepted, setRightsAccepted] = useState(false)
  const [files, setFiles] = useState([])
  const [fileProgress, setFileProgress] = useState([])
  const [status, setStatus] = useState({ type: '', message: '' })
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId),
    [properties, propertyId]
  )
  const currentPhotoCount = Number(selectedProperty?.photo_count || 0)
  const remainingSlots = DATA_ROOM_MAX_FILES - currentPhotoCount
  const confirmationText = rightsConfirmationText(form.usageScope)

  function selectProperty(nextId) {
    setPropertyId(nextId)
    setRightsAccepted(false)
    setFiles([])
    setFileProgress([])
    setStatus({ type: '', message: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''

    const property = properties.find((item) => item.id === nextId)
    setForm(property ? {
      title: property.title || '',
      addressLabel: property.address_label || '',
      district: property.district || '',
      eckdaten: property.eckdaten || '',
      usageScope: property.material_usage || 'organic',
    } : EMPTY_FORM)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    if (field === 'usageScope') setRightsAccepted(false)
  }

  function selectFiles(event) {
    const nextFiles = Array.from(event.target.files || [])
    try {
      if (nextFiles.length > remainingSlots) {
        throw new Error(`Für dieses Objekt können noch ${remainingSlots} Foto(s) hochgeladen werden.`)
      }
      nextFiles.forEach((file) => validatePhotoDescriptor(file))
      setFiles(nextFiles)
      setFileProgress(nextFiles.map(() => ({ value: 0, state: 'waiting' })))
      setStatus({ type: '', message: '' })
    } catch (error) {
      event.target.value = ''
      setFiles([])
      setFileProgress([])
      setStatus({ type: 'error', message: error.message })
    }
  }

  function updateProgress(index, patch) {
    setFileProgress((current) => current.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, ...patch } : entry
    )))
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setStatus({ type: '', message: '' })
    let preparation = null

    try {
      const preparationResponse = await fetch(`/api/kunde/${encodeURIComponent(token)}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: propertyId === 'new' ? null : propertyId,
          ...form,
          confirmerName,
          confirmerEmail,
          rightsAccepted,
          files: files.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        }),
      })
      preparation = await preparationResponse.json()
      if (!preparationResponse.ok) throw new Error(preparation.error)

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const slot = preparation.slots[index]
        updateProgress(index, { state: 'uploading', value: 0 })

        await upload(slot.expected_pathname, file, {
          access: preparation.blobAccess,
          handleUploadUrl: `/api/kunde/${encodeURIComponent(token)}/upload`,
          clientPayload: JSON.stringify({ slotId: slot.id }),
          contentType: file.type,
          multipart: file.size > 5 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => {
            updateProgress(index, { value: Math.round(percentage) })
          },
        })

        updateProgress(index, { state: 'checking', value: 100 })
        const finalizeResponse = await fetch(`/api/kunde/${encodeURIComponent(token)}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotId: slot.id }),
        })
        const finalized = await finalizeResponse.json()
        if (!finalizeResponse.ok) throw new Error(finalized.error)
        updateProgress(index, { state: 'ready', value: 100 })
      }

      setProperties((current) => {
        const existing = current.find((property) => property.id === preparation.property.id)
        const nextProperty = {
          ...existing,
          ...preparation.property,
          photo_count: Number(existing?.photo_count || 0) + files.length,
        }
        return existing
          ? current.map((property) => property.id === nextProperty.id ? nextProperty : property)
          : [nextProperty, ...current]
      })
      setPropertyId(preparation.property.id)
      setFiles([])
      setRightsAccepted(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setStatus({
        type: 'success',
        message: `${preparation.slots.length} Foto(s) wurden geprüft und sicher übernommen.`,
      })
    } catch (error) {
      if (preparation?.slots?.length) {
        await fetch(`/api/kunde/${encodeURIComponent(token)}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotIds: preparation.slots.map((slot) => slot.id) }),
        }).catch(() => {})
      }
      setStatus({
        type: 'error',
        message: error.message || 'Der Upload konnte nicht abgeschlossen werden.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <section className={styles.card}>
        <div className={styles.step}>1</div>
        <div className={styles.cardContent}>
          <h2>Objekt</h2>
          {properties.length ? (
            <label className={styles.field}>
              Vorhandenes Objekt oder neues Objekt
              <select value={propertyId} onChange={(event) => selectProperty(event.target.value)}>
                <option value="new">Neues Objekt anlegen</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title} ({property.photo_count}/20 Fotos)
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className={styles.grid}>
            <label className={styles.field}>
              Objektbezeichnung
              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="z. B. Wohnung Karl-Heine-Straße"
                maxLength={200}
                required
              />
            </label>
            <label className={styles.field}>
              Adresse
              <input
                value={form.addressLabel}
                onChange={(event) => updateField('addressLabel', event.target.value)}
                placeholder="Straße, Hausnummer"
                maxLength={300}
              />
            </label>
            <label className={styles.field}>
              Stadtteil
              <input
                value={form.district}
                onChange={(event) => updateField('district', event.target.value)}
                placeholder="z. B. Plagwitz"
                maxLength={120}
              />
            </label>
          </div>
          <label className={styles.field}>
            Eckdaten
            <textarea
              value={form.eckdaten}
              onChange={(event) => updateField('eckdaten', event.target.value)}
              placeholder="Zimmer, Fläche, Besonderheiten, gewünschte Aussagen …"
              maxLength={4000}
              rows={5}
            />
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.step}>2</div>
        <div className={styles.cardContent}>
          <h2>Verwendungszweck</h2>
          <div className={styles.usageGrid}>
            {[
              ['organic', 'Organic', 'Unbezahlte Social-Media-Inhalte'],
              ['paid', 'Paid', 'Bezahlte Werbeanzeigen'],
              ['both', 'Beides', 'Organic und Paid'],
            ].map(([value, label, hint]) => (
              <label
                key={value}
                className={`${styles.usageOption} ${form.usageScope === value ? styles.usageOptionActive : ''}`}
              >
                <input
                  type="radio"
                  name="usageScope"
                  value={value}
                  checked={form.usageScope === value}
                  onChange={(event) => updateField('usageScope', event.target.value)}
                />
                <strong>{label}</strong>
                <span>{hint}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.step}>3</div>
        <div className={styles.cardContent}>
          <h2>Fotos</h2>
          <p className={styles.hint}>
            JPEG, PNG oder WebP · maximal 15 MB pro Datei · noch {remainingSlots} von 20 Plätzen frei
          </p>
          <label className={styles.filePicker}>
            <span>Fotos auswählen</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={selectFiles}
              disabled={busy || remainingSlots === 0}
              required={files.length === 0}
            />
          </label>

          {files.length ? (
            <ul className={styles.fileList}>
              {files.map((file, index) => {
                const progress = fileProgress[index]
                return (
                  <li key={`${file.name}-${file.lastModified}-${index}`}>
                    <div>
                      <strong>{file.name}</strong>
                      <span>{formatSize(file.size)}</span>
                    </div>
                    <span className={styles.fileState}>
                      {progress?.state === 'ready' ? 'Geprüft' :
                        progress?.state === 'checking' ? 'Prüfung …' :
                          progress?.state === 'uploading' ? `${progress.value}%` : 'Bereit'}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.step}>4</div>
        <div className={styles.cardContent}>
          <h2>Rechte bestätigen</h2>
          <div className={styles.grid}>
            <label className={styles.field}>
              Vor- und Nachname
              <input
                value={confirmerName}
                onChange={(event) => setConfirmerName(event.target.value)}
                autoComplete="name"
                maxLength={160}
                required
              />
            </label>
            <label className={styles.field}>
              E-Mail-Adresse
              <input
                type="email"
                value={confirmerEmail}
                onChange={(event) => setConfirmerEmail(event.target.value)}
                autoComplete="email"
                maxLength={320}
                required
              />
            </label>
          </div>

          <label className={styles.confirmation}>
            <input
              type="checkbox"
              checked={rightsAccepted}
              onChange={(event) => setRightsAccepted(event.target.checked)}
              required
            />
            <span>{confirmationText}</span>
          </label>
          <p className={styles.auditNote}>
            Wir speichern diese Erklärung mit Ihrem Namen, Ihrer E-Mail-Adresse,
            dem Zeitpunkt, der Textversion und dem exakten Wortlaut.
          </p>
        </div>
      </section>

      {status.message ? (
        <div className={status.type === 'success' ? styles.success : styles.error} role="status">
          {status.message}
        </div>
      ) : null}

      <button
        className={styles.submit}
        type="submit"
        disabled={busy || files.length === 0 || !rightsAccepted}
      >
        {busy ? 'Fotos werden hochgeladen und geprüft …' : 'Angaben bestätigen und Fotos hochladen'}
      </button>

      <p className={styles.footerNote}>
        Die Dateien werden direkt in den Projekt-Speicher übertragen.
        Schließen Sie diese Seite erst nach der Erfolgsbestätigung.
      </p>
    </form>
  )
}
