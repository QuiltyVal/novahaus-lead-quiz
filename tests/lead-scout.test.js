import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { extractContactInfo, extractSignals, scoreSignals } = require('../scripts/lead-scout/parser');
const { extractJobSignals, extractListingState, parseInstagramDateFromHtml, readFirmInput, robotsAllows, scoreIntentSignals } = require('../scripts/lead-scout/signals');
const scoring = require('../scripts/lead-scout/scoring.json');

describe('lead-scout scoring', () => {
  test('scores configured signals and assigns tier A', () => {
    const html = fs.readFileSync(path.join(__dirname, 'fixtures/lead-scout/agency.html'), 'utf8');
    const signals = extractSignals([{ url: 'https://example.test', html }]);

    expect(signals).toMatchObject({
      bewertungCta: true,
      separateFunnels: true,
      pixelOrGtm: true,
      contactForm: true,
      activeListings: true,
    });
    expect(scoreSignals(signals, scoring)).toEqual({ score: 80, tier: 'A' });
  });

  test('applies multi-city penalty', () => {
    const result = scoreSignals({ bewertungCta: true, separateFunnels: false, pixelOrGtm: false, contactForm: false, activeListings: false, multiCity: true }, scoring);
    expect(result).toEqual({ score: 20, tier: 'C' });
  });
});

describe('lead-scout Impressum parser', () => {
  test('extracts Ansprechpartner, phone, and e-mail', () => {
    const html = fs.readFileSync(path.join(__dirname, 'fixtures/lead-scout/impressum.html'), 'utf8');
    expect(extractContactInfo(html)).toEqual({
      ansprechpartner: 'Anna Müller',
      telefon: '+49 351 1234567',
      email: 'kontakt@nova-immo.de',
    });
  });
});

describe('lead-scout intent signals', () => {
  test('extracts listing inventory and freshness from own listing page', () => {
    const html = `
      <main>
        <h1>Immobilienangebote (2)</h1>
        <article><a href="/immobilien/objekt-123">Neu: Eigentumswohnung Dresden Kaufpreis 350.000 €</a><time>01.07.2026</time></article>
        <article><a href="/immobilien/objekt-456">Haus kaufen mit 5 Zimmern EUR 520.000</a></article>
        <a href="https://www.immobilienscout24.de/expose/999">Portal-Link nicht zählen</a>
      </main>
    `;

    const result = extractListingState(html, 'https://makler.test/angebote', {
      siteUrl: 'https://makler.test',
      now: new Date('2026-07-06T00:00:00Z'),
    });

    expect(result.count).toBe(2);
    expect(result.items.map((item) => item.url)).toEqual([
      'https://makler.test/immobilien/objekt-123',
      'https://makler.test/immobilien/objekt-456',
    ]);
    expect(result.hasNeu).toBe(true);
    expect(result.dates[0]).toMatchObject({ iso: '2026-07-01' });
  });

  test('detects public Instagram post dates when present', () => {
    const html = '<html><body><time datetime="2026-04-15T12:00:00.000Z"></time><script>{"taken_at_timestamp":1780000000}</script></body></html>';
    expect(parseInstagramDateFromHtml(html)).toBe('2026-05-28');
  });

  test('detects marketing vacancies on public jobs pages', () => {
    const result = extractJobSignals('<h1>Karriere</h1><p>Wir suchen einen Performance Marketing Manager für Kampagnen.</p>', 'https://makler.test/karriere');
    expect(result).toMatchObject({
      hasJobPage: true,
      marketingJobFound: true,
    });
    expect(result.marketingTerms).toContain('Performance Marketing');
  });

  test('scores new listings as P1 and stale Instagram or marketing jobs as P2', () => {
    expect(scoreIntentSignals({
      listings: { newCount: 1, count: 4 },
      instagram: { daysSinceLastPost: 10 },
      jobs: { marketingJobFound: false },
    }, scoring)).toMatchObject({ priority: 'P1' });

    expect(scoreIntentSignals({
      listings: { newCount: 0, count: 0 },
      instagram: { daysSinceLastPost: 90 },
      jobs: { marketingJobFound: false },
    }, scoring)).toMatchObject({ priority: 'P2' });

    expect(scoreIntentSignals({
      listings: { newCount: 0, count: 0 },
      instagram: { daysSinceLastPost: 0 },
      jobs: { marketingJobFound: true },
    }, scoring)).toMatchObject({ priority: 'P2' });
  });

  test('parses firm input with Notion-style Firma and Website columns', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lead-scout-'));
    const file = path.join(dir, 'firms.csv');
    fs.writeFileSync(file, 'Firma;Website\nNova Immo;makler.test\n');

    await expect(readFirmInput(file)).resolves.toEqual([{ firma: 'Nova Immo', website: 'https://makler.test/' }]);
  });

  test('honors robots disallow rules for the configured public crawler', () => {
    const robots = 'User-agent: *\nDisallow: /private\nAllow: /private/public\n';
    expect(robotsAllows(robots, '/private/objekte')).toBe(false);
    expect(robotsAllows(robots, '/private/public/objekte')).toBe(true);
  });
});
