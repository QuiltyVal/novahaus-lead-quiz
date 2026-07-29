import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  DATA_ROOM_MAX_FILE_SIZE,
  RIGHTS_TEXT_VERSION,
  detectImageContentType,
  validateDataRoomSubmission,
  validateImageSignature,
  validatePhotoDescriptor,
} from '../src/lib/dataRoomValidation'

const validSubmission = {
  title: 'Wohnung Karl-Heine-Straße',
  addressLabel: 'Karl-Heine-Straße 1',
  district: 'Plagwitz',
  eckdaten: '3 Zimmer, 82 m²',
  usageScope: 'both',
  confirmerName: 'Erika Maklerin',
  confirmerEmail: 'erika@example.com',
  rightsAccepted: true,
  files: [
    { name: 'wohnzimmer.jpg', type: 'image/jpeg', size: 2_000_000 },
  ],
}

describe('Data Room server validation', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts the allowed content type %s at the 15 MB boundary',
    (type) => {
      expect(validatePhotoDescriptor({
        name: 'objektfoto',
        type,
        size: DATA_ROOM_MAX_FILE_SIZE,
      })).toEqual({
        name: 'objektfoto',
        type,
        size: DATA_ROOM_MAX_FILE_SIZE,
      })
    }
  )

  it('rejects an unsupported image type on the server', () => {
    expect(() => validatePhotoDescriptor({
      name: 'objektfoto.gif',
      type: 'image/gif',
      size: 50_000,
    })).toThrow('Nur JPEG, PNG oder WebP sind erlaubt')
  })

  it('rejects a file larger than 15 MB on the server', () => {
    expect(() => validatePhotoDescriptor({
      name: 'zu-gross.jpg',
      type: 'image/jpeg',
      size: DATA_ROOM_MAX_FILE_SIZE + 1,
    })).toThrow('größer als 15 MB')
  })

  it('rejects upload preparation without the mandatory rights confirmation', () => {
    expect(() => validateDataRoomSubmission({
      ...validSubmission,
      rightsAccepted: false,
    })).toThrow('Rechtebestätigung ist für den Upload erforderlich')
  })

  it('records the immutable rights text version and selected usage in the exact text', () => {
    const validated = validateDataRoomSubmission(validSubmission)
    expect(validated.rightsTextVersion).toBe(RIGHTS_TEXT_VERSION)
    expect(validated.rightsText).toContain('organische und bezahlte Werbeinhalte')
    expect(validated.confirmerEmail).toBe('erika@example.com')
  })

  it('checks file signatures instead of trusting only the browser MIME type', () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const webp = Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ])

    expect(detectImageContentType(jpeg)).toBe('image/jpeg')
    expect(detectImageContentType(png)).toBe('image/png')
    expect(detectImageContentType(webp)).toBe('image/webp')
    expect(() => validateImageSignature(png, 'image/jpeg')).toThrow('Dateiinhalt')
  })
})

describe('Data Room database and route boundaries', () => {
  it('stores identity, timestamp, text version, exact text, and tenant-scoped evidence', () => {
    const migration = readFileSync(
      new URL('../db/migrations/20260729_data_room.sql', import.meta.url),
      'utf8'
    )

    for (const field of [
      'property_id',
      'tenant_id',
      'confirmed_by_name',
      'confirmed_by_email',
      'confirmed_at',
      'text_version',
      'confirmation_text',
      'material_usage',
    ]) {
      expect(migration).toContain(field)
    }
    expect(migration).toContain(
      'FOREIGN KEY (property_id, tenant_id)\n    REFERENCES properties(id, tenant_id)'
    )
  })

  it('keeps /kunde outside the existing Basic Auth matcher', () => {
    const middleware = readFileSync(
      new URL('../src/middleware.js', import.meta.url),
      'utf8'
    )
    expect(middleware).toContain("matcher: ['/admin/:path*']")
    expect(middleware).not.toContain("'/kunde/:path*'")
  })
})
