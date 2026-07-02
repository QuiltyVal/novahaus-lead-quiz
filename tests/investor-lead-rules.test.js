import { describe, expect, it } from 'vitest'
import { calculateLeadScore } from '../src/lib/leadScoring'
import { getSalesQualification } from '../src/lib/leadQualification'
import { INVESTOR_TENANT_CONFIG } from '../src/lib/tenantConfig'

const cases = {
  hot: {
    wohnung: 'rendite',
    zeitrahmen: 'sofort',
    eigenkapital: 'ueber-80k',
    finanzierung: 'vorhanden',
  },
  warm: {
    wohnung: 'altersvorsorge',
    zeitrahmen: '3-6-monate',
    eigenkapital: '50-80k',
    finanzierung: 'in-planung',
  },
  cold: {
    wohnung: 'vermoegensaufbau',
    zeitrahmen: 'informieren',
    eigenkapital: 'keine-angabe',
    finanzierung: 'benoetigt-hilfe',
  },
  notQualified: {
    wohnung: 'rendite',
    zeitrahmen: 'sofort',
    eigenkapital: 'unter-30k',
    finanzierung: 'benoetigt-hilfe',
  },
}

describe('calculateLeadScore for investor tenant', () => {
  it('classifies a ready investor with strong equity and financing as hot', () => {
    expect(calculateLeadScore(cases.hot, INVESTOR_TENANT_CONFIG)).toBe('hot')
  })

  it('classifies an active investor with enough equity but unclear financing as warm', () => {
    expect(calculateLeadScore(cases.warm, INVESTOR_TENANT_CONFIG)).toBe('warm')
  })

  it('classifies early investment research without equity signal as cold', () => {
    expect(calculateLeadScore(cases.cold, INVESTOR_TENANT_CONFIG)).toBe('cold')
  })

  it('classifies investor leads below minimum equity as not qualified', () => {
    expect(calculateLeadScore(cases.notQualified, INVESTOR_TENANT_CONFIG)).toBe('not_qualified')
  })
})

describe('getSalesQualification for investor tenant', () => {
  it('maps hot investor score to a partner handoff workflow', () => {
    const qualification = getSalesQualification({
      ...cases.hot,
      leadScore: calculateLeadScore(cases.hot, INVESTOR_TENANT_CONFIG),
      underqualified: false,
      tenantConfig: INVESTOR_TENANT_CONFIG,
    })

    expect(qualification).toMatchObject({
      segment: 'hot',
      status: 'ready_for_call',
      assignedTo: 'call_center',
      handoffRequired: true,
      handoffReason: 'hot_investor_ready_for_call',
    })
  })

  it('lets underqualified investor leads override a hot-looking lead', () => {
    const qualification = getSalesQualification({
      ...cases.hot,
      leadScore: 'hot',
      underqualified: true,
      tenantConfig: INVESTOR_TENANT_CONFIG,
    })

    expect(qualification).toMatchObject({
      segment: 'not_qualified',
      status: 'not_qualified',
      assignedTo: 'ai_agent',
    })
  })
})


describe('investor consent configuration', () => {
  it('mentions partner-company data transfer in the checkbox text', () => {
    expect(INVESTOR_TENANT_CONFIG.quiz.consentText).toContain('Weitergabe')
    expect(INVESTOR_TENANT_CONFIG.quiz.consentText).toContain('Partnerunternehmen zur Kontaktaufnahme')
  })
})
