/* Objekt-Pilot: the self-serve track.
 *
 * Deliberately separate from /system. That page sells the platform and ends in
 * a first call. This one sells exactly one product at a stated price and ends
 * in a written fit check, so the path from ad to enquiry needs no phone call.
 */

// Single place to change the price.
const PILOT_PRICE = '990 € netto'
const PILOT_DURATION = '30 Tage'

const included = [
  ['Reel-Serie zu einem Objekt', 'Aus Ihren vorhandenen Objektfotos entsteht eine Serie kurzer Videos — ohne Dreh, ohne Fotograf, ohne Termin vor Ort.'],
  ['Veröffentlichung auf Ihrem Kanal', 'Geplant und veröffentlicht auf Ihrem Instagram-Account. Jede Veröffentlichung wird vorher von Ihnen freigegeben.'],
  ['Objektbezogene Landingpage', 'Ein eigener Einstieg für dieses Objekt statt eines allgemeinen Kontaktformulars.'],
  ['Interessenten-Quiz', 'Budget, Eigenkapital, Finanzierung und Zeitrahmen werden vor dem ersten Gespräch erfragt.'],
  ['Qualifizierung', 'Jede Anfrage wird als hot, warm, cold oder not qualified eingeordnet — nach Regeln, die wir gemeinsam festlegen.'],
  ['Geprüfter Antwortentwurf', 'Das System bereitet die passende Antwort vor. Ein Mensch prüft sie und versendet sie. Nie automatisch.'],
  ['Benachrichtigung', 'Neue qualifizierte Anfragen erreichen Sie sofort per E-Mail oder Telegram.'],
  ['Objekt-Attribution', 'Sie sehen, welches Objekt und welcher Beitrag die Anfrage ausgelöst hat.'],
  ['Abschlussbericht', 'Reichweite, Klicks, begonnene und abgeschlossene Quiz, qualifizierte Anfragen, Reaktionszeit.'],
]

const required = [
  ['Objektmaterial', 'Fotos und Eckdaten eines Objekts, das aktuell vermarktet wird — plus die Bestätigung, dass die Bildrechte eine Bearbeitung erlauben.'],
  ['Eine freigebende Person', 'Jemand, der Inhalte vor der Veröffentlichung freigibt. Ein Mensch, nicht ein Gremium.'],
  ['Eine bearbeitende Person', 'Jemand, der eingehende Anfragen tatsächlich beantwortet. Ohne diese Person kann der Pilot nichts beweisen.'],
  ['Freigabe für den Bericht', 'Die Erlaubnis, anonymisierte Kennzahlen als Referenz zu verwenden.'],
]

const notPromised = [
  'Eine bestimmte Anzahl an Anfragen.',
  'Den Verkauf des Objekts.',
  'Automatisch versendete KI-E-Mails ohne menschliche Freigabe.',
  'Einen Wechsel oder Ersatz Ihres CRM.',
]

const steps = [
  ['01', 'Pilot-Check', 'Fünf kurze Fragen zu Objektbestand, Anfragen und Zuständigkeiten. Zwei Minuten, schriftlich.'],
  ['02', 'Umfang und Angebot', 'Sie erhalten den konkreten Pilot-Umfang für Ihr Objekt schriftlich — kein Verkaufstermin nötig.'],
  ['03', 'Material und Freigaben', 'Sie liefern Objektfotos und benennen die freigebende Person.'],
  ['04', 'Produktion und Freigabe', 'Wir produzieren, Sie geben frei. Erst danach wird veröffentlicht.'],
  ['05', 'Auswertung', 'Nach 30 Tagen erhalten Sie den vollständigen Bericht mit allen Kennzahlen.'],
]

export const metadata = {
  title: 'Objekt-Pilot — ein Objekt, ein messbarer Anfrageweg | NovaHaus',
  description:
    'Aus vorhandenen Objektfotos entsteht in 30 Tagen ein messbarer Weg vom Reel bis zur qualifizierten Anfrage. Fester Preis, kein CRM-Wechsel, kein Verkaufstermin.',
}

export default function PilotPage() {
  return (
    <main className="system-page">
      <section className="system-hero">
        <video
          className="system-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/background.png"
          aria-hidden="true"
        >
          <source src="/media/novahaus-hero.mp4" type="video/mp4" />
        </video>
        <div className="system-hero-overlay" />

        <div className="system-nav container">
          <a href="/pilot" className="system-brand">
            NovaHaus Objekt-Pilot
          </a>
          <div className="system-nav-links">
            <a href="/demo">Live Demo</a>
            <a href="#leistungen">Leistungen</a>
            <a href="#preis">Preis</a>
          </div>
        </div>

        <div className="container system-hero-inner">
          <div className="system-hero-copy">
            <p className="system-eyebrow">Für Immobilienunternehmen in Leipzig und Mitteldeutschland</p>
            <h1>Ein Objekt. Ein messbarer Weg bis zur qualifizierten Anfrage.</h1>
            <p>
              Aus Ihren vorhandenen Objektfotos entsteht eine Reel-Serie, ein
              objektbezogener Quiz und ein geprüfter Antwortentwurf. Sie sehen,
              welcher Beitrag welche Anfrage ausgelöst hat — und was der
              Interessent schon vor dem ersten Gespräch mitbringt.
            </p>
            <div className="system-hero-actions">
              <a href="/pilot-check" className="system-btn system-btn-primary">
                Pilot prüfen
              </a>
              <a href="/demo" className="system-btn system-btn-secondary">
                Demo ansehen
              </a>
            </div>
          </div>

          <div className="system-hero-panel" aria-label="Eckdaten des Pilotprojekts">
            <div>
              <span>Laufzeit</span>
              <strong>{PILOT_DURATION}</strong>
              <p>Ein Objekt, ein vollständiger Durchlauf.</p>
            </div>
            <div>
              <span>Preis</span>
              <strong>{PILOT_PRICE}</strong>
              <p>Fester Betrag. Keine laufende Bindung.</p>
            </div>
            <div>
              <span>Aufwand für Sie</span>
              <strong>Fotos und Freigabe</strong>
              <p>Kein Dreh, kein Termin vor Ort, kein CRM-Wechsel.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="system-section">
        <div className="container system-split">
          <div>
            <p className="system-kicker">Ihr CRM bleibt</p>
            <h2>Wir ersetzen nichts. Wir schaffen den Einstieg davor.</h2>
          </div>
          <div className="system-problem-list">
            <p>
              Ihr CRM verwaltet Anfragen, die bereits da sind. Der Objekt-Pilot
              erzeugt neue Einstiege aus Ihrem Objektmaterial und qualifiziert
              sie, bevor jemand zum Hörer greift.
            </p>
            <p>
              Kein Systemwechsel, keine Migration, keine neue Software für Ihr
              Team. Die fertigen Anfragen kommen dorthin, wo Sie ohnehin
              arbeiten.
            </p>
            <p>
              Reichweite allein ist noch kein Lead-Prozess: Ohne
              objektbezogenen Einstieg bleibt unklar, welcher Beitrag welche
              Anfrage ausgelöst hat.
            </p>
          </div>
        </div>
      </section>

      <section className="system-section system-section-muted" id="leistungen">
        <div className="container">
          <div className="system-section-head">
            <p className="system-kicker">Was enthalten ist</p>
            <h2>Der vollständige Weg vom Objektfoto bis zur beantworteten Anfrage.</h2>
          </div>
          <div className="system-grid">
            {included.map(([title, text]) => (
              <article className="system-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="system-section">
        <div className="container">
          <div className="system-section-head">
            <p className="system-kicker">Ablauf</p>
            <h2>Von der ersten Frage bis zum Bericht — vollständig schriftlich.</h2>
          </div>
          <div className="system-workflow">
            {steps.map(([number, title, text]) => (
              <article className="system-step" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="system-section system-section-muted">
        <div className="container system-split">
          <div>
            <p className="system-kicker">Was wir von Ihnen brauchen</p>
            <h2>Vier Dinge. Mehr nicht.</h2>
          </div>
          <div className="system-grid">
            {required.map(([title, text]) => (
              <article className="system-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="system-section">
        <div className="container system-split">
          <div>
            <p className="system-kicker">Was wir nicht versprechen</p>
            <h2>Damit von Anfang an klar ist, was der Pilot leistet — und was nicht.</h2>
          </div>
          <div className="system-problem-list">
            {notPromised.map((text) => (
              <p key={text}>{text}</p>
            ))}
            <p>
              Versprochen wird ein definierter Leistungsumfang, feste Termine
              und nachvollziehbare Zahlen im Abschlussbericht.
            </p>
          </div>
        </div>
      </section>

      <section className="system-section system-demo-band">
        <div className="container system-demo-inner">
          <div>
            <p className="system-kicker">Live Demo</p>
            <h2>Sehen Sie den vollständigen Ablauf, bevor Sie irgendetwas entscheiden.</h2>
            <p>
              Die Demo läuft mit Testdaten: ein Objekt, ein Quiz, eine stabile
              Lead-ID, die Qualifizierung und der vorbereitete Antwortentwurf.
              Keine echten Kundendaten.
            </p>
          </div>
          <div className="system-demo-actions">
            <a href="/demo" className="system-btn system-btn-primary">
              Demo-Szenarien ansehen
            </a>
            <a href="/quiz?demo=hot" className="system-btn system-btn-light">
              Hot-Lead durchspielen
            </a>
          </div>
        </div>
      </section>

      <section className="system-section" id="preis">
        <div className="container">
          <div className="system-section-head">
            <p className="system-kicker">Preis</p>
            <h2>Ein Objekt, {PILOT_DURATION}, {PILOT_PRICE}.</h2>
          </div>
          <div className="system-package-grid">
            <article className="system-package">
              <span>Einmalig</span>
              <h3>Objekt-Pilot</h3>
              <p>
                Reel-Serie, objektbezogene Landingpage, Quiz, Qualifizierung,
                geprüfter Antwortentwurf, Benachrichtigung, Attribution und
                Abschlussbericht für ein Objekt.
              </p>
            </article>
            <article className="system-package">
              <span>Nicht enthalten</span>
              <h3>Werbebudget</h3>
              <p>
                Wenn zusätzlich Anzeigen laufen sollen, läuft das Budget über Ihr
                eigenes Werbekonto. Wir geben kein Geld für Sie aus und rechnen
                keine fremden Ausgaben ab.
              </p>
            </article>
            <article className="system-package">
              <span>Danach</span>
              <h3>Laufender Betrieb</h3>
              <p>
                Nach dem Pilot ist eine monatliche Betreuung mit weiteren
                Objekten möglich. Preis nach Objektzahl — erst nach dem Pilot,
                nicht davor.
              </p>
            </article>
          </div>

          <div className="system-hero-actions" style={{ marginTop: '2.5rem' }}>
            <a href="/pilot-check" className="system-btn system-btn-primary">
              Pilot prüfen — fünf Fragen, schriftlich
            </a>
          </div>

          <p className="system-kicker" style={{ marginTop: '1.5rem' }}>
            Kein Verkaufstermin erforderlich. Einrichtung und Rückfragen laufen
            schriftlich. Antwort innerhalb eines Werktages.
          </p>
        </div>
      </section>
    </main>
  )
}
