import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Datenschutzerklärung | NovaHaus Immobilien',
  description: 'Datenschutzerklärung der NovaHaus Immobilien GmbH — Informationen zur Verarbeitung Ihrer personenbezogenen Daten.',
}

export default function DatenschutzPage() {
  return (
    <>
      <Header />
      <main className="legal-page">
        <div className="container">
          <h1>Datenschutzerklärung</h1>

          {/* ── 1. Verantwortlicher ── */}
          <h2>1. Name und Kontaktdaten des Verantwortlichen</h2>
          <p>
            Diese Datenschutz-Information gilt für die Datenverarbeitung durch:
          </p>
          <p>
            <strong>Verantwortlicher:</strong>
            <br />
            Maximilian Weber
            <br />
            NovaHaus Immobilien GmbH
            <br />
            Musterstraße 12, 04109 Leipzig, Deutschland
            <br />
            E-Mail:{' '}
            <a href="mailto:kontakt@novahaus-demo.de">kontakt@novahaus-demo.de</a>
            <br />
            Telefon: +49 (0)341 000000
          </p>

          {/* ── 2. Allgemeines ── */}
          <h2>2. Allgemeines zur Datenverarbeitung</h2>

          <h3>a) Umfang der Verarbeitung personenbezogener Daten</h3>
          <p>
            Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur,
            soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer
            Inhalte und Leistungen erforderlich ist. Die Verarbeitung personenbezogener
            Daten unserer Nutzer erfolgt regelmäßig nur nach Einwilligung des Nutzers.
            Eine Ausnahme gilt in solchen Fällen, in denen eine vorherige Einholung
            einer Einwilligung aus tatsächlichen Gründen nicht möglich ist und die
            Verarbeitung der Daten durch gesetzliche Vorschriften gestattet ist.
          </p>

          <h3>b) Rechtsgrundlage</h3>
          <p>
            Soweit wir für Verarbeitungsvorgänge personenbezogener Daten eine
            Einwilligung der betroffenen Person einholen, dient Art. 6 Abs. 1 lit. a
            EU-Datenschutzgrundverordnung (DSGVO) als Rechtsgrundlage.
          </p>
          <p>
            Bei der Verarbeitung von personenbezogenen Daten, die zur Erfüllung eines
            Vertrages erforderlich ist, dient Art. 6 Abs. 1 lit. b DSGVO als
            Rechtsgrundlage. Dies gilt auch für vorvertragliche Maßnahmen.
          </p>
          <p>
            Ist die Verarbeitung zur Wahrung eines berechtigten Interesses unseres
            Unternehmens erforderlich, so dient Art. 6 Abs. 1 lit. f DSGVO als
            Rechtsgrundlage.
          </p>

          <h3>c) Datenlöschung und Speicherdauer</h3>
          <p>
            Die personenbezogenen Daten der betroffenen Person werden gelöscht oder
            gesperrt, sobald der Zweck der Speicherung entfällt. Eine Speicherung kann
            darüber hinaus erfolgen, wenn dies durch den europäischen oder nationalen
            Gesetzgeber vorgesehen wurde.
          </p>

          {/* ── 3. Website-Besuch ── */}
          <h2>3. Erhebung und Speicherung personenbezogener Daten</h2>

          <h3>a) Beim Besuch der Website</h3>
          <p>
            Beim Aufrufen unserer Website werden durch den auf Ihrem Endgerät zum
            Einsatz kommenden Browser automatisch Informationen an den Server unserer
            Website gesendet. Diese Informationen werden temporär in einem sog. Logfile
            gespeichert:
          </p>
          <ul>
            <li>IP-Adresse des anfragenden Rechners</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>Name und URL der abgerufenen Datei</li>
            <li>Website, von der aus der Zugriff erfolgt (Referrer-URL)</li>
            <li>Verwendeter Browser und ggf. das Betriebssystem</li>
          </ul>
          <p>
            Die Rechtsgrundlage für die Datenverarbeitung ist Art. 6 Abs. 1 S. 1 lit. f
            DSGVO. Die Daten werden gelöscht, sobald sie für die Erreichung des Zweckes
            ihrer Erhebung nicht mehr erforderlich sind.
          </p>

          <h3>b) Bei Nutzung unseres Quiz-Formulars</h3>
          <p>
            Wenn Sie unser Quiz zur Wohnungssuche nutzen und Ihre Kontaktdaten
            hinterlassen, verarbeiten wir folgende Daten:
          </p>
          <ul>
            <li>Vorname und Nachname</li>
            <li>E-Mail-Adresse</li>
            <li>Telefonnummer</li>
            <li>Ihre Antworten im Quiz (Wohnungswahl, Zeitrahmen, Eigenkapital, Finanzierung)</li>
          </ul>
          <p>
            Diese Daten werden ausschließlich zur Bearbeitung Ihrer Anfrage und zur
            Zusendung des gewünschten Exposés verwendet. Die Rechtsgrundlage ist
            Art. 6 Abs. 1 S. 1 lit. a DSGVO (Einwilligung) sowie Art. 6 Abs. 1 S. 1
            lit. b DSGVO (vorvertragliche Maßnahmen).
          </p>
          <p>
            Die Daten werden nach Erledigung Ihrer Anfrage gelöscht, sofern keine
            gesetzlichen Aufbewahrungspflichten entgegenstehen.
          </p>

          {/* ── 4. Weitergabe ── */}
          <h2>4. Weitergabe von Daten</h2>
          <p>
            Eine Übermittlung Ihrer persönlichen Daten an Dritte findet nur statt, wenn:
          </p>
          <ul>
            <li>
              Sie Ihre nach Art. 6 Abs. 1 S. 1 lit. a DSGVO ausdrückliche Einwilligung
              erteilt haben,
            </li>
            <li>
              die Weitergabe nach Art. 6 Abs. 1 S. 1 lit. c DSGVO zur Erfüllung einer
              rechtlichen Verpflichtung erforderlich ist, oder
            </li>
            <li>
              dies nach Art. 6 Abs. 1 S. 1 lit. b DSGVO für die Abwicklung von
              Vertragsverhältnissen mit Ihnen erforderlich ist.
            </li>
          </ul>

          {/* ── 5. Cookies ── */}
          <h2>5. Cookies</h2>
          <p>
            Wir setzen auf unserer Seite Cookies ein. Hierbei handelt es sich um kleine
            Dateien, die Ihr Browser automatisch erstellt und die auf Ihrem Endgerät
            gespeichert werden. Cookies richten auf Ihrem Endgerät keinen Schaden an.
          </p>
          <p>
            Wir unterscheiden zwischen essenziellen und optionalen Cookies:
          </p>
          <ul>
            <li>
              <strong>Essenzielle Cookies:</strong> Notwendig für die Grundfunktionen der
              Website (z. B. Speicherung Ihrer Cookie-Einstellungen). Diese werden ohne
              Ihre Einwilligung gesetzt.
            </li>
            <li>
              <strong>Marketing- &amp; Analyse-Cookies:</strong> Werden nur gesetzt, wenn
              Sie im Cookie-Banner „Alle akzeptieren" wählen. Dazu gehören Cookies von
              Meta (Facebook Pixel).
            </li>
          </ul>
          <p>
            Sie können Ihre Cookie-Einstellungen jederzeit über Ihren Browser ändern
            oder alle Cookies löschen.
          </p>

          {/* ── 6. Meta Pixel & CAPI ── */}
          <h2>6. Meta Pixel &amp; Conversions API</h2>
          <p>
            Wir verwenden auf dieser Website das Meta Pixel (ehemals Facebook Pixel)
            sowie die Meta Conversions API. Diese Dienste werden von Meta Platforms
            Ireland Limited, 4 Grand Canal Square, Grand Canal Harbour, Dublin 2,
            Irland betrieben.
          </p>
          <p>
            <strong>Wichtig:</strong> Das Meta Pixel und die Conversions API werden
            erst aktiviert, nachdem Sie im Cookie-Banner Ihre Einwilligung erteilt
            haben („Alle akzeptieren"). Ohne Ihre Einwilligung werden keine Daten an
            Meta übermittelt.
          </p>
          <p>
            Bei Einwilligung werden folgende Daten verarbeitet:
          </p>
          <ul>
            <li>Seitenaufrufe und Interaktionen (z. B. Quiz-Start, Lead-Formular)</li>
            <li>Technische Informationen (Browser, Betriebssystem, IP-Adresse)</li>
            <li>
              Bei Formularabsendung: gehashte (SHA-256) Kontaktdaten (E-Mail, Telefon,
              Name) zur Zuordnung
            </li>
          </ul>
          <p>
            Die Rechtsgrundlage ist Art. 6 Abs. 1 S. 1 lit. a DSGVO (Einwilligung).
            Sie können Ihre Einwilligung jederzeit widerrufen, indem Sie Ihre Cookies
            löschen oder den Browser-Cache leeren.
          </p>
          <p>
            Weitere Informationen zum Datenschutz bei Meta finden Sie unter:{' '}
            <a
              href="https://www.facebook.com/about/privacy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              facebook.com/about/privacy
            </a>
          </p>

          {/* ── 7. Betroffenenrechte ── */}
          <h2>7. Ihre Rechte</h2>
          <p>
            Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie betreffenden
            personenbezogenen Daten:
          </p>
          <ul>
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Recht auf Widerspruch (Art. 21 DSGVO)</li>
            <li>Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO)</li>
            <li>Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p>
            Die zuständige Aufsichtsbehörde ist der Sächsische Datenschutzbeauftragte:{' '}
            <a
              href="https://www.saechsdsb.de/"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.saechsdsb.de
            </a>
          </p>

          {/* ── 8. Aktualität ── */}
          <h2>8. Aktualität dieser Datenschutzerklärung</h2>
          <p>
            Diese Datenschutzerklärung ist aktuell gültig und hat den Stand Februar 2026.
            Durch die Weiterentwicklung unserer Website kann es notwendig werden, diese
            Datenschutzerklärung zu ändern. Die jeweils aktuelle Fassung kann jederzeit
            auf dieser Seite abgerufen werden.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
