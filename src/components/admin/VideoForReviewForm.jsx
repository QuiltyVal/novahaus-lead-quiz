'use client'

import { upload } from '@vercel/blob/client'
import { useRef, useState } from 'react'
import { adminFetch } from '@/lib/adminFetch'
import {
  validateVideoDescriptor,
  VIDEO_REVIEW_CONTENT_TYPE,
} from '@/lib/videoReviewUpload'

function formatSize(bytes) {
  return `${(Number(bytes) / 1024 / 1024).toFixed(1)} MB`
}

export default function VideoForReviewForm({ propertyId, tenantId, blobAccess }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('waiting')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)

  function selectFile(event) {
    const nextFile = event.target.files?.[0] || null
    try {
      if (nextFile) validateVideoDescriptor(nextFile)
      setFile(nextFile)
      setProgress(0)
      setStage('waiting')
      setStatus({ type: '', message: '' })
    } catch (error) {
      event.target.value = ''
      setFile(null)
      setProgress(0)
      setStage('waiting')
      setStatus({ type: 'error', message: error.message })
    }
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setProgress(0)
    setStage('uploading')
    setStatus({ type: '', message: '' })

    try {
      validateVideoDescriptor(file)
      const pathname = `client-videos/${tenantId}/${propertyId}/${crypto.randomUUID()}.mp4`
      const blob = await upload(pathname, file, {
        access: blobAccess,
        handleUploadUrl: `/admin/objects/${encodeURIComponent(propertyId)}/videos/upload`,
        contentType: VIDEO_REVIEW_CONTENT_TYPE,
        multipart: file.size > 5 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => {
          setProgress(Math.round(percentage))
        },
      })

      setProgress(100)
      setStage('saving')
      const response = await adminFetch(`/admin/objects/${encodeURIComponent(propertyId)}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          blob: { pathname: blob.pathname },
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      setTitle('')
      setFile(null)
      setStage('ready')
      if (fileInputRef.current) fileInputRef.current.value = ''
      setStatus({
        type: 'success',
        message: 'Das Video wurde hochgeladen und für den Kunden freigegeben.',
      })
    } catch (error) {
      setStage('waiting')
      setStatus({
        type: 'error',
        message: error.message || 'Der Upload konnte nicht abgeschlossen werden.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-form-grid" onSubmit={submit}>
      <label>
        Titel
        <input
          className="admin-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={240}
          placeholder="z. B. Rundgang Wohnzimmer"
          disabled={busy}
          required
        />
      </label>
      <label>
        MP4-Datei
        <input
          ref={fileInputRef}
          className="admin-input"
          type="file"
          accept="video/mp4"
          onChange={selectFile}
          disabled={busy}
          required={!file}
        />
        <span className="admin-help">MP4 · maximal 200 MB</span>
      </label>

      {file ? (
        <div className="admin-status-note admin-form-wide" role="status">
          {file.name} · {formatSize(file.size)} · {
            stage === 'saving' ? 'Upload abgeschlossen, Video wird eingetragen …' :
              stage === 'uploading' ? `${progress}% hochgeladen` :
                stage === 'ready' ? 'Bereit' : 'Ausgewählt'
          }
        </div>
      ) : null}

      {status.message ? (
        <div
          className={`admin-status-note admin-form-wide ${
            status.type === 'success' ? 'admin-status-note--success' : 'admin-status-note--error'
          }`}
          role="status"
        >
          {status.message}
        </div>
      ) : null}

      <div className="admin-form-actions admin-form-wide">
        <button className="admin-primary-button" type="submit" disabled={busy || !file || !title.trim()}>
          {busy ? 'Video wird gesendet …' : 'Video an den Kunden senden'}
        </button>
      </div>
    </form>
  )
}
