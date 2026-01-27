# Yieldberechner

Dieses Tool ist eine vollständig lokale Web-App zur deterministischen Berechnung von Yield-Ketten (FAB bis EPI_SHIP) auf Basis von manuell gepflegten Eingaben. Szenarien, Werke, Families, Typen und Technologien werden direkt im UI angelegt, berechnet und tabellarisch ausgewertet – ohne Backend oder externe Services.

## Was das Tool konkret macht
- Erfasst Szenarien, Werke, Families, Typen und Technologien über Eingabemasken.
- Validiert die Tabellenstruktur (z. B. Szenarien, Werke, Families, Technologien, Yield-Modelle) in Echtzeit.
- Berechnet Yield-Ketten je Jahr, Werk und Chip-Typ inklusive Technologie-Overlays.
- Zeigt Ergebnisse tabellarisch und als Detailansicht mit SQL-Formel-Vorschau.

## Anforderungen an die Datenbasis
Die interne Datenbasis verwendet Tabellen mit den folgenden Namen (intern verwaltet durch die Eingabemasken):
`scenarios`, `scenario_plants`, `plants`, `plant_base_yields`, `families`, `chip_types`, `technologies`, `technology_years`, `chip_type_tech`, `yield_models`.

## Nutzung
1. `index.html` im Browser öffnen (lokal, z. B. per einfachem Webserver).
2. Szenario, Werk, Family, Typ und Technologien im Tab **Setup** anlegen.
3. Szenario, Start-/Endjahr, Yield-Modell und Werke auswählen.
4. Ergebnisse im Tab **Ergebnisse** prüfen und filtern.
