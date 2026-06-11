import { describe, expect, it } from 'vitest'
import {
  extractEmailAddress,
  extractReplyText,
  stripHtml,
} from '../src/lib/inboundEmail.js'

describe('inbound email helpers', () => {
  it('extracts a normalized email address from a named sender', () => {
    expect(extractEmailAddress('Val Test <VAL.TEST@Example.COM>')).toBe('val.test@example.com')
  })

  it('extracts a normalized email address from an object sender', () => {
    expect(extractEmailAddress({ email: 'Lead@Example.com', name: 'Lead' })).toBe('lead@example.com')
  })

  it('uses plain text replies when available', () => {
    expect(extractReplyText({ text: '  Ja, bitte rufen Sie mich morgen an.  ' })).toBe(
      'Ja, bitte rufen Sie mich morgen an.'
    )
  })

  it('falls back to stripped html replies', () => {
    expect(stripHtml('<p>Hallo&nbsp;NovaHaus,<br>bitte anrufen.</p>')).toBe(
      'Hallo NovaHaus,\nbitte anrufen.'
    )
  })
})
