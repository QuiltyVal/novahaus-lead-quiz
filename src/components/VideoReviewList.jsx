'use client'

import { useState } from 'react'
import { videoDecisionText } from '@/lib/videoReviewValidation'

function locationLabel(property) {
  return [property.address_label, property.district]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' · ')
}

export default function VideoReviewList({ token, initialProperties, styles }) {
  const [properties, setProperties] = useState(initialProperties)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  // Only one reel is ever mid-decision, so the open note and the pending
  // request are single values rather than a map keyed by video.
  const [openNoteFor, setOpenNoteFor] = useState('')
  const [note, setNote] = useState('')
  const [busyVideoId, setBusyVideoId] = useState('')
  const [error, setError] = useState('')

  function applyDecision(videoId, decision, submittedNote) {
    setProperties((current) => current.map((property) => ({
      ...property,
      videos: property.videos.map((video) => (
        video.id === videoId
          ? { ...video, review_status: decision, last_note: submittedNote, decided_at: new Date().toISOString() }
          : video
      )),
    })))
  }

  async function decide(videoId, decision, submittedNote = null) {
    setError('')
    setBusyVideoId(videoId)
    try {
      const response = await fetch(`/api/kunde/${encodeURIComponent(token)}/freigabe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          decision,
          note: submittedNote,
          decidedByName: name,
          decidedByEmail: email,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Speichern fehlgeschlagen.')

      applyDecision(videoId, decision, submittedNote)
      setOpenNoteFor('')
      setNote('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyVideoId('')
    }
  }

  const identityMissing = !name.trim() || !email.trim()
  const hasVideos = properties.some((property) => property.videos.length > 0)

  if (!hasVideos) {
    return (
      <div className={styles.list}>
        <p className={styles.empty}>
          Sobald das erste Video für Ihr Objekt fertig ist, erscheint es hier zur
          Freigabe. Sie erhalten dann eine Nachricht.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      <section className={styles.identity}>
        <h2>Ihre Angaben</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            Name
            <input
              type="text"
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            E-Mail
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        </div>
        <p className={styles.hint} style={{ marginTop: 12 }}>
          Jede Freigabe wird mit Name, E-Mail, Zeitpunkt und dem angezeigten
          Freigabetext dokumentiert.
        </p>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      {properties.map((property) => (
        <section className={styles.property} key={property.property_id}>
          <div className={styles.propertyHead}>
            <h2>{property.property_title}</h2>
            {locationLabel(property) ? <p>{locationLabel(property)}</p> : null}
          </div>

          {property.videos.map((video) => {
            const busy = busyVideoId === video.id
            const noteOpen = openNoteFor === video.id

            return (
              <article className={styles.video} key={video.id}>
                <video
                  className={styles.player}
                  src={video.preview_url}
                  controls
                  playsInline
                  preload="metadata"
                />
                <div className={styles.videoBody}>
                  <h3 className={styles.videoTitle}>{video.title}</h3>

                  {video.review_status === 'approved' ? (
                    <p className={`${styles.decided} ${styles.decidedApproved}`}>
                      Freigegeben. Dieses Video darf veröffentlicht werden.
                    </p>
                  ) : null}

                  {video.review_status === 'rework' ? (
                    <p className={`${styles.decided} ${styles.decidedRework}`}>
                      Änderung angefordert. Wir melden uns mit einer neuen Fassung.
                      {video.last_note ? (
                        <span className={styles.decidedNote}>„{video.last_note}“</span>
                      ) : null}
                    </p>
                  ) : null}

                  {video.review_status === 'pending' && !noteOpen ? (
                    <>
                      <p className={styles.hint}>{videoDecisionText('approved')}</p>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.approve}
                          disabled={busy || identityMissing}
                          onClick={() => decide(video.id, 'approved')}
                        >
                          {busy ? 'Wird gespeichert…' : 'Freigeben'}
                        </button>
                        <button
                          type="button"
                          className={styles.rework}
                          disabled={busy || identityMissing}
                          onClick={() => {
                            setOpenNoteFor(video.id)
                            setNote('')
                            setError('')
                          }}
                        >
                          Änderung anfordern
                        </button>
                      </div>
                      {identityMissing ? (
                        <p className={styles.hint}>
                          Bitte tragen Sie oben Ihren Namen und Ihre E-Mail-Adresse ein.
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {video.review_status === 'pending' && noteOpen ? (
                    <div className={styles.reworkForm}>
                      <label className={styles.field}>
                        Was soll geändert werden?
                        <textarea
                          value={note}
                          maxLength={2000}
                          onChange={(event) => setNote(event.target.value)}
                        />
                      </label>
                      <div className={styles.reworkActions}>
                        <button
                          type="button"
                          disabled={busy || !note.trim()}
                          onClick={() => decide(video.id, 'rework', note.trim())}
                        >
                          {busy ? 'Wird gespeichert…' : 'Änderung anfordern'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setOpenNoteFor('')
                            setNote('')
                          }}
                        >
                          Zurück
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })}
        </section>
      ))}

      <p className={styles.footerNote}>
        Ohne Ihre Freigabe wird kein Video veröffentlicht.
      </p>
    </div>
  )
}
