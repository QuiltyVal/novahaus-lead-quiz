import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  latestSnapshotsByPost,
  normalizeContentClass,
  normalizeGrowthHypothesis,
  normalizeInstagramPermalink,
  normalizePillarSlugs,
  parseNullableNonNegativeInteger,
  propertyKeysForQuizSelection,
} from '../src/lib/contentValidation'
import { DEFAULT_TENANT_CONFIG, INVESTOR_TENANT_CONFIG } from '../src/lib/tenantConfig'

describe('content inventory validation', () => {
  it('normalizes account and share-style Instagram Reel URLs', () => {
    expect(normalizeInstagramPermalink('https://instagram.com/augenblickleads/reel/DaqJnYlMu4Z'))
      .toBe('https://www.instagram.com/augenblickleads/reel/DaqJnYlMu4Z/')
    expect(normalizeInstagramPermalink('https://www.instagram.com/reel/DaqJnYlMu4Z/?utm_source=ig_web_copy_link'))
      .toBe('https://www.instagram.com/reel/DaqJnYlMu4Z/')
  })

  it('rejects non-Instagram and non-Reel URLs', () => {
    expect(() => normalizeInstagramPermalink('https://example.com/reel/123')).toThrow()
    expect(() => normalizeInstagramPermalink('https://www.instagram.com/augenblickleads/')).toThrow()
  })

  it('keeps unknown metrics null and rejects negative counts', () => {
    expect(parseNullableNonNegativeInteger('', 'views')).toBeNull()
    expect(parseNullableNonNegativeInteger('0', 'views')).toBe(0)
    expect(() => parseNullableNonNegativeInteger('-1', 'views')).toThrow()
  })

  it('normalizes and de-duplicates pillar slugs', () => {
    expect(normalizePillarSlugs('leipzig_local, production_proof, leipzig_local'))
      .toEqual(['leipzig_local', 'production_proof'])
  })

  it('accepts only the Growth Lab class taxonomy', () => {
    expect(normalizeContentClass(' Transform ')).toBe('transform')
    expect(normalizeContentClass('')).toBeNull()
    expect(() => normalizeContentClass('local-mood')).toThrow('Growth Lab class is invalid')
    expect(() => normalizeContentClass('', { required: true })).toThrow('Growth Lab class is required')
  })

  it('requires a non-empty preregistered hypothesis when requested', () => {
    expect(normalizeGrowthHypothesis('  Earlier utility should increase saves.  ', { required: true }))
      .toBe('Earlier utility should increase saves.')
    expect(normalizeGrowthHypothesis('')).toBeNull()
    expect(() => normalizeGrowthHypothesis('', { required: true }))
      .toThrow('Growth Lab hypothesis is required')
  })
})

describe('quiz object mapping', () => {
  it('maps one apartment to one stable property key', () => {
    expect(propertyKeysForQuizSelection(DEFAULT_TENANT_CONFIG, '3-zimmer')).toEqual(['3-zimmer'])
  })

  it('maps the beide option to both stable property keys', () => {
    expect(propertyKeysForQuizSelection(DEFAULT_TENANT_CONFIG, 'beide'))
      .toEqual(['3-zimmer', '4-zimmer'])
  })

  it('does not misclassify investor goals as property IDs', () => {
    expect(propertyKeysForQuizSelection(INVESTOR_TENANT_CONFIG, 'rendite')).toEqual([])
  })
})

describe('snapshot aggregation', () => {
  it('keeps only the latest snapshot per Reel instead of summing history', () => {
    const latest = latestSnapshotsByPost([
      { id: 'old-a', post_id: 'post-a', captured_at: '2026-07-10T10:00:00Z', views: 100 },
      { id: 'new-a', post_id: 'post-a', captured_at: '2026-07-11T10:00:00Z', views: 160 },
      { id: 'only-b', post_id: 'post-b', captured_at: '2026-07-10T11:00:00Z', views: 90 },
    ])

    expect(latest).toHaveLength(2)
    expect(latest.find((snapshot) => snapshot.post_id === 'post-a')?.views).toBe(160)
  })

  it('contains composite tenant constraints for post and lead object links', () => {
    const migration = readFileSync(
      new URL('../db/migrations/20260712_content_inventory.sql', import.meta.url),
      'utf8'
    )
    expect(migration).toContain('FOREIGN KEY (post_id, tenant_id) REFERENCES social_posts(id, tenant_id)')
    expect(migration).toContain('FOREIGN KEY (property_id, tenant_id) REFERENCES properties(id, tenant_id)')
    expect(migration).toContain('FOREIGN KEY (lead_id, tenant_id) REFERENCES leads(lead_id, tenant_id)')
  })

  it('adds tenant-scoped Growth Lab metadata and historical classes without fake hypotheses', () => {
    const migration = readFileSync(
      new URL('../db/migrations/20260716_growth_lab_metadata.sql', import.meta.url),
      'utf8'
    )
    const expectedMapping = {
      'reel-001': 'mood-silent',
      'reel-002': 'narrative',
      'reel-003': 'mood-silent',
      'schoenes-leipzig': 'mood-silent',
      'reel-004': 'transform',
      'reel-005': 'ad-style',
      'reel-006': 'avatar',
      'reel-007': 'transform',
      'reel-008': 'mood-silent',
      'reel-009': 'transform',
      'reel-010': 'transform',
      'reel-011': 'avatar',
      'reel-012': 'local-fact',
      'reel-013': 'utility',
      'reel-014': 'ad-style',
      'reel-015': 'local-fact',
    }

    expect(migration).toContain("WHERE tenant_id = 'augenblick'")
    expect(migration).toContain('Hypothesis intentionally remains NULL')
    for (const [reelCode, contentClass] of Object.entries(expectedMapping)) {
      expect(migration).toContain(`WHEN '${reelCode}' THEN '${contentClass}'`)
    }
  })

  it('checks content-account ownership before creating a cross-tenant post', () => {
    const contentStore = readFileSync(
      new URL('../src/lib/contentStore.js', import.meta.url),
      'utf8'
    )
    expect(contentStore).toContain('AND owner_tenant_id = $2')
    expect(contentStore).toContain('Every selected object must belong to the selected client')
  })
})
