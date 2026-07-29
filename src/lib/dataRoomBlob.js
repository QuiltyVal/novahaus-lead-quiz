import { del, get, head } from '@vercel/blob'
import {
  validateImageSignature,
  validatePhotoDescriptor,
} from '@/lib/dataRoomValidation'

export function getDataRoomBlobAccess() {
  return process.env.DATA_ROOM_BLOB_ACCESS === 'private' ? 'private' : 'public'
}

export class DataRoomBlobValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DataRoomBlobValidationError'
  }
}

async function readSignature(stream, length = 12) {
  const reader = stream.getReader()
  const bytes = []

  try {
    while (bytes.length < length) {
      const { done, value } = await reader.read()
      if (done) break
      for (const byte of value) {
        bytes.push(byte)
        if (bytes.length >= length) break
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
  }

  return Uint8Array.from(bytes)
}

export async function inspectDataRoomBlob(slot) {
  const metadata = await head(slot.expected_pathname)
  try {
    validatePhotoDescriptor({
      name: slot.original_filename,
      type: metadata.contentType,
      size: metadata.size,
    })

    if (metadata.pathname !== slot.expected_pathname) {
      throw new Error('Der gespeicherte Dateipfad ist ungültig.')
    }
    if (metadata.contentType !== slot.content_type || metadata.size !== slot.byte_size) {
      throw new Error('Die gespeicherte Datei entspricht nicht der geprüften Auswahl.')
    }
  } catch (error) {
    throw new DataRoomBlobValidationError(error.message)
  }

  const blob = await get(metadata.url, { access: getDataRoomBlobAccess() })
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    throw new Error('Die gespeicherte Datei konnte nicht geprüft werden.')
  }

  const signature = await readSignature(blob.stream)
  try {
    validateImageSignature(signature, metadata.contentType)
  } catch (error) {
    throw new DataRoomBlobValidationError(error.message)
  }
  return metadata
}

export async function deleteDataRoomBlob(pathname) {
  if (!pathname) return
  await del(pathname)
}
