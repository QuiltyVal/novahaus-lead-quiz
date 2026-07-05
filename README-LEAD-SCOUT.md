# NovaHaus Lead Scout

` scripts/lead-scout/` ist eine leichte Node-CLI für Discovery-Batches von Immobilienagenturen für die NovaHaus Akquise-Pipeline. Das Tool sammelt ausschließlich öffentlich erreichbare Website-Daten und sendet keine Nachrichten, E-Mails oder Formularanfragen.

## Voraussetzungen

- Node.js 18+ (wegen globalem `fetch`).
- Optional: Google Places API Key in `GOOGLE_PLACES_API_KEY`.

## Google Places API Key

1. In der Google Cloud Console ein Projekt auswählen oder anlegen.
2. Die **Places API** aktivieren.
3. Unter **APIs & Services → Credentials** einen API-Key erstellen.
4. Den Key lokal setzen:

```bash
export GOOGLE_PLACES_API_KEY="AIza..."
```

## Beispiele

Suche über Google Places nach Maklern in Dresden:

```bash
node scripts/lead-scout --city "Dresden" --limit 30 --output dresden-leads.csv
```

Ohne API-Key mit einer URL-Liste arbeiten:

```bash
node scripts/lead-scout --city "Dresden" --input urls.txt --limit 30 --output dresden-leads.csv
```

Bekannte Domains aus einem bestehenden CSV überspringen:

```bash
node scripts/lead-scout --city "Dresden" --input urls.txt --known existing.csv --output new-leads.csv
```

## Was geprüft wird

Für jede Website lädt der Scout die Startseite, `/kontakt` und `/impressum` mit 10 Sekunden Timeout. Fehler werden in der Spalte `Quellen` markiert und der Lead wird weiter verarbeitet, soweit andere Seiten erreichbar sind.

Signale:

- Kontaktformular
- Bewertung-/Wertermittlung-CTA
- getrennte Funnels für Verkaufen und Vermieten
- Meta Pixel oder Google Tag Manager
- aktive Listings/Exposés
- Multi-City-Hinweis als kleiner Malus

Die Gewichtung liegt in `scripts/lead-scout/scoring.json` und ergibt Score 0–100 plus Tier A/B/C.

## CSV für Notion importieren

1. CSV mit `--output` erzeugen.
2. In Notion die Datenbank **Akquise-Pipeline** öffnen.
3. Oben rechts **Import** oder **Merge with CSV** wählen.
4. Die Datei hochladen und die Spalten automatisch mappen lassen.
5. Prüfen, dass die Spalten exakt vorhanden sind: `Firma`, `Website`, `Kontakt-URL`, `Stadt`, `Ansprechpartner`, `Telefon`, `E-Mail`, `Score`, `Tier`, `Signale`, `Warum passt (1-2 предложения)`, `Opener`, `Kanal`, `Status`, `Consent E-Mail`, `Quellen`.

## Datenschutz und Grenzen

Der Scout nutzt nur öffentlich zugängliche Webseiten und Google-Places-Daten. Er verschickt keine E-Mails, ruft keine Telefonnummern an und übermittelt keine Kontaktformulare. `Consent E-Mail` wird deshalb immer auf `keine` gesetzt.
