const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+49|0049|0)[\d\s().\/-]{6,}\d/g;

function stripTags(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/h\d>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#64;|\(at\)|\[at\]/gi, '@')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(base, href) {
  try { return new URL(href, base).toString(); } catch { return ''; }
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

function extractLinks(html = '', baseUrl = '') {
  const links = [];
  for (const match of String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    links.push({ href: absoluteUrl(baseUrl, match[1]), text: stripTags(match[2]) });
  }
  return links.filter((l) => l.href);
}

function extractContactInfo(html = '') {
  const text = stripTags(html);
  const emails = [...new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))];
  const phones = [...new Set((text.match(PHONE_RE) || []).map((p) => p.replace(/\s+/g, ' ').trim()))];
  const lines = text.split(/(?<=[.!?])\s+|\s{2,}|\n/).map((l) => l.trim()).filter(Boolean);
  let contact = '';
  const patterns = [
    /(?:Ansprechpartner(?:in)?|Geschäftsführer(?:in)?|Vertreten durch|Verantwortlich(?:e|er)?(?: i\.S\.d\.| für den Inhalt)?|Inhaber(?:in)?)[\s:,-]+([^.;|]{3,80})/i,
    /(?:Herr|Frau)\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) { contact = m[1].replace(/\b(?:Telefon|E-Mail|Mail|Tel)\b.*$/i, '').trim(); break; }
  }
  if (!contact) {
    const line = lines.find((l) => /(Geschäftsführer|Inhaber|Ansprechpartner|Vertreten durch)/i.test(l));
    if (line) contact = line.replace(/.*?(?:durch|Geschäftsführer(?:in)?|Inhaber(?:in)?|Ansprechpartner(?:in)?)[\s:,-]*/i, '').slice(0, 80).trim();
  }
  return { ansprechpartner: contact, telefon: phones[0] || '', email: emails[0] || '' };
}

function extractSignals(pages = []) {
  const allHtml = pages.map((p) => p.html || '').join('\n');
  const allText = stripTags(allHtml).toLowerCase();
  const links = pages.flatMap((p) => extractLinks(p.html, p.url));
  const contactForm = /<form\b/i.test(allHtml) && /(kontakt|anfrage|nachricht|name|telefon|email|e-mail)/i.test(allHtml);
  const bewertungCta = /(immobilienbewertung|bewertung|wertermittlung|wert ermitteln|marktwert|kostenlose bewertung)/i.test(allText);
  const verkaufen = /(verkaufen|verkauf)/i.test(allText) || links.some((l) => /verkaufen|verkauf/i.test(l.href + ' ' + l.text));
  const vermieten = /(vermieten|vermietung)/i.test(allText) || links.some((l) => /vermieten|vermietung/i.test(l.href + ' ' + l.text));
  const separateFunnels = verkaufen && vermieten;
  const pixelOrGtm = /googletagmanager\.com|GTM-[A-Z0-9]+|fbq\(|connect\.facebook\.net|Meta Pixel/i.test(allHtml);
  const activeListings = /(exposé|expose|objekt|immobilienangebote|angebote|wohnung|haus kaufen|kaltmiete|kaufpreis)/i.test(allText) || links.some((l) => /(expose|immobilien|objekt|angebote)/i.test(l.href));
  const cityMentions = [...new Set((allText.match(/\b(?:dresden|leipzig|chemnitz|berlin|hamburg|münchen|munich|köln|frankfurt|stuttgart|nürnberg|hannover)\b/gi) || []).map((c) => c.toLowerCase()))];
  const multiCity = cityMentions.length > 1;
  return { contactForm, bewertungCta, separateFunnels, pixelOrGtm, activeListings, multiCity };
}

function scoreSignals(signals, config) {
  let score = 0;
  if (signals.bewertungCta) score += config.bewertungCta;
  if (signals.separateFunnels) score += config.separateFunnels;
  if (signals.pixelOrGtm) score += config.pixelOrGtm;
  if (signals.contactForm) score += config.contactForm;
  if (signals.activeListings) score += config.activeListings;
  if (signals.multiCity) score += config.multiCity;
  score = Math.max(0, Math.min(100, score));
  const tier = score >= config.tiers.A ? 'A' : score >= config.tiers.B ? 'B' : 'C';
  return { score, tier };
}

const SEO_TITLE_RE = /\b(verkaufen|kaufen|mieten|bewertung|willkommen|startseite|home|ihre?\b|wir\b)\b/i;

function extractTitle(html = '') {
  const m = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return '';
  const raw = stripTags(m[1]);
  const first = raw.split(/\s*[|–—·]\s*|\s+-\s+/)[0].trim();
  if (first.length < 3 || first.length > 80 || SEO_TITLE_RE.test(first)) return '';
  return first;
}

function extractFirmaFromImpressum(html = '') {
  const text = stripTags(html);
  const legal = text.match(/([A-ZÄÖÜ][\wÄÖÜäöüß&.\s-]{2,60}?(?:GmbH & Co\. KG|GmbH|OHG|GbR|UG(?: \(haftungsbeschränkt\))?|e\.K\.|KG|AG))(?=[\s,.:;]|$)/);
  return legal ? legal[1].trim() : '';
}

module.exports = { stripTags, extractLinks, extractContactInfo, extractSignals, scoreSignals, domainOf, absoluteUrl, extractTitle, extractFirmaFromImpressum };
