import { DEFAULT_TENANT_CONFIG } from './tenantConfig'

/**
 * Lead scoring logic based on quiz answers.
 *
 * hot:  Ready to buy immediately, has capital & financing
 * warm: Interested, has some capital
 * cold: Just browsing or needs help
 * not_qualified: Does not have the minimum capital for the current offer
 */
export function calculateLeadScore(answers, tenantConfig = DEFAULT_TENANT_CONFIG) {
  const { zeitrahmen, eigenkapital, finanzierung } = answers
  const { scoring } = tenantConfig

  if (scoring.notQualified.equityBuckets.includes(eigenkapital)) {
    return 'not_qualified'
  }

  if (
    zeitrahmen === scoring.hot.purchaseTimeline &&
    scoring.hot.equityBuckets.includes(eigenkapital) &&
    finanzierung === scoring.hot.financingStatus
  ) {
    return 'hot'
  }

  if (
    scoring.warm.purchaseTimelines.includes(zeitrahmen) &&
    scoring.warm.equityBuckets.includes(eigenkapital)
  ) {
    return 'warm'
  }

  return 'cold'
}
