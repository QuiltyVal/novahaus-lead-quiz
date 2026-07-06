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

Intent-Signale für bestehende Firmen aus der Akquise-Pipeline sammeln:

```bash
node scripts/lead-scout signals --input akquise-pipeline.csv --output call-signals.csv
```

Der `signals`-Input kann eine CSV/TSV mit den Spalten `Firma` und `Website` sein. Einfache Zeilen wie `Firma;https://firma.de` oder nur `https://firma.de` funktionieren ebenfalls. Standardmäßig schreibt der Modus Response-Caches und Listing-Snapshots nach `scripts/lead-scout/.cache/`; alte Snapshots bleiben erhalten, damit ein wöchentlicher Lauf neue Listings gegenüber dem letzten Lauf markieren kann. Mit `--refresh` wird der Response-Cache ignoriert, die Snapshot-Historie bleibt bestehen.

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

## Intent-Signale für Anrufpriorität

Der Modus `signals` erzeugt eine CSV mit den Notion-Spalten `Firma`, `Website`, `Signal Listings`, `Signal Instagram`, `Signal Jobs`, `Anruf-Priorität` und `Warum jetzt anrufen`.

Geprüft wird best effort:

- Listings: Nur Seiten auf der eigenen Firmendomain werden geprüft, z. B. `Angebote`, `Immobilien`, `Objekte` oder `Kaufen`. ImmoScout und andere externe Portale werden nicht als Listing-Quelle verwendet. Pro Lauf wird ein Snapshot gespeichert; ab dem zweiten Lauf werden neue Listing-IDs oder ein gestiegener Objektcount als `NEU seit letztem Lauf` markiert.
- Instagram: Der Scout sucht nur öffentliche Instagram-Links auf der Website. Wenn ohne Login keine letzte Post-Datumserkennung möglich ist, wird die URL mit `manuell prüfen` ausgegeben.
- Jobs: Der Scout prüft öffentliche `Karriere`-/`Jobs`-Seiten auf Marketing-Rollen und gibt immer eine Indeed-Such-URL zur manuellen Prüfung aus.

Die Anrufpriorität nutzt `scripts/lead-scout/scoring.json`: neue Listings geben den stärksten Boost, ein Instagram-Profil mit letztem erkanntem Post älter als 60 Tage und eine Marketing-Vakanz erhöhen ebenfalls die Priorität.

## CSV für Notion importieren

1. CSV mit `--output` erzeugen.
2. In Notion die Datenbank **Akquise-Pipeline** öffnen.
3. Oben rechts **Import** oder **Merge with CSV** wählen.
4. Die Datei hochladen und die Spalten automatisch mappen lassen.
5. Prüfen, dass die Spalten exakt vorhanden sind: `Firma`, `Website`, `Kontakt-URL`, `Stadt`, `Ansprechpartner`, `Telefon`, `E-Mail`, `Score`, `Tier`, `Signale`, `Warum passt (1-2 предложения)`, `Opener`, `Kanal`, `Status`, `Consent E-Mail`, `Quellen`.

## Datenschutz und Grenzen

Der Scout nutzt nur öffentlich zugängliche Webseiten und Google-Places-Daten. Er verschickt keine E-Mails, ruft keine Telefonnummern an und übermittelt keine Kontaktformulare. `Consent E-Mail` wird deshalb immer auf `keine` gesetzt.

Der `signals`-Modus nutzt keine Logins und keine bezahlten APIs. Instagram, LinkedIn und Portale werden nicht unter Account-Kontext gescraped. Pro Domain wird höchstens ein Request pro Sekunde gestartet, Requests haben Timeouts, Responses werden lokal gecached und `robots.txt` wird respektiert. Fehler einzelner Signale führen zu `unbekannt` statt zum Abbruch des Laufs.
