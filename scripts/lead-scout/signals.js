const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { absoluteUrl, domainOf, extractLinks, stripTags } = require('./parser');
const scoring = require('./scoring.json');

const SIGNAL_COLS = [
  'Firma',
  'Website',
  'Signal Listings',
  'Signal Instagram',
  'Signal Jobs',
  'Anruf-Priorität',
  'Warum jetzt anrufen',
];

const DEFAULT_CACHE_DIR = path.join(__dirname, '.cache');
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ROBOTS_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const USER_AGENT = 'NovaHaus Lead Scout/1.1 (+public website intent signals; no login)';

const LISTING_PATHS = [
  '/angebote',
  '/immobilien',
  '/immobilienangebote',
  '/objekte',
  '/kaufen',
  '/immobilien/kaufen',
  '/angebote/kaufen',
];

const JOB_PATHS = [
  '/karriere',
  '/jobs',
  '/stellenangebote',
  '/stellenanzeigen',
  '/unternehmen/karriere',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function safeDecode(value = '') {
  try {
    return decodeURIComponent(value);
  } catch {
    return String(value);
  }
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, columns = SIGNAL_COLS) {
  return [columns.join(','), ...rows.map((row) => columns.map((col) => csvEscape(row[col])).join(','))].join('\n');
}

function normalizeSite(value = '') {
  let input = String(value || '').trim().replace(/^["']|["']$/g, '');
  if (!input || /^(mailto|tel):/i.test(input)) return '';
  if (/^\/\//.test(input)) input = `https:${input}`;
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
  try {
    const url = new URL(input);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function isSameSiteUrl(url, siteUrl) {
  const host = hostnameOf(url);
  const base = hostnameOf(siteUrl);
  return Boolean(host && base && (host === base || host.endsWith(`.${base}`)));
}

function isImmoScoutUrl(url) {
  const host = hostnameOf(url);
  return host === 'immobilienscout24.de' || host.endsWith('.immobilienscout24.de') || host === 'immoscout24.de' || host.endsWith('.immoscout24.de');
}

function isInstagramUrl(url) {
  const host = hostnameOf(url);
  return host === 'instagram.com' || host.endsWith('.instagram.com');
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function safeName(value) {
  return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown';
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function readFreshJson(file, maxAgeMs) {
  const data = await readJson(file);
  if (!data) return null;
  const ts = Date.parse(data.fetchedAt || data.createdAt || '');
  if (!ts || Date.now() - ts > maxAgeMs) return null;
  return data;
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

function cacheFileFor(cacheDir, bucket, key) {
  return path.join(cacheDir, bucket, `${stableHash(key)}.json`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseRobotsGroups(text = '') {
  const groups = [];
  let agents = [];
  let rules = [];

  const pushGroup = () => {
    if (agents.length) groups.push({ agents, rules });
    agents = [];
    rules = [];
  };

  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) {
      pushGroup();
      continue;
    }
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      if (rules.length) pushGroup();
      agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && agents.length) {
      rules.push({ type: key, path: value });
    }
  }
  pushGroup();
  return groups;
}

function ruleMatches(pathname, pattern) {
  if (!pattern) return false;
  const endAnchored = pattern.endsWith('$');
  const raw = endAnchored ? pattern.slice(0, -1) : pattern;
  const source = `^${escapeRegExp(raw).replace(/\\\*/g, '.*')}${endAnchored ? '$' : ''}`;
  try {
    return new RegExp(source).test(pathname);
  } catch {
    return pathname.startsWith(raw.replace(/\*/g, ''));
  }
}

function robotsAllows(text = '', pathname = '/', userAgent = USER_AGENT) {
  const groups = parseRobotsGroups(text);
  if (!groups.length) return true;
  const ua = userAgent.toLowerCase();
  const specific = groups.filter((group) => group.agents.some((agent) => agent !== '*' && ua.includes(agent)));
  const wildcard = groups.filter((group) => group.agents.includes('*'));
  const selected = specific.length ? specific : wildcard;
  let best = null;

  for (const group of selected) {
    for (const rule of group.rules) {
      if (rule.type === 'disallow' && !rule.path) continue;
      if (!ruleMatches(pathname, rule.path)) continue;
      const weight = rule.path.length;
      if (!best || weight > best.weight || (weight === best.weight && rule.type === 'allow')) {
        best = { type: rule.type, weight };
      }
    }
  }
  return best ? best.type !== 'disallow' : true;
}

class PublicFetcher {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.cacheMaxAgeMs = options.cacheMaxAgeMs ?? DEFAULT_CACHE_MAX_AGE_MS;
    this.refresh = Boolean(options.refresh);
    this.userAgent = options.userAgent || USER_AGENT;
    this.lastRequestAt = new Map();
    this.robotsMemo = new Map();
    this.now = options.now || (() => new Date());
  }

  async throttle(url) {
    const host = hostnameOf(url);
    if (!host) return;
    const last = this.lastRequestAt.get(host) || 0;
    const waitMs = Math.max(0, 1000 - (Date.now() - last));
    if (waitMs) await sleep(waitMs);
    this.lastRequestAt.set(host, Date.now());
  }

  async getRobots(origin) {
    if (this.robotsMemo.has(origin)) return this.robotsMemo.get(origin);
    const robotsUrl = absoluteUrl(origin, '/robots.txt');
    const cacheFile = cacheFileFor(this.cacheDir, 'robots', robotsUrl);
    if (!this.refresh) {
      const cached = await readFreshJson(cacheFile, ROBOTS_CACHE_MAX_AGE_MS);
      if (cached) {
        this.robotsMemo.set(origin, cached);
        return cached;
      }
    }

    await this.throttle(robotsUrl);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let result;
    try {
      const res = await fetch(robotsUrl, {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: { 'user-agent': this.userAgent, accept: 'text/plain,*/*;q=0.8' },
      });
      result = {
        url: robotsUrl,
        finalUrl: res.url || robotsUrl,
        status: res.status,
        text: res.ok ? await res.text() : '',
        error: res.ok ? '' : `HTTP ${res.status}`,
        fetchedAt: this.now().toISOString(),
      };
    } catch (error) {
      result = {
        url: robotsUrl,
        finalUrl: robotsUrl,
        status: 0,
        text: '',
        error: error.name === 'AbortError' ? 'timeout' : error.message,
        fetchedAt: this.now().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
    await writeJson(cacheFile, result);
    this.robotsMemo.set(origin, result);
    return result;
  }

  async isAllowed(url) {
    try {
      const parsed = new URL(url);
      const robots = await this.getRobots(parsed.origin);
      return robotsAllows(robots.text || '', `${parsed.pathname}${parsed.search}`, this.userAgent);
    } catch {
      return true;
    }
  }

  async fetchText(url, options = {}) {
    const target = normalizeSite(url);
    if (!target) return { url, finalUrl: url, html: '', error: 'invalid url', fetchedAt: this.now().toISOString() };

    if (!options.skipRobots) {
      const allowed = await this.isAllowed(target);
      if (!allowed) {
        return { url: target, finalUrl: target, html: '', error: 'robots.txt disallow', disallowed: true, fetchedAt: this.now().toISOString() };
      }
    }

    const cacheFile = cacheFileFor(this.cacheDir, 'responses', target);
    const maxAgeMs = options.cacheMaxAgeMs ?? this.cacheMaxAgeMs;
    if (!this.refresh && maxAgeMs > 0) {
      const cached = await readFreshJson(cacheFile, maxAgeMs);
      if (cached) return { ...cached, fromCache: true };
    }

    await this.throttle(target);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), options.timeoutMs || this.timeoutMs);
    let result;
    try {
      const res = await fetch(target, {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: {
          'user-agent': this.userAgent,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();
      result = {
        url: target,
        finalUrl: res.url || target,
        status: res.status,
        contentType,
        html: res.ok ? text.slice(0, 2_000_000) : '',
        error: res.ok ? '' : `HTTP ${res.status}`,
        fetchedAt: this.now().toISOString(),
      };
    } catch (error) {
      result = {
        url: target,
        finalUrl: target,
        status: 0,
        contentType: '',
        html: '',
        error: error.name === 'AbortError' ? 'timeout' : error.message,
        fetchedAt: this.now().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
    await writeJson(cacheFile, result);
    return result;
  }
}

function countDelimiterOutsideQuotes(line, delimiter) {
  let quoted = false;
  let count = 0;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      count += 1;
    }
  }
  return count;
}

function detectDelimiter(line) {
  const candidates = [';', ',', '\t'];
  return candidates.sort((a, b) => countDelimiterOutsideQuotes(line, b) - countDelimiterOutsideQuotes(line, a))[0];
}

function splitDelimitedLine(line, delimiter = detectDelimiter(line)) {
  const cells = [];
  let quoted = false;
  let current = '';
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function looksLikeWebsite(value = '') {
  return /(?:https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(String(value));
}

function normalizeHeader(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '');
}

function rowFromCells(cells) {
  const websiteIndex = cells.findIndex((cell) => looksLikeWebsite(cell) && normalizeSite(cell));
  if (websiteIndex >= 0) {
    const website = normalizeSite(cells[websiteIndex]);
    const firma = normalizeWhitespace(cells.find((cell, index) => index !== websiteIndex && cell && !looksLikeWebsite(cell)) || '');
    return { firma, website };
  }
  return { firma: normalizeWhitespace(cells[0] || ''), website: '' };
}

async function readFirmInput(file) {
  const text = (await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = detectDelimiter(lines[0]);
  const first = splitDelimitedLine(lines[0], delimiter);
  const headers = first.map(normalizeHeader);
  const websiteIndex = headers.findIndex((header) => ['website', 'webseite', 'url', 'site', 'domain'].includes(header));
  const firmaIndex = headers.findIndex((header) => ['firma', 'name', 'unternehmen', 'company'].includes(header));

  if (websiteIndex >= 0) {
    return lines.slice(1).map((line) => {
      const cells = splitDelimitedLine(line, delimiter);
      return {
        firma: normalizeWhitespace(cells[firmaIndex] || ''),
        website: normalizeSite(cells[websiteIndex] || ''),
      };
    }).filter((row) => row.firma || row.website);
  }

  return lines.map((line) => rowFromCells(splitDelimitedLine(line, detectDelimiter(line)))).filter((row) => row.firma || row.website);
}

function linkScoreForListings(link, website) {
  if (!isSameSiteUrl(link.href, website) || isImmoScoutUrl(link.href)) return -100;
  const haystack = `${safeDecode(link.href)} ${link.text}`.toLowerCase();
  let score = 0;
  if (/(immobilienangebote|angebote|objekte|kaufen|immobilien|expos[eé])/.test(haystack)) score += 40;
  if (/(wohnung|haus|grundst[üu]ck|gewerbe|kaufpreis|miete)/.test(haystack)) score += 15;
  if (/(bewertung|wertermittlung|referenz|verkauft|team|kontakt|impressum|datenschutz|karriere|jobs|blog|news|login)/.test(haystack)) score -= 45;
  return score;
}

function candidateListingUrls(homePage, website) {
  const links = extractLinks(homePage.html || '', homePage.finalUrl || homePage.url || website)
    .map((link) => ({ ...link, score: linkScoreForListings(link, website) }))
    .filter((link) => link.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((link) => link.href);
  return uniqueUrls([...links, ...LISTING_PATHS.map((item) => absoluteUrl(website, item))])
    .filter((url) => isSameSiteUrl(url, website) && !isImmoScoutUrl(url))
    .slice(0, 6);
}

function linkScoreForJobs(link, website) {
  if (!isSameSiteUrl(link.href, website)) return -100;
  const haystack = `${safeDecode(link.href)} ${link.text}`.toLowerCase();
  let score = 0;
  if (/(karriere|jobs|stellenangebote|stellenanzeigen|bewerbung|career)/.test(haystack)) score += 50;
  if (/(kontakt|impressum|datenschutz|blog|news)/.test(haystack)) score -= 35;
  return score;
}

function candidateJobUrls(homePage, website) {
  const links = extractLinks(homePage.html || '', homePage.finalUrl || homePage.url || website)
    .map((link) => ({ ...link, score: linkScoreForJobs(link, website) }))
    .filter((link) => link.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((link) => link.href);
  return uniqueUrls([...links, ...JOB_PATHS.map((item) => absoluteUrl(website, item))]).filter((url) => isSameSiteUrl(url, website)).slice(0, 5);
}

function uniqueUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const url of urls) {
    const normalized = normalizeSite(url);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function hasNoListings(text) {
  return /(keine\s+(?:immobilien|objekte|angebote)|derzeit\s+keine|aktuell\s+keine|leider\s+keine)/i.test(text);
}

function extractExplicitListingCount(text) {
  const patterns = [
    /\b(\d{1,3})\s*(?:verfügbare\s*)?(?:immobilien|objekte|angebote|expos[eé]s|treffer)\b/i,
    /\b(?:immobilien|objekte|angebote|expos[eé]s|treffer)\s*\((\d{1,3})\)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  if (hasNoListings(text)) return 0;
  return null;
}

function looksLikeListingItemLink(link, siteUrl) {
  if (siteUrl && !isSameSiteUrl(link.href, siteUrl)) return false;
  if (isImmoScoutUrl(link.href)) return false;
  let parsed;
  try {
    parsed = new URL(link.href);
  } catch {
    return false;
  }
  const pathName = safeDecode(parsed.pathname).toLowerCase();
  const text = normalizeWhitespace(link.text).toLowerCase();
  const haystack = `${pathName} ${text}`;
  if (/(kontakt|impressum|datenschutz|karriere|jobs|bewertung|wertermittlung|team|referenzen|verkauft|login|cookie)/.test(haystack)) return false;
  if (/^\/(?:angebote|immobilien|objekte|kaufen|verkaufen|vermieten)\/?$/.test(pathName)) return false;
  const hasDetailPath = /(?:expos[eé]|objekt|angebot|immobilie|wohnung|haus|grundst[üu]ck|property|listing)[-/_.a-z0-9]*\d{2,}/i.test(pathName);
  const hasEstateText = /(kaufpreis|kaltmiete|wohnfl[äa]che|zimmer|€|eur|m²|m2|eigentumswohnung|mehrfamilienhaus|haus kaufen|wohnung kaufen)/i.test(text);
  return hasDetailPath || hasEstateText;
}

function listingIdFromLink(link) {
  try {
    const parsed = new URL(link.href);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return stableHash(`${link.href}:${link.text}`);
  }
}

function extractListingItems(html, pageUrl, siteUrl) {
  const items = new Map();
  for (const link of extractLinks(html || '', pageUrl)) {
    if (!looksLikeListingItemLink(link, siteUrl)) continue;
    const id = listingIdFromLink(link);
    if (!items.has(id)) {
      items.set(id, {
        id,
        url: link.href,
        title: normalizeWhitespace(link.text).slice(0, 140),
      });
    }
  }
  return [...items.values()];
}

const MONTHS = {
  januar: 0,
  jan: 0,
  februar: 1,
  feb: 1,
  märz: 2,
  maerz: 2,
  mrz: 2,
  april: 3,
  apr: 3,
  mai: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  november: 10,
  nov: 10,
  dezember: 11,
  dez: 11,
  january: 0,
  february: 1,
  march: 2,
  april_en: 3,
  may: 4,
  june: 5,
  july: 6,
  august_en: 7,
  september_en: 8,
  october: 9,
  november_en: 10,
  december: 11,
};

function isoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function makeDate(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractDates(text = '', now = new Date()) {
  const value = String(text);
  const out = new Map();
  const add = (date, original) => {
    const iso = isoDate(date);
    if (iso) out.set(iso, { iso, original: normalizeWhitespace(original || iso) });
  };

  for (const match of value.matchAll(/\b(20\d{2})-([01]?\d)-([0-3]?\d)\b/g)) {
    add(makeDate(Number(match[1]), Number(match[2]) - 1, Number(match[3])), match[0]);
  }
  for (const match of value.matchAll(/\b([0-3]?\d)[./]([01]?\d)[./]((?:20)?\d{2})\b/g)) {
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    add(makeDate(year, Number(match[2]) - 1, Number(match[1])), match[0]);
  }
  for (const match of value.matchAll(/\b([0-3]?\d)\.?\s+(Januar|Jan|Februar|Feb|März|Maerz|Mrz|April|Apr|Mai|Juni|Jun|Juli|Jul|August|Aug|September|Sep|Oktober|Okt|November|Nov|Dezember|Dez|January|February|March|May|June|July|October|December)\s+(20\d{2})\b/gi)) {
    const key = match[2].toLowerCase();
    const month = MONTHS[key] ?? MONTHS[`${key}_en`];
    if (month !== undefined) add(makeDate(Number(match[3]), month, Number(match[1])), match[0]);
  }

  if (/\bheute\b/i.test(value)) add(now, 'heute');
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (/\bgestern\b/i.test(value)) add(yesterday, 'gestern');
  for (const match of value.matchAll(/\bvor\s+(\d{1,2})\s+(tag|tagen|woche|wochen|monat|monaten)\b/gi)) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const days = unit.startsWith('tag') ? amount : unit.startsWith('woche') ? amount * 7 : amount * 30;
    add(new Date(now.getTime() - days * 24 * 60 * 60 * 1000), match[0]);
  }

  return [...out.values()].sort((a, b) => b.iso.localeCompare(a.iso));
}

function fallbackListingCount(text) {
  if (!/(kaufpreis|kaltmiete|wohnfl[äa]che|zimmer|objekt|immobilie|expos[eé]|angebot)/i.test(text)) return null;
  const priceMatches = text.match(/kaufpreis|kaltmiete|€|\beur\b/gi) || [];
  return priceMatches.length ? Math.min(priceMatches.length, 99) : null;
}

function extractListingState(html = '', pageUrl = '', options = {}) {
  const text = stripTags(html);
  const items = extractListingItems(html, pageUrl, options.siteUrl || pageUrl);
  const explicitCount = extractExplicitListingCount(text);
  const count = items.length || (explicitCount ?? fallbackListingCount(text));
  const dates = extractDates(text, options.now || new Date()).slice(0, 5);
  const hasNeu = /\b(neu|new|aktuell|frisch|gerade\s+eingestellt|neu\s+im\s+angebot)\b/i.test(text);
  return {
    pageUrl,
    count,
    items,
    dates,
    hasNeu,
    freshLabels: [...(hasNeu ? ['Neu'] : []), ...dates.map((date) => date.original)],
  };
}

async function compareAndSaveListingSnapshot(cacheDir, domain, snapshot, now = new Date()) {
  const dir = path.join(cacheDir, 'snapshots', safeName(domain));
  const latestFile = path.join(dir, 'latest.json');
  const previous = await readJson(latestFile);
  const previousIds = new Set((previous?.items || []).map((item) => item.id).filter(Boolean));
  const currentIds = (snapshot.items || []).map((item) => item.id).filter(Boolean);
  let newItems = [];

  if (previous && previousIds.size && currentIds.length) {
    newItems = (snapshot.items || []).filter((item) => item.id && !previousIds.has(item.id));
  }

  let newCount = newItems.length;
  if (!newCount && previous && !previousIds.size && Number.isFinite(snapshot.count) && Number.isFinite(previous.count) && snapshot.count > previous.count) {
    newCount = snapshot.count - previous.count;
  }

  const createdAt = now.toISOString();
  const enriched = {
    ...snapshot,
    previousSnapshotAt: previous?.createdAt || '',
    newItems,
    newCount,
    createdAt,
  };
  await writeJson(path.join(dir, `${createdAt.replace(/[:.]/g, '-')}.json`), enriched);
  await writeJson(latestFile, enriched);
  return enriched;
}

function isUsefulListingPage(state, html = '', url = '') {
  const text = stripTags(html);
  if (state.count !== null && state.count !== undefined) return true;
  return /(angebote|immobilien|objekte|kaufen|expos[eé])/.test(url.toLowerCase()) && hasNoListings(text);
}

async function collectListings(lead, homePage, fetcher, options = {}) {
  if (!homePage.html) return { status: 'unbekannt', count: null, newCount: 0, pageUrl: '', error: homePage.error || 'unbekannt' };
  const now = options.now || new Date();
  const website = lead.website;
  const domain = domainOf(website);
  const inspectPage = async (page) => {
    const pageUrl = page.finalUrl || page.url || website;
    const state = extractListingState(page.html, pageUrl, { siteUrl: website, now });
    if (!isUsefulListingPage(state, page.html, pageUrl)) return null;
    const snapshot = await compareAndSaveListingSnapshot(options.cacheDir || DEFAULT_CACHE_DIR, domain, state, now);
    return { status: 'ok', ...snapshot };
  };

  const homeResult = await inspectPage(homePage);
  if (homeResult) return homeResult;

  for (const url of candidateListingUrls(homePage, website)) {
    const page = await fetcher.fetchText(url);
    if (!page.html) continue;
    const result = await inspectPage(page);
    if (result) return result;
  }
  return { status: 'unbekannt', count: null, newCount: 0, pageUrl: '', error: 'no listing page found' };
}

function normalizeInstagramUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    if (/\/accounts\//i.test(parsed.pathname)) return '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function findInstagramUrl(html = '', baseUrl = '') {
  for (const link of extractLinks(html, baseUrl)) {
    if (!isInstagramUrl(link.href)) continue;
    const normalized = normalizeInstagramUrl(link.href);
    if (normalized) return normalized;
  }
  return '';
}

function parseInstagramDateFromHtml(html = '') {
  const dates = [];
  const addIso = (value) => {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) dates.push(date);
  };
  for (const match of String(html).matchAll(/<time\b[^>]*datetime=["']([^"']+)["']/gi)) addIso(match[1]);
  for (const match of String(html).matchAll(/"(?:datePublished|uploadDate)"\s*:\s*"([^"]+)"/gi)) addIso(match[1]);
  for (const match of String(html).matchAll(/"taken_at_timestamp"\s*:\s*(\d{10})/gi)) addIso(Number(match[1]) * 1000);
  for (const match of String(html).matchAll(/\bon\s+([A-Z][a-z]+\s+\d{1,2},\s+20\d{2})/g)) addIso(match[1]);
  if (!dates.length) return '';
  return isoDate(new Date(Math.max(...dates.map((date) => date.getTime()))));
}

function daysBetween(iso, now = new Date()) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

async function collectInstagram(lead, homePage, fetcher, options = {}) {
  if (!homePage.html) return { status: 'unbekannt', url: '', lastPostDate: '', daysSinceLastPost: null, manual: false };
  const url = findInstagramUrl(homePage.html, homePage.finalUrl || homePage.url || lead.website);
  if (!url) return { status: 'unbekannt', url: '', lastPostDate: '', daysSinceLastPost: null, manual: false };
  const page = await fetcher.fetchText(url);
  if (!page.html) return { status: 'manual', url, lastPostDate: '', daysSinceLastPost: null, manual: true, error: page.error || 'unbekannt' };
  const lastPostDate = parseInstagramDateFromHtml(page.html);
  if (!lastPostDate) return { status: 'manual', url, lastPostDate: '', daysSinceLastPost: null, manual: true, error: 'date unavailable' };
  const days = daysBetween(lastPostDate, options.now || new Date());
  const staleDays = scoring.intentSignals?.instagramStaleDays || 60;
  return { status: days > staleDays ? 'stale' : 'active', url, lastPostDate, daysSinceLastPost: days, manual: false };
}

function extractJobSignals(html = '', pageUrl = '') {
  const text = stripTags(html);
  const haystack = `${pageUrl} ${text}`;
  const hasJobPage = /(karriere|jobs?|stellenangebote|stellenanzeigen|bewerbung|career|wir\s+suchen)/i.test(haystack);
  const matches = [...haystack.matchAll(/\b(online\s+marketing|performance\s+marketing|marketing\s+manager|social\s+media|content\s+marketing|seo|sea|lead\s+generation|kommunikation|kampagnen)\b/gi)]
    .map((match) => normalizeWhitespace(match[1]));
  return {
    hasJobPage,
    marketingJobFound: matches.length > 0,
    marketingTerms: [...new Set(matches)].slice(0, 5),
    pageUrl,
  };
}

function buildIndeedUrl(firma = '', website = '') {
  const company = firma || domainOf(website);
  const params = new URLSearchParams({ q: `${company} marketing` });
  return `https://de.indeed.com/jobs?${params.toString()}`;
}

async function collectJobs(lead, homePage, fetcher) {
  const indeedUrl = buildIndeedUrl(lead.firma, lead.website);
  if (!homePage.html) return { status: 'unbekannt', hasJobPage: false, marketingJobFound: false, marketingTerms: [], pageUrl: '', indeedUrl };
  for (const url of candidateJobUrls(homePage, lead.website)) {
    const page = await fetcher.fetchText(url);
    if (!page.html) continue;
    const state = extractJobSignals(page.html, page.finalUrl || page.url || url);
    if (state.hasJobPage) return { status: 'ok', ...state, indeedUrl };
  }
  return { status: 'unbekannt', hasJobPage: false, marketingJobFound: false, marketingTerms: [], pageUrl: '', indeedUrl };
}

function scoreIntentSignals(signals, config = scoring) {
  const cfg = config.intentSignals || {};
  let score = 0;
  const reasons = [];
  if ((signals.listings?.newCount || 0) > 0) {
    score += cfg.newListingBoost || 0;
    reasons.push('new_listing');
  } else if ((signals.listings?.count || 0) > 0) {
    score += cfg.activeListingInventoryBoost || 0;
    reasons.push('active_inventory');
  }
  if ((signals.instagram?.daysSinceLastPost || 0) > (cfg.instagramStaleDays || 60)) {
    score += cfg.staleInstagramBoost || 0;
    reasons.push('stale_instagram');
  }
  if (signals.jobs?.marketingJobFound) {
    score += cfg.marketingJobBoost || 0;
    reasons.push('marketing_job');
  }
  score = Math.max(0, Math.min(100, score));
  const thresholds = cfg.priorities || { P1: 55, P2: 25, P3: 0 };
  const priority = score >= thresholds.P1 ? 'P1' : score >= thresholds.P2 ? 'P2' : 'P3';
  return { score, priority, reasons };
}

function formatListingsSignal(listings) {
  if (!listings || listings.status !== 'ok') return 'unbekannt';
  const parts = [];
  if (listings.count === null || listings.count === undefined) parts.push('unbekannt');
  else parts.push(`${listings.count} Objekt${listings.count === 1 ? '' : 'e'}`);
  if (listings.previousSnapshotAt) parts.push(`${listings.newCount || 0} NEU seit letztem Lauf`);
  else parts.push('keine Vorhistorie');
  if (listings.hasNeu) parts.push('Neu-Markierung');
  if (listings.dates?.length) parts.push(`Daten: ${listings.dates.map((date) => date.original).join(', ')}`);
  return parts.join('; ');
}

function formatInstagramSignal(instagram) {
  if (!instagram?.url) return 'unbekannt';
  if (instagram.manual) return `${instagram.url}; manuell prüfen`;
  if (!instagram.lastPostDate) return `${instagram.url}; manuell prüfen`;
  if ((instagram.daysSinceLastPost || 0) > (scoring.intentSignals?.instagramStaleDays || 60)) {
    return `inaktiv >60 Tage; letzter Post ${instagram.lastPostDate} (${instagram.daysSinceLastPost} Tage); ${instagram.url}`;
  }
  return `letzter Post ${instagram.lastPostDate} (${instagram.daysSinceLastPost} Tage); ${instagram.url}`;
}

function formatJobsSignal(jobs) {
  if (!jobs) return 'unbekannt';
  const indeed = jobs.indeedUrl ? `Indeed: ${jobs.indeedUrl}` : '';
  if (jobs.marketingJobFound) {
    const terms = jobs.marketingTerms?.length ? ` (${jobs.marketingTerms.join(', ')})` : '';
    return `Marketing-Vakanz gefunden${terms}; ${indeed}`;
  }
  if (jobs.status === 'ok') return `keine Marketing-Vakanz gefunden; ${indeed}`;
  return `unbekannt; ${indeed}`;
}

function buildWhyNow(firma, signals, score) {
  const name = firma || 'Die Firma';
  if ((signals.listings?.newCount || 0) > 0) {
    const objectLabel = signals.listings.newCount === 1 ? 'neues Objekt' : 'neue Objekte';
    return `${name} hat seit dem letzten Lauf ${signals.listings.newCount} ${objectLabel} auf der eigenen Website, deshalb gibt es jetzt einen konkreten Anlass für Performance-Marketing.`;
  }
  if ((signals.instagram?.daysSinceLastPost || 0) > (scoring.intentSignals?.instagramStaleDays || 60)) {
    return `${name} wirkt auf Instagram seit ${signals.instagram.daysSinceLastPost} Tagen inaktiv, was ein starker Anlass für einen Content- und Lead-Kampagnen-Pitch ist.`;
  }
  if (signals.jobs?.marketingJobFound) {
    return `${name} sucht Marketing-Unterstützung, daher ist der Bedarf bereits intern sichtbar und ein Partner-Call anschlussfähig.`;
  }
  if ((signals.listings?.count || 0) > 0) {
    return `${name} hat aktuell ${signals.listings.count} Objekte online; ohne neue Listings bleibt der Call ein normaler Akquise-Touchpoint.`;
  }
  if (score.priority === 'P2') {
    return `${name} zeigt mehrere schwächere Intent-Signale, daher lohnt ein kurzer Prioritätscheck vor dem nächsten Akquise-Block.`;
  }
  return 'Keine harten Jetzt-Signale gefunden; nur manuell prüfen, wenn die Firma strategisch relevant ist.';
}

function buildSignalRow(lead, signals, score) {
  const firma = lead.firma || domainOf(lead.website) || 'unbekannt';
  return {
    Firma: firma,
    Website: lead.website || 'unbekannt',
    'Signal Listings': formatListingsSignal(signals.listings),
    'Signal Instagram': formatInstagramSignal(signals.instagram),
    'Signal Jobs': formatJobsSignal(signals.jobs),
    'Anruf-Priorität': score.priority,
    'Warum jetzt anrufen': buildWhyNow(firma, signals, score),
  };
}

function errorRow(lead, message = 'unbekannt') {
  const firma = lead.firma || domainOf(lead.website) || 'unbekannt';
  return {
    Firma: firma,
    Website: lead.website || 'unbekannt',
    'Signal Listings': 'unbekannt',
    'Signal Instagram': 'unbekannt',
    'Signal Jobs': 'unbekannt',
    'Anruf-Priorität': 'P3',
    'Warum jetzt anrufen': `Keine harten Jetzt-Signale gefunden; technische Prüfung nötig (${message}).`,
  };
}

async function collectFirmSignals(inputLead, options = {}) {
  const website = normalizeSite(inputLead.website);
  const firma = inputLead.firma || inputLead.name || domainOf(website);
  const lead = { firma, website };
  if (!website) return { row: errorRow(lead, 'website unbekannt'), signals: {}, score: { score: 0, priority: 'P3', reasons: [] } };
  if (isImmoScoutUrl(website)) return { row: errorRow(lead, 'ImmoScout wird nicht abgefragt'), signals: {}, score: { score: 0, priority: 'P3', reasons: [] } };

  const fetcher = options.fetcher || new PublicFetcher(options);
  const homePage = await fetcher.fetchText(website);
  const signals = {
    listings: await collectListings(lead, homePage, fetcher, options).catch((error) => ({ status: 'unbekannt', error: error.message, count: null, newCount: 0 })),
    instagram: await collectInstagram(lead, homePage, fetcher, options).catch((error) => ({ status: 'unbekannt', url: '', lastPostDate: '', daysSinceLastPost: null, error: error.message })),
    jobs: await collectJobs(lead, homePage, fetcher).catch((error) => ({ status: 'unbekannt', hasJobPage: false, marketingJobFound: false, marketingTerms: [], pageUrl: '', indeedUrl: buildIndeedUrl(firma, website), error: error.message })),
  };
  const score = scoreIntentSignals(signals, scoring);
  return { row: buildSignalRow(lead, signals, score), signals, score };
}

function argFrom(args, name, fallback = '') {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : fallback;
}

function hasArg(args, name) {
  return args.includes(`--${name}`);
}

async function runSignalsCli(args = process.argv.slice(3), io = console) {
  if (hasArg(args, 'help') || !argFrom(args, 'input')) {
    io.log('Usage: node scripts/lead-scout signals --input firms.csv [--output signals.csv] [--limit 100] [--cache-dir scripts/lead-scout/.cache] [--refresh]');
    return [];
  }

  const input = argFrom(args, 'input');
  const output = argFrom(args, 'output');
  const limit = Number(argFrom(args, 'limit', '0')) || Infinity;
  const cacheDir = path.resolve(argFrom(args, 'cache-dir', DEFAULT_CACHE_DIR));
  const now = new Date();
  const fetcher = new PublicFetcher({ cacheDir, refresh: hasArg(args, 'refresh'), now: () => now });
  const leads = (await readFirmInput(input)).slice(0, limit);
  const rows = [];

  for (const lead of leads) {
    try {
      const result = await collectFirmSignals(lead, { cacheDir, fetcher, now });
      rows.push(result.row);
    } catch (error) {
      rows.push(errorRow({ firma: lead.firma, website: normalizeSite(lead.website) }, error.message));
    }
  }

  const csv = toCsv(rows);
  if (output) await fs.writeFile(output, `${csv}\n`);
  else io.log(csv);
  return rows;
}

module.exports = {
  PublicFetcher,
  buildIndeedUrl,
  collectFirmSignals,
  extractDates,
  extractJobSignals,
  extractListingState,
  findInstagramUrl,
  parseInstagramDateFromHtml,
  readFirmInput,
  robotsAllows,
  runSignalsCli,
  scoreIntentSignals,
  toCsv,
};
