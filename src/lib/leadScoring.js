/**
 * Lead scoring logic based on quiz answers.
 *
 * hot:  Ready to buy immediately, has capital & financing
 * warm: Interested, has some capital
 * cold: Just browsing or needs help
 * not_qualified: Does not have the minimum capital for the current offer
 */
export function calculateLeadScore(answers) {
  const { zeitrahmen, eigenkapital, finanzierung } = answers

  if (eigenkapital === 'unter-30k') {
    return 'not_qualified'
  }

  if (
    zeitrahmen === 'sofort' &&
    ['50-80k', 'ueber-80k'].includes(eigenkapital) &&
    finanzierung === 'vorhanden'
  ) {
    return 'hot'
  }

  if (
    ['sofort', '3-6-monate'].includes(zeitrahmen) &&
    ['30-50k', '50-80k', 'ueber-80k'].includes(eigenkapital)
  ) {
    return 'warm'
  }

  return 'cold'
}
