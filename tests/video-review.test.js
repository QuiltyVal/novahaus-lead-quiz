import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildVideoDecisionMessage } from '../src/lib/videoReviewHandoff'
import {
  validateVideoDescriptor,
  VIDEO_REVIEW_MAX_FILE_SIZE,
} from '../src/lib/videoReviewUpload'
import {
  VIDEO_DECISION_TEXT_VERSION,
  validateVideoDecision,
  videoDecisionText,
} from '../src/lib/videoReviewValidation'

const validDecision = {
  videoId: '11111111-2222-4333-8444-555555555555',
  decision: 'approved',
  decidedByName: 'Erika Maklerin',
  decidedByEmail: 'Erika@Example.com',
}

describe('Video release validation', () => {
  it('records the exact release wording and its version, like the rights confirmation', () => {
    const validated = validateVideoDecision(validDecision)
    expect(validated.decisionTextVersion).toBe(VIDEO_DECISION_TEXT_VERSION)
    expect(validated.decisionText).toContain('zur Veröffentlichung frei')
    expect(validated.decidedByEmail).toBe('erika@example.com')
  })

  it('refuses a rework request without a note, which the operator cannot act on', () => {
    expect(() => validateVideoDecision({
      ...validDecision,
      decision: 'rework',
      note: '   ',
    })).toThrow('was geändert werden soll')
  })

  it('accepts a rework request that says what to change', () => {
    const validated = validateVideoDecision({
      ...validDecision,
      decision: 'rework',
      note: 'Die Küche bitte weglassen.',
    })
    expect(validated.decision).toBe('rework')
    expect(validated.note).toBe('Die Küche bitte weglassen.')
  })

  it('states that a rework blocks publication until a new release', () => {
    expect(videoDecisionText('rework')).toContain('nicht veröffentlicht')
  })

  it('rejects a decision that is neither release nor rework', () => {
    expect(() => validateVideoDecision({ ...validDecision, decision: 'maybe' }))
      .toThrow('frei oder fordern Sie eine Änderung')
  })

  it('requires a name and a valid address, since the decision is evidence', () => {
    expect(() => validateVideoDecision({ ...validDecision, decidedByName: '' }))
      .toThrow('Name ist erforderlich')
    expect(() => validateVideoDecision({ ...validDecision, decidedByEmail: 'erika' }))
      .toThrow('gültige E-Mail-Adresse')
  })
})

describe('Video release notice', () => {
  const decision = {
    video_id: '11111111-2222-4333-8444-555555555555',
    tenant_name: 'Maklerbüro Leipzig',
    property_title: 'Wohnung Karl-Heine-Straße',
    address_label: 'Karl-Heine-Straße 1',
    district: 'Plagwitz',
    video_title: 'Rundgang Wohnzimmer',
    decision: 'approved',
    decided_by_name: 'Erika Maklerin',
    decided_by_email: 'erika@example.com',
  }

  it('separates a release from a change request in the first line', () => {
    expect(buildVideoDecisionMessage(decision)).toContain('Video freigegeben')
    expect(buildVideoDecisionMessage({ ...decision, decision: 'rework' }))
      .toContain('Änderung angefordert')
  })

  it('names the client, the object and the video', () => {
    const message = buildVideoDecisionMessage(decision)
    expect(message).toContain('Maklerbüro Leipzig')
    expect(message).toContain('Karl-Heine-Straße 1 · Plagwitz')
    expect(message).toContain('Rundgang Wohnzimmer')
    expect(message).toContain(`/admin/videos/${decision.video_id}`)
  })

  it('carries the note, which is the only instruction a rework leaves behind', () => {
    const message = buildVideoDecisionMessage({
      ...decision,
      decision: 'rework',
      note: 'Die Küche bitte weglassen.',
    })
    expect(message).toContain('Anmerkung: Die Küche bitte weglassen.')
  })

  it('renders without an address, which the client may leave empty', () => {
    const message = buildVideoDecisionMessage({ ...decision, address_label: '', district: '' })
    expect(message).not.toContain('Ort:')
  })
})

describe('Video release database and route boundaries', () => {
  const migration = readFileSync(
    new URL('../db/migrations/20260805_video_approval.sql', import.meta.url),
    'utf8'
  )
  const store = readFileSync(
    new URL('../src/lib/videoReviewStore.js', import.meta.url),
    'utf8'
  )

  it('ties a reel to an object before publication, not through the published post', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS property_id uuid')
    expect(migration).toContain('REFERENCES properties(id, tenant_id)')
  })

  it('refuses to show a reel that has no object or no playable file', () => {
    expect(migration).toContain('videos_reviewable_check')
    expect(migration).toMatch(/property_id IS NOT NULL AND preview_blob_url IS NOT NULL/)
  })

  it('keeps every decision instead of overwriting the previous one', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS video_approvals')
    expect(migration).toContain('decided_at timestamptz NOT NULL DEFAULT now()')
    expect(migration).toContain('text_version text NOT NULL')
    expect(migration).toContain('decision_text text NOT NULL')
  })

  it('refuses a rework row without a note at the database level too', () => {
    expect(migration).toContain('video_approvals_rework_note_check')
  })

  it('claims the decision, so a double click cannot become two pieces of evidence', () => {
    expect(store).toMatch(/UPDATE videos[\s\S]*?AND client_review_status = 'pending'/)
  })

  it('scopes every client query to the tenant behind the access link', () => {
    expect(store).toContain('resolveDataRoomAccess')
    expect(store).toMatch(/recordVideoDecision[\s\S]*?AND tenant_id = \$2/)
  })

  it('never lets a failed notice undo a recorded decision', () => {
    const route = readFileSync(
      new URL('../src/app/api/kunde/[token]/freigabe/route.js', import.meta.url),
      'utf8'
    )
    expect(route).toMatch(/try \{[\s\S]*?sendTelegramVideoDecisionNotification[\s\S]*?\} catch/)
  })
})

describe('Operator video review upload', () => {
  const middleware = readFileSync(
    new URL('../src/middleware.js', import.meta.url),
    'utf8'
  )
  const uploadRoute = readFileSync(
    new URL('../src/app/admin/objects/[propertyId]/videos/upload/route.js', import.meta.url),
    'utf8'
  )
  const creationRoute = readFileSync(
    new URL('../src/app/admin/objects/[propertyId]/videos/route.js', import.meta.url),
    'utf8'
  )
  const form = readFileSync(
    new URL('../src/components/admin/VideoForReviewForm.jsx', import.meta.url),
    'utf8'
  )

  it('keeps the upload handler inside the Basic Auth protected admin tree', () => {
    expect(uploadRoute).toContain('handleUpload')
    expect(middleware).toContain("matcher: ['/admin/:path*']")
    expect(form).toContain('/admin/objects/${encodeURIComponent(propertyId)}/videos/upload')
    expect(form).not.toContain('/api/admin/')
  })

  it('accepts only MP4 video files up to 200 MB', () => {
    expect(validateVideoDescriptor({
      name: 'rundgang.mp4',
      type: 'video/mp4',
      size: VIDEO_REVIEW_MAX_FILE_SIZE,
    }).type).toBe('video/mp4')
    expect(() => validateVideoDescriptor({
      name: 'rundgang.mov',
      type: 'video/quicktime',
      size: 10_000,
    })).toThrow('Nur MP4-Videos')
    expect(() => validateVideoDescriptor({
      name: 'rundgang.mp4',
      type: 'video/mp4',
      size: VIDEO_REVIEW_MAX_FILE_SIZE + 1,
    })).toThrow('größer als 200 MB')
    expect(uploadRoute).toContain('allowedContentTypes: [VIDEO_REVIEW_CONTENT_TYPE]')
  })

  it('takes tenant_id from the object instead of the request body', () => {
    expect(creationRoute).toMatch(/SELECT id, tenant_id[\s\S]*?FROM properties/)
    expect(creationRoute).toContain('tenantId: property.tenant_id')
    expect(creationRoute).not.toMatch(/body\?\.tenant/i)
  })

  it('opens the created video for review only after the browser upload succeeds', () => {
    expect(form.indexOf('await upload(')).toBeLessThan(
      form.indexOf('await fetch(`/admin/objects/${encodeURIComponent(propertyId)}/videos`')
    )
    expect(creationRoute.indexOf('INSERT INTO videos')).toBeLessThan(
      creationRoute.indexOf('await openVideoForReview({')
    )
    expect(creationRoute).toContain("purpose, format_slug, status")
    expect(creationRoute).toContain("'property', 'kundenvideo', 'ready'")
  })
})
