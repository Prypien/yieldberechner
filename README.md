# Yieldberechner

Dieses Tool ist eine vollständig lokale Web-App zur deterministischen Berechnung von Yield-Ketten (FAB bis EPI_SHIP) auf Basis einer Excel- oder CSV-Datenbasis. Es lädt die Tabellen aus `yield_data_basis.xlsx` bzw. `yield_data_basis.csv`, berechnet pro Szenario/Jahr/TTNR die Station-Yields und stellt Ergebnisse, Detail-Drilldowns (inkl. SQL-Formel-Preview) sowie Filter und Sortierung im Browser bereit – ohne Backend oder externe Services.

## Was das Tool konkret macht
- Lädt die Standard-Datenbasis automatisch aus dem Repo oder akzeptiert eine manuell ausgewählte XLSX/CSV-Datei.
- Validiert die Tabellenstruktur (z. B. Szenarien, Werke, Families, Technologien, Yield-Modelle).
- Berechnet Yield-Ketten je Jahr, Werk und Chip-Typ inklusive Technologie-Overlays.
- Zeigt Ergebnisse tabellarisch und als Detailansicht mit SQL-Formel-Vorschau.

## Anforderungen an die Datenbasis
Die Datenbasis muss Tabellen mit den folgenden Namen enthalten (XLSX-Sheets oder CSV-Spalte `table`):
`scenarios`, `scenario_plants`, `plants`, `plant_base_yields`, `families`, `chip_types`, `technologies`, `technology_years`, `chip_type_tech`, `yield_models`.

## Nutzung
1. `index.html` im Browser öffnen (lokal, z. B. per einfachem Webserver).
2. Optional eine eigene XLSX/CSV-Datei hochladen.
3. Szenario, Start-/Endjahr, Yield-Modell und Werke auswählen.
4. Ergebnisse im Tab **Ergebnisse** prüfen und filtern.
