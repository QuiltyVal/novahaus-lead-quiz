# Leipzig-Einschätzung: Datenlücken und Pflege

Stand der Prüfung: 22.07.2026.

## Nicht amtlich bestätigt

- Exakte Bestandsmieten 2025 für alle sieben gewünschten Ortsteile: Die amtliche Leipziger Analyse 2026 zeigt kleinräumige Werte nur als Kartenklassen. Die letzte offen abrufbare amtliche Tabelle mit exakten Ortsteilwerten enthält 2023.
- Ein einzelner amtlicher Wert für „Gohlis“: Die Leipziger Gebietsgliederung trennt Gohlis-Süd, Gohlis-Mitte und Gohlis-Nord.
- Kaufpreis-Medianwerte 2025 exakt für jeden gewünschten Ortsteil: Tabelle 99 des Grundstücksmarktberichts 2026 weist den einheitlich vergleichbaren Wohnungstyp auf Stadtbezirksebene aus.
- Eine allgemeingültige Maklerprovision: §§ 656c und 656d BGB regeln die Verteilung, aber keine feste Höhe.
- Ein allgemeingültiger Eigenkapital-Mindestbetrag: Finanzierung, Grundschuld, Vertrag und Maklervereinbarung sind fallabhängig. Deshalb wird nur eine Nebenkosten-Modellrechnung gezeigt.
- Baufertigstellungen 2025: Die amtliche Jahresreihe enthält zum Prüfdatum als neuesten Wert 2024.

Diese Punkte stehen zusätzlich im Datenfile unter `unconfirmed` und werden öffentlich auf der Seite ausgegeben.

## Automatisierbar

Die JSON/CSV-Ressourcen des Leipzig-Informationssystems können regelmäßig abgefragt werden:

- Einwohner mit Hauptwohnsitz;
- Grundmieten aus der Kommunalen Bürgerumfrage;
- Baugenehmigungen;
- Baufertigstellungen.

Ein Import darf nur neue Berichtsperioden übernehmen. Danach müssen Ableitungen neu berechnet und Plausibilitätschecks ausgeführt werden. Die Seite selbst liest ausschließlich `src/data/leipzig-market.json`.

## Manuell, quartalsweise

- Grundstücksmarktbericht des Gutachterausschusses: PDF-Tabellen, Segmente und Raumebenen fachlich prüfen.
- Mietspiegel und amtliche Mietpreisanalysen: Methodik, Bezugszeitpunkt und Kartenklassen prüfen; private Angebotsdaten nicht übernehmen.
- Sächsischer Grunderwerbsteuersatz, GNotKG und BGB: Gesetzes- und Tarifstand gemeinsam prüfen.

Vor einer größeren Kampagne ist zusätzlich eine außerplanmäßige Rechts- und Datenprüfung sinnvoll.
