import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { extractContactInfo, extractSignals, scoreSignals } = require('../scripts/lead-scout/parser');
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
