import { DEFAULT_TENANT_CONFIG } from './tenantConfig'

export function getSalesQualification({
  leadScore,
  zeitrahmen,
  eigenkapital,
  finanzierung,
  underqualified,
  tenantConfig = DEFAULT_TENANT_CONFIG,
}) {
  const { scoring, workflow } = tenantConfig
  const hasMinimumCapital = scoring.warm.equityBuckets.includes(eigenkapital)
  const hasStrongCapital = scoring.hot.equityBuckets.includes(eigenkapital)
  const isActiveBuyer = scoring.warm.purchaseTimelines.includes(zeitrahmen)
  const financingReady = finanzierung === scoring.hot.financingStatus

  if (underqualified || scoring.notQualified.equityBuckets.includes(eigenkapital)) {
    return workflow.segments.not_qualified
  }

  if (
    leadScore === 'hot' ||
    (zeitrahmen === scoring.hot.purchaseTimeline && hasStrongCapital && financingReady)
  ) {
    return workflow.segments.hot
  }

  if (
    leadScore === 'warm' ||
    (isActiveBuyer && hasMinimumCapital)
  ) {
    return workflow.segments.warm
  }

  return workflow.segments.cold
}
