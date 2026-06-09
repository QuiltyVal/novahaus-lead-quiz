import { describe, expect, it } from 'vitest'
import { calculateLeadScore } from '../src/lib/leadScoring'
import { getSalesQualification } from '../src/lib/leadQualification'
import { DEFAULT_TENANT_CONFIG } from '../src/lib/tenantConfig'

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
