#!/usr/bin/env node
const fs = require('node:fs/promises');
const { extractContactInfo, extractSignals, scoreSignals, domainOf, absoluteUrl, extractLinks, extractTitle, extractFirmaFromImpressum } = require('./parser');
const scoring = require('./scoring.json');

const COLS = ['Firma','Website','Kontakt-URL','Stadt','Ansprechpartner','Telefon','E-Mail','Score','Tier','Signale','Warum passt','Opener','Kanal','Status','Consent E-Mail','Notizen','Quellen'];

function arg(name, fallback = '') { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; }
function has(name) { return process.argv.includes(`--${name}`); }
function csvEscape(v) { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function toCsv(rows) { return [COLS.join(','), ...rows.map((r) => COLS.map((c) => csvEscape(r[c])).join(','))].join('\n'); }
async function readLines(file) { return (await fs.readFile(file, 'utf8')).split(/\r?\n/).map((l) => l.trim()).filter(Boolean); }
function normalizeSite(url) { if (!/^https?:\/\//i.test(url)) return `https://${url}`; return url; }

async function fetchText(url, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'NovaHaus Lead Scout/1.0 (+public data discovery)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { url: res.url, html: await res.text(), error: '' };
  } catch (e) {
    return { url, html: '', error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally { clearTimeout(timer); }
}

async function places(city, limit) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({ query: `Immobilienmakler ${city}`, key });
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places text search failed: HTTP ${res.status}`);
  const data = await res.json();
  const out = [];
  for (const p of (data.results || []).slice(0, limit)) {
    if (!p.place_id) continue;
    const durl = `https://maps.googleapis.com/maps/api/place/details/json?${new URLSearchParams({ place_id: p.place_id, fields: 'name,website,formatted_phone_number', key })}`;
    const detail = await (await fetch(durl)).json();
    const r = detail.result || {};
    if (r.website) out.push({ name: r.name || p.name || '', website: r.website, phone: r.formatted_phone_number || '' });
  }
  return out;
}

async function knownDomains(file) {
  if (!file) return new Set();
  const txt = await fs.readFile(file, 'utf8').catch(() => '');
  return new Set([...txt.matchAll(/https?:\/\/[^,;\s"]+/gi)].map((m) => domainOf(m[0])).filter(Boolean));
}

function discoverPageUrls(home) {
  const base = normalizeSite(home);
  return [...new Set([base, absoluteUrl(base, '/kontakt'), absoluteUrl(base, '/impressum')])];
}

function signalList(s) {
  const labels = [];
  if (s.bewertungCta) labels.push('Bewertung/Wertermittlung-CTA');
  if (s.separateFunnels) labels.push('Funnels Verkaufen/Vermieten');
  if (s.pixelOrGtm) labels.push('Meta Pixel/GTM');
  if (s.contactForm) labels.push('Kontaktformular');
  if (s.activeListings) labels.push('aktive Listings');
  if (s.multiCity) labels.push('Multi-City');
  return labels.join('; ');
}

function buildCopy(name, city, signals, score) {
  const sig = signalList(signals);
  if (!sig || score < scoring.tiers.B) {
    return { why: '', opener: '', notizen: 'zu wenig Signale — manuell prüfen' };
  }
  const why = `${name || 'Das Maklerbüro'} zeigt ${sig}. Das passt als Akquise-Lead, weil NovaHaus konkrete Funnel- und Tracking-Ansatzpunkte für Eigentümeranfragen ableiten kann.`;
  let opener = `Hallo, mir ist auf Ihrer Website in ${city || 'Ihrer Region'} aufgefallen, dass Sie bereits ${sig.split('; ')[0]} nutzen.`;
  if (signals.bewertungCta) opener = `Hallo, mir ist Ihre Immobilienbewertung/Wertermittlung auf der Website aufgefallen.`;
  else if (signals.separateFunnels) opener = `Hallo, mir sind Ihre getrennten Bereiche für Verkauf und Vermietung aufgefallen.`;
  return { why, opener, notizen: '' };
}

async function inspectLead(lead, city) {
  const urls = discoverPageUrls(lead.website);
  const pages = [];
  for (const url of urls) pages.push(await fetchText(url));
  const goodPages = pages.filter((p) => p.html);
  const homeLinks = goodPages[0] ? extractLinks(goodPages[0].html, goodPages[0].url) : [];
  const contactUrl = homeLinks.find((l) => /kontakt|contact|impressum/i.test(l.href + ' ' + l.text))?.href || urls[1];
  const signals = extractSignals(goodPages);
  const { score, tier } = scoreSignals(signals, scoring);
  const impressum = goodPages.find((p) => /impressum/i.test(p.url)) || goodPages.find((p) => /impressum/i.test(p.html)) || { html: '' };
  const info = extractContactInfo(impressum.html || goodPages.map((p) => p.html).join('\n'));
  const firma = lead.name || extractFirmaFromImpressum(impressum.html || '') || extractTitle(goodPages[0]?.html || '') || domainOf(lead.website);
  const copy = buildCopy(firma, city, signals, score);
  const sources = pages.map((p) => `${p.url}${p.error ? ` (${p.error})` : ''}`).join('; ');
  return {
    Firma: firma, Website: normalizeSite(lead.website), 'Kontakt-URL': contactUrl, Stadt: city,
    Ansprechpartner: info.ansprechpartner, Telefon: info.telefon || lead.phone || '', 'E-Mail': info.email,
    Score: score, Tier: tier, Signale: signalList(signals), 'Warum passt': copy.why,
    Opener: copy.opener, Kanal: (info.telefon || lead.phone) ? 'Telefon' : 'Formular', Status: 'neu', 'Consent E-Mail': 'keine', Notizen: copy.notizen, Quellen: sources
  };
}

async function main() {
  if (has('help') || process.argv.length < 3) {
    console.log('Usage: node scripts/lead-scout --city "Dresden" [--limit 30] [--input urls.txt] [--known existing.csv] [--output leads.csv]');
    return;
  }
  const city = arg('city', '');
  const limit = Number(arg('limit', '30')) || 30;
  const input = arg('input', '');
  let leads = await places(city, limit);
  if (!leads.length && input) leads = (await readLines(input)).slice(0, limit).map((website) => ({ website }));
  if (!leads.length) throw new Error('No leads found. Set GOOGLE_PLACES_API_KEY or pass --input urls.txt.');
  const known = await knownDomains(arg('known', ''));
  const seen = new Set(known);
  const rows = [];
  for (const lead of leads) {
    const d = domainOf(normalizeSite(lead.website));
    if (!d || seen.has(d)) continue;
    seen.add(d);
    rows.push(await inspectLead(lead, city));
  }
  const csv = toCsv(rows);
  const output = arg('output', '');
  if (output) await fs.writeFile(output, csv + '\n'); else console.log(csv);
}

main().catch((e) => { console.error(`lead-scout: ${e.message}`); process.exit(1); });
