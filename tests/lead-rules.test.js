import { describe, expect, it } from 'vitest'
import { calculateLeadScore } from '../src/lib/leadScoring'
import { getSalesQualification } from '../src/lib/leadQualification'
import { DEFAULT_TENANT_CONFIG } from '../src/lib/tenantConfig'
import { buildHotLeadHandoffContent, resolveHotLeadNotificationEmail } from '../src/lib/leadHandoff'
import { isValidLeadPhone } from '../src/lib/leadValidation'
import { buildOpenRouterEmailResponseFormat } from '../src/lib/openRouterEmail'

const cases = {
  hot: {
    wohnung: '4-zimmer',
    zeitrahmen: 'sofort',
    eigenkapital: 'ueber-80k',
    finanzierung: 'vorhanden',
  },
  warm: {
    wohnung: '3-zimmer',
    zeitrahmen: '3-6-monate',
    eigenkapital: '50-80k',
    finanzierung: 'in-planung',
  },
  cold: {
    wohnung: 'beide',
    zeitrahmen: 'informieren',
    eigenkapital: 'keine-angabe',
    finanzierung: 'benoetigt-hilfe',
  },
  notQualified: {
    wohnung: '3-zimmer',
    zeitrahmen: 'sofort',
    eigenkapital: 'unter-30k',
    finanzierung: 'benoetigt-hilfe',
  },
}

describe('calculateLeadScore', () => {
  it('classifies a ready buyer with strong equity and financing as hot', () => {
    expect(calculateLeadScore(cases.hot, DEFAULT_TENANT_CONFIG)).toBe('hot')
  })

  it('classifies an active buyer with enough equity but unclear financing as warm', () => {
    expect(calculateLeadScore(cases.warm, DEFAULT_TENANT_CONFIG)).toBe('warm')
  })

  it('classifies early research without equity signal as cold', () => {
    expect(calculateLeadScore(cases.cold, DEFAULT_TENANT_CONFIG)).toBe('cold')
  })

  it('classifies leads below minimum equity as not qualified', () => {
    expect(calculateLeadScore(cases.notQualified, DEFAULT_TENANT_CONFIG)).toBe('not_qualified')
  })
})

describe('lead phone validation', () => {
  it('accepts a formatted German mobile number', () => {
    expect(isValidLeadPhone('+49 151 10000001')).toBe(true)
  })

  it('rejects an empty or too-short phone number', () => {
    expect(isValidLeadPhone('')).toBe(false)
    expect(isValidLeadPhone('+49 12')).toBe(false)
  })

  it('rejects letters and numbers longer than E.164 permits', () => {
    expect(isValidLeadPhone('+49 CALL-NOW-123')).toBe(false)
    expect(isValidLeadPhone('+49 123 456 789 012 345 6')).toBe(false)
  })
})

describe('hot lead handoff', () => {
  it('prefers the dedicated hot-lead recipient and falls back to the internal BCC', () => {
    expect(resolveHotLeadNotificationEmail({
      hotLeadNotifyEmail: 'sales@example.com',
      notifyEmail: 'notify@example.com',
      leadEmailBcc: 'archive@example.com',
    })).toBe('sales@example.com')

    expect(resolveHotLeadNotificationEmail({
      leadEmailBcc: 'archive@example.com',
    })).toBe('archive@example.com')
  })

  it('builds a call task with the stable lead ID and phone number', () => {
    const content = buildHotLeadHandoffContent({
      lead_id: 'lead-123',
      name: 'Helena Kaufbereit',
      phone: '+49 151 10000001',
      email: 'helena@example.com',
      wohnung_label: '4-Zimmer',
      purchase_timeline_label: 'Sofort',
      equity_bucket_label: 'Über 80.000 Euro',
      financing_status_label: 'Vorhanden',
      utm_campaign: 'srm_reel_01',
      next_action: 'call_within_15min',
    })

    expect(content.subject).toContain('Helena Kaufbereit')
    expect(content.body).toContain('Lead-ID: lead-123')
    expect(content.body).toContain('Telefon: +49 151 10000001')
    expect(content.body).toContain('Quelle: srm_reel_01')
  })
})

describe('OpenRouter email response format', () => {
  it('uses strict JSON Schema with the two expected email fields', () => {
    expect(buildOpenRouterEmailResponseFormat()).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'lead_follow_up_email',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            subject: {
              type: 'string',
              description: 'Concise German email subject.',
            },
            body: {
              type: 'string',
              description: 'Polite German follow-up email body.',
            },
          },
          required: ['subject', 'body'],
        },
      },
    })
  })
})

describe('getSalesQualification', () => {
  it('maps hot score and answers to the hot workflow segment', () => {
    const qualification = getSalesQualification({
      ...cases.hot,
      leadScore: calculateLeadScore(cases.hot, DEFAULT_TENANT_CONFIG),
      underqualified: false,
      tenantConfig: DEFAULT_TENANT_CONFIG,
    })

    expect(qualification).toMatchObject({
      segment: 'hot',
      status: 'ready_for_call',
      assignedTo: 'call_center',
      handoffRequired: true,
    })
  })

  it('maps warm score and answers to the warm AI follow-up segment', () => {
    const qualification = getSalesQualification({
      ...cases.warm,
      leadScore: calculateLeadScore(cases.warm, DEFAULT_TENANT_CONFIG),
      underqualified: false,
      tenantConfig: DEFAULT_TENANT_CONFIG,
    })

    expect(qualification).toMatchObject({
      segment: 'warm',
      status: 'ai_follow_up',
      assignedTo: 'ai_agent',
      handoffRequired: false,
    })
  })

  it('keeps cold research leads in nurture', () => {
    const qualification = getSalesQualification({
      ...cases.cold,
      leadScore: calculateLeadScore(cases.cold, DEFAULT_TENANT_CONFIG),
      underqualified: false,
      tenantConfig: DEFAULT_TENANT_CONFIG,
    })

    expect(qualification).toMatchObject({
      segment: 'cold',
      status: 'nurture',
      assignedTo: 'nurture_agent',
    })
  })

  it('lets underqualified override a hot-looking lead', () => {
    const qualification = getSalesQualification({
      ...cases.hot,
      leadScore: 'hot',
      underqualified: true,
      tenantConfig: DEFAULT_TENANT_CONFIG,
    })

    expect(qualification).toMatchObject({
      segment: 'not_qualified',
      status: 'not_qualified',
      assignedTo: 'ai_agent',
    })
  })
})
