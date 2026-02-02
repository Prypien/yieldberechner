# Yield Berechner (Frontend-only Calculation + Minimal Backend Persistenz)

Dieses Projekt ist ein schlanker Yield-Berechner für Halbleiter-/Fertigungs-Yields, bei dem:

- **alle Berechnungen im Browser (Frontend)** laufen
- ein **sehr kleines Backend (Node/Express)** nur dafür da ist, Daten **persistiert** in `user_data.json` zu speichern und wieder zu laden
- es eine `base_data.json` als **Seed / Default-Datenbasis** gibt

Das Ziel ist bewusst minimal:
- Eingaben pflegen (Szenarien, Familienparameter, Station-Yields, Chips, Technologien, VM-Modelle)
- Berechnung ausführen
- Ergebnis-Tabelle anzeigen

Kein unnötiges Import/Export-Gewicht, keine XLSX/CSV Parser, keine Multi-Tab UI Monster – das Projekt soll **klein, verständlich, erweiterbar** bleiben.

---

## 1) Ziel & Funktionsumfang

### ✅ Ziel
Eine Tabelle mit berechneten Yields pro:
- **Szenario**
- **Chip Type**
- **Kalenderjahr**

Ausgabe je Zeile:
- FAB, EPI, VM, SAW, KGD, OSAT
- Total Yield (Produkt aller Stufen)

### ✅ Was der Nutzer tun kann
- Szenario wählen
- Berechnung starten
- Daten speichern (persistieren)
---

## 2) Projektstruktur

```text
yieldberechner/
│
├─ package.json
├─ server.js
│
├─ data/
│   └─ user_data.json              # persistente User-Daten (wird automatisch erzeugt)
│
└─ public/
   ├─ index.html
   ├─ styles.css
   ├─ base_data.json               # Seed/Default Daten (im Repo versioniert)
   └─ js/
      ├─ app.js                    # Orchestrierung (init/load/calc/render/save)
      ├─ data.js                   # Laden/Speichern (API + fallback base)
      ├─ calc.js                   # Rechenlogik (pure functions)
      ├─ ui.js                     # UI wiring (Buttons, select, status)
      └─ output.js                 # Rendering Ergebnis-Tabelle
