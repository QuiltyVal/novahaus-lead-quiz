import Header from '@/components/Header'
import marketData from '@/data/leipzig-market.json'
import styles from './page.module.css'

export const metadata = {
  title: 'Leipzig-Einschätzung – amtliche Marktdaten | NovaHaus',
  description:
    'Mieten, Kaufpreise, Kaufnebenkosten, Bevölkerung und Bautätigkeit in Leipzig – kompakt eingeordnet und mit amtlichen Primärquellen belegt.',
  openGraph: {
    title: 'Leipzig-Einschätzung – amtliche Marktdaten',
    description:
      'Mieten, Kaufpreise, Kaufnebenkosten, Bevölkerung und Bautätigkeit in Leipzig – mit amtlichen Primärquellen.',
    type: 'website',
  },
}

const formatNumber = (value, options = {}) =>
  new Intl.NumberFormat('de-DE', options).format(value)

const formatCurrency = (value) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatMetric = (metric, options = {}) => {
  if (metric.unit === 'EUR') return formatCurrency(metric.value)
  if (metric.unit === 'EUR/m²') {
    return `${formatNumber(metric.value, {
      minimumFractionDigits: options.fixed ?? 0,
      maximumFractionDigits: options.fixed ?? 2,
    })} €/m²`
  }
  if (metric.unit === '%') {
    return `${formatNumber(metric.value, {
      minimumFractionDigits: options.fixed ?? 0,
      maximumFractionDigits: options.fixed ?? 2,
    })} %`
  }
  return `${formatNumber(metric.value)} ${metric.unit}`
}

const formatMonth = (value) => {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

const formatDate = (value) =>
  new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))

function SourceMeta({ metric, referenceLabel }) {
  return (
    <p className={styles.sourceMeta}>
      <span>{referenceLabel || metric.referenceDate || metric.referenceArea}</span>
      <span>{metric.scope}</span>
      <a href={metric.sourceUrl} target="_blank" rel="noreferrer">
        {metric.source} · veröffentlicht {formatMonth(metric.publishedAt)}
      </a>
    </p>
  )
}

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p className={styles.sectionIntro}>{children}</p>}
    </div>
  )
}

function MarketCard({ label, value, detail, metric, accent = false }) {
  return (
    <article className={`${styles.marketCard} ${accent ? styles.marketCardAccent : ''}`}>
      <p className={styles.marketLabel}>{label}</p>
      <p className={styles.marketValue}>{value}</p>
      <p className={styles.marketDetail}>{detail}</p>
      <SourceMeta metric={metric} />
    </article>
  )
}

function collectMetrics(value, result = []) {
  if (!value || typeof value !== 'object') return result
  if (
    Object.prototype.hasOwnProperty.call(value, 'value') &&
    value.source &&
    value.sourceUrl
  ) {
    result.push(value)
    return result
  }
  Object.values(value).forEach((entry) => collectMetrics(entry, result))
  return result
}

export default function LeipzigAssessmentPage() {
  const { rent, purchase, costs, market, unconfirmed, updatePlan, meta } = marketData
  const example = costs.example
  const uniqueSources = Array.from(
    new Map(
      collectMetrics(marketData).map((metric) => [
        `${metric.sourceUrl}-${metric.source}`,
        metric,
      ])
    ).values()
  )

  return (
    <>
      <Header />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="assessment-title">
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.shell}>
            <p className={styles.heroKicker}>Kostenlose Leipzig-Einschätzung</p>
            <h1 id="assessment-title">Leipzig in Zahlen. Ohne Verkaufsversprechen.</h1>
            <p className={styles.heroText}>
              Amtliche Daten zu Miete, Kauf, Nebenkosten, Bevölkerung und Wohnungsbau –
              kompakt für dein erstes Marktbild.
            </p>
            <div className={styles.statusRow}>
              <span className={styles.statusDot} aria-hidden="true" />
              <strong>Stand: {formatDate(meta.stand)}</strong>
              <span>Primärquellen geprüft</span>
            </div>
            <nav className={styles.jumpNav} aria-label="Abschnitte dieser Einschätzung">
              <a href="#miete">Miete</a>
              <a href="#kauf">Kauf</a>
              <a href="#nebenkosten">Nebenkosten</a>
              <a href="#markt">Markt</a>
              <a href="#quellen">Quellen</a>
            </nav>
          </div>
        </section>

        <section className={styles.section} id="miete">
          <div className={styles.shell}>
            <SectionHeading eyebrow="01 · Miete" title={rent.title}>
              {rent.definition}
            </SectionHeading>
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <caption>Monatliche Grundmiete im Bestand nach Leipziger Ortsteil</caption>
                <thead>
                  <tr>
                    <th scope="col">Ortsteil</th>
                    <th scope="col">Median</th>
                    <th scope="col">Bezugszeit</th>
                  </tr>
                </thead>
                <tbody>
                  {rent.areas.map(({ area, requestedArea, rent: metric }) => (
                    <tr key={area}>
                      <th scope="row">
                        {area}
                        {requestedArea && <small>amtliche Teilung von {requestedArea}</small>}
                      </th>
                      <td className={styles.emphasis}>{formatMetric(metric, { fixed: 2 })}</td>
                      <td>{metric.referenceDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.noteBox}>
              <strong>Wichtig:</strong> Eine Bestandsmiete ist kein aktueller Angebotspreis. Die
              amtliche KBU-Zahl beschreibt laufende Mietverträge und lässt keine Aussage zu einer
              bestimmten Wohnung zu.
            </div>
            <SourceMeta metric={rent.areas[0].rent} referenceLabel="Ortsteile · Bezug Oktober 2023" />
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionTint}`} id="kauf">
          <div className={styles.shell}>
            <SectionHeading eyebrow="02 · Kauf" title={purchase.title}>
              {purchase.definition}
            </SectionHeading>
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <caption>Kaufpreis-Median des amtlich vergleichbaren Stadtbezirks</caption>
                <thead>
                  <tr>
                    <th scope="col">Gesuchter Ortsteil</th>
                    <th scope="col">Amtliche Ebene</th>
                    <th scope="col">Median</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.areas.map(({ area, comparisonArea, price }) => (
                    <tr key={area}>
                      <th scope="row">{area}</th>
                      <td>{comparisonArea}</td>
                      <td className={styles.emphasis}>{formatMetric(price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.noteBox}>
              <strong>So liest du die Tabelle:</strong> Der Wert ist eine Vergleichsgröße für
              sanierte Altbauwohnungen im Wiederverkauf ohne Stellplatz – kein Preis für den
              einzelnen Ortsteil und kein verfügbares Angebot.
            </div>
            <SourceMeta
              metric={purchase.areas[0].price}
              referenceLabel={`Kauffälle ${purchase.areas[0].price.referenceDate} · Tabelle 99`}
            />
          </div>
        </section>

        <section className={styles.section} id="nebenkosten">
          <div className={styles.shell}>
            <SectionHeading eyebrow="03 · Eigenmittel" title={costs.title}>
              Ein transparentes Rechenbeispiel zeigt, welche Nebenkosten zusätzlich zum Kaufpreis
              entstehen können. Es ist keine Finanzierungs- oder Eigenkapitalempfehlung.
            </SectionHeading>

            <article className={styles.calculationCard}>
              <div className={styles.calculationHeader}>
                <div>
                  <p className={styles.calculationLabel}>Amtliche Beispielbasis</p>
                  <h3>
                    {formatMetric(purchase.exampleBasis.averageArea)} ×{' '}
                    {formatMetric(purchase.exampleBasis.cityMedian)}
                  </h3>
                </div>
                <div className={styles.priceBlock}>
                  <span>Rechnerischer Kaufpreis</span>
                  <strong>{formatMetric(example.purchasePrice)}</strong>
                </div>
              </div>

              <dl className={styles.costList}>
                <div>
                  <dt>
                    Grunderwerbsteuer Sachsen
                    <small>{formatMetric(costs.grunderwerbsteuerRate, { fixed: 1 })}</small>
                  </dt>
                  <dd>{formatMetric(example.grunderwerbsteuer)}</dd>
                </div>
                <div>
                  <dt>
                    Notar, Modellrechnung
                    <small>{example.notary.calculation}</small>
                  </dt>
                  <dd>{formatMetric(example.notary)}</dd>
                </div>
                <div>
                  <dt>
                    Grundbuch, Modellrechnung
                    <small>{example.landRegister.calculation}</small>
                  </dt>
                  <dd>{formatMetric(example.landRegister)}</dd>
                </div>
                <div>
                  <dt>
                    Makler im Beispiel
                    <small>keine feste amtliche Provisionshöhe</small>
                  </dt>
                  <dd>{formatMetric(example.broker)}</dd>
                </div>
              </dl>

              <div className={styles.totalRow}>
                <div>
                  <span>Nebenkosten im Modell</span>
                  <small>{formatMetric(example.totalAcquisitionCostRate, { fixed: 2 })} des Kaufpreises</small>
                </div>
                <strong>{formatMetric(example.totalAcquisitionCosts)}</strong>
              </div>
            </article>

            <div className={styles.warningBox}>
              <strong>Kein allgemeiner Mindestbetrag:</strong> Finanzierung, Grundschuld,
              Vertragsdetails und eine mögliche Maklervereinbarung verändern die tatsächliche
              Summe. {costs.exampleNote}
            </div>
            <div className={styles.sourceGrid}>
              <SourceMeta metric={costs.grunderwerbsteuerRate} />
              <SourceMeta metric={costs.notaryFeeUnit} referenceLabel="Tarifwert bis 200.000 EUR" />
              <p className={styles.sourceMeta}>
                <span>Maklerkosten</span>
                <span>{costs.brokerRule.scope}</span>
                <a href={costs.brokerRule.sourceUrl} target="_blank" rel="noreferrer">
                  {costs.brokerRule.source} · veröffentlicht {formatMonth(costs.brokerRule.publishedAt)}
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.marketSection}`} id="markt">
          <div className={styles.shell}>
            <SectionHeading eyebrow="04 · Markt" title="Leipzig wächst noch – deutlich langsamer">
              Einwohnerdaten stammen aus dem kommunalen Melderegister. Bauzahlen kommen vom
              Statistischen Landesamt Sachsen über das Leipzig-Informationssystem.
            </SectionHeading>
            <div className={styles.marketGrid}>
              <MarketCard
                label={`Einwohner am ${market.population2025.referenceDate}`}
                value={formatNumber(market.population2025.value)}
                detail="Hauptwohnsitz laut Melderegister"
                metric={market.population2025}
                accent
              />
              <MarketCard
                label="Veränderung zum Vorjahr"
                value={`+${formatNumber(market.populationGrowth2025.value)}`}
                detail={`+${formatMetric(market.populationGrowthRate2025, { fixed: 2 })} – schwächster positiver Zuwachs seit ${market.weakestGrowthSince.value}`}
                metric={market.populationGrowth2025}
              />
              <MarketCard
                label={`Genehmigte Wohnungen ${market.buildingPermits2025.referenceDate}`}
                value={formatNumber(market.buildingPermits2025.value)}
                detail="Summe der Quartale · vorläufig"
                metric={market.buildingPermits2025}
              />
              <MarketCard
                label={`Fertiggestellte Wohnungen ${market.buildingCompletions2024.referenceDate}`}
                value={formatNumber(market.buildingCompletions2024.value)}
                detail="Neuester amtlicher Jahreswert"
                metric={market.buildingCompletions2024}
              />
            </div>
          </div>
        </section>

        <section className={styles.section} id="praxis">
          <div className={styles.shell}>
            <SectionHeading eyebrow="05 · Einordnung" title="Was das praktisch bedeutet" />
            <div className={styles.takeawayGrid}>
              <article>
                <span>Miete</span>
                <h3>Vertragsmiete ≠ neue Angebotsmiete</h3>
                <p>Nutze die Ortsteilwerte als Bestandsbild, nicht als Erwartung für ein Inserat.</p>
              </article>
              <article>
                <span>Kauf</span>
                <h3>Vergleichswert ≠ Objektpreis</h3>
                <p>Zustand, Baujahr, Lage im Gebäude, Vermietung und Stellplatz verändern den Preis.</p>
              </article>
              <article>
                <span>Nebenkosten</span>
                <h3>Vor dem Kaufpreis mitdenken</h3>
                <p>Steuer und Transaktionskosten entstehen zusätzlich; die Finanzierung bleibt individuell.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionTint}`} id="datenluecken">
          <div className={styles.shell}>
            <SectionHeading eyebrow="06 · Transparenz" title="Was wir nicht belastbar belegen konnten">
              Wo die gewünschte Genauigkeit in den amtlichen Quellen fehlt, zeigen wir die Lücke
              statt eine Zahl zu schätzen.
            </SectionHeading>
            <ul className={styles.gapList}>
              {unconfirmed.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}</strong>
                  <p>{item.reason}</p>
                  <div>
                    {item.checkedSources.map((url, index) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        geprüfte Primärquelle {formatNumber(index + 1)}
                      </a>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.section} id="aktualisierung">
          <div className={styles.shell}>
            <SectionHeading eyebrow="07 · Pflege" title="So bleiben die Zahlen aktuell" />
            <div className={styles.updateGrid}>
              {updatePlan.map((item) => (
                <article key={item.source}>
                  <span className={item.mode === 'automatic' ? styles.autoBadge : styles.manualBadge}>
                    {item.mode === 'automatic' ? 'maschinenlesbar' : 'manuell prüfen'}
                  </span>
                  <h3>{item.source}</h3>
                  <p>{item.reason}</p>
                  <div>
                    <strong>{item.cadence}</strong>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                      Quelle öffnen
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sourcesSection}`} id="quellen">
          <div className={styles.shell}>
            <SectionHeading eyebrow="08 · Belege" title="Primärquellen und Rechenwege" />
            <ol className={styles.sourceList}>
              {uniqueSources.map((metric) => (
                <li key={`${metric.sourceUrl}-${metric.source}`}>
                  <a href={metric.sourceUrl} target="_blank" rel="noreferrer">
                    {metric.source}
                  </a>
                  <span>
                    Gebiet: {metric.scope} · veröffentlicht {formatMonth(metric.publishedAt)} ·
                    geprüft {formatDate(metric.checkedAt)}
                  </span>
                </li>
              ))}
            </ol>
            <p className={styles.disclaimer}>
              Keine Finanz-, Steuer- oder Rechtsberatung. Alle Angaben ohne Gewähr, Stand siehe
              Quellenangabe.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
