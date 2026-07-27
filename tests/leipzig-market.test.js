import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import marketData from '../src/data/leipzig-market.json'

const REQUIRED_METRIC_FIELDS = [
  'value',
  'unit',
  'scope',
  'source',
  'sourceUrl',
  'publishedAt',
  'checkedAt',
]

const ALLOWED_SCOPES = new Set(['Leipzig', 'Sachsen', 'Deutschland'])
const ALLOWED_SOURCE_HOSTS = new Set([
  'statistik.leipzig.de',
  'www.leipzig.de',
  'opendata.leipzig.de',
  'www.revosax.sachsen.de',
  'www.gesetze-im-internet.de',
  'www.notar.de',
])

function collectMetrics(value, path = 'root', result = []) {
  if (!value || typeof value !== 'object') return result

  if (Object.prototype.hasOwnProperty.call(value, 'value')) {
    result.push({ metric: value, path })
    return result
  }

  Object.entries(value).forEach(([key, entry]) => {
    collectMetrics(entry, `${path}.${key}`, result)
  })
  return result
}

describe('Leipzig market data', () => {
  it('stores every numeric metric with source, territory and dates', () => {
    const metrics = collectMetrics(marketData)

    expect(metrics.length).toBeGreaterThan(0)

    metrics.forEach(({ metric, path }) => {
      REQUIRED_METRIC_FIELDS.forEach((field) => {
        expect(metric, `${path} is missing ${field}`).toHaveProperty(field)
      })
      expect(typeof metric.value, `${path}.value`).toBe('number')
      expect(ALLOWED_SCOPES.has(metric.scope), `${path}.scope`).toBe(true)
      expect(metric.publishedAt, `${path}.publishedAt`).toMatch(/^\d{4}-\d{2}$/)
      expect(metric.checkedAt, `${path}.checkedAt`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it('uses only the approved official source hosts', () => {
    collectMetrics(marketData).forEach(({ metric, path }) => {
      const sourceHost = new URL(metric.sourceUrl).hostname
      expect(ALLOWED_SOURCE_HOSTS.has(sourceHost), `${path}: ${sourceHost}`).toBe(true)
    })

    const serialized = JSON.stringify(marketData).toLowerCase()
    expect(serialized).not.toContain('immoscout')
    expect(serialized).not.toContain('immowelt')
  })

  it('covers every requested area without inventing an aggregate for Gohlis', () => {
    const requestedAreas = new Set(
      marketData.rent.areas.map((entry) => entry.requestedArea || entry.area)
    )

    ;['Plagwitz', 'Connewitz', 'Südvorstadt', 'Gohlis', 'Zentrum', 'Schleußig', 'Lindenau']
      .forEach((area) => expect(requestedAreas.has(area), area).toBe(true))

    const gohlisParts = marketData.rent.areas
      .filter((entry) => entry.requestedArea === 'Gohlis')
      .map((entry) => entry.area)

    expect(gohlisParts).toEqual(['Gohlis-Süd', 'Gohlis-Mitte', 'Gohlis-Nord'])
    expect(marketData.purchase.areas.map((entry) => entry.area)).toEqual([
      'Plagwitz',
      'Connewitz',
      'Südvorstadt',
      'Gohlis',
      'Zentrum',
      'Schleußig',
      'Lindenau',
    ])
  })

  it('keeps the acquisition-cost model internally consistent', () => {
    const { example } = marketData.costs
    const expectedPurchasePrice =
      marketData.purchase.exampleBasis.averageArea.value *
      marketData.purchase.exampleBasis.cityMedian.value
    const expectedTax = example.purchasePrice.value * marketData.costs.grunderwerbsteuerRate.value / 100
    const expectedTotal =
      example.grunderwerbsteuer.value +
      example.notary.value +
      example.landRegister.value +
      example.broker.value

    expect(example.purchasePrice.value).toBe(expectedPurchasePrice)
    expect(example.grunderwerbsteuer.value).toBeCloseTo(expectedTax, 2)
    expect(example.totalAcquisitionCosts.value).toBeCloseTo(expectedTotal, 2)
    expect(example.totalAcquisitionCostRate.value).toBeCloseTo(
      expectedTotal / example.purchasePrice.value * 100,
      2
    )
  })

  it('exposes the required legal disclaimer and transparent gaps', () => {
    const pageSource = readFileSync(
      new URL('../src/app/leipzig-einschaetzung/page.js', import.meta.url),
      'utf8'
    )

    expect(pageSource).toContain(
      'Keine Finanz-, Steuer- oder Rechtsberatung. Alle Angaben ohne Gewähr, Stand siehe'
    )
    expect(marketData.unconfirmed.length).toBeGreaterThan(0)
    expect(marketData.updatePlan.some((item) => item.mode === 'automatic')).toBe(true)
    expect(marketData.updatePlan.some((item) => item.mode === 'manual')).toBe(true)
  })
})
