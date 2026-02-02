/**
 * ui.js
 * -----
 * Kümmert sich nur um UI-Wiring:
 * - Szenario-Auswahl befüllen + change events
 * - Save / Recompute Buttons verbinden
 * - Statusausgabe
 *
 * Diese Datei enthält KEINE Berechnung und KEIN Fetch.
 * Sie ist bewusst tolerant: Wenn ein Element in index.html nicht existiert,
 * wird es einfach übersprungen (damit wir HTML später umbauen können).
 */

let selectedScenarioId = "";

let els = {
  scenarioSelect: null,
  saveButton: null,
  recomputeButton: null,
  status: null
};

function $(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function setScenarioOptions(data) {
  const select = els.scenarioSelect;
  if (!select) return;

  const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : [];
  select.innerHTML = "";

  if (scenarios.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Keine Szenarien";
    opt.disabled = true;
    opt.selected = true;
    select.appendChild(opt);
    selectedScenarioId = "";
    return;
  }

  for (const s of scenarios) {
    const opt = document.createElement("option");
    opt.value = s.scenario_id;
    opt.textContent = s.name || s.scenario_id;
    select.appendChild(opt);
  }

  // Auswahl setzen: vorherige Auswahl behalten, sonst erstes Szenario
  const wanted = selectedScenarioId || scenarios[0].scenario_id;
  select.value = wanted;
  selectedScenarioId = select.value || scenarios[0].scenario_id;
}

export function setStatus(text) {
  if (els.status) {
    els.status.textContent = text || "";
  } else {
    // fallback: still not noisy, but helps during dev
    if (text) console.log("[status]", text);
  }
}

export function getSelectedScenarioId() {
  if (els.scenarioSelect?.value) return els.scenarioSelect.value;
  return selectedScenarioId || "";
}

export function initUI({ data, onSave, onRecompute, onScenarioChange } = {}) {
  // Versuche mehrere mögliche IDs/Klassen, damit es mit deinem aktuellen HTML schon läuft.
  els.scenarioSelect = $([
    "#scenario-select",
    "[data-role='scenario-select']",
    "select[name='scenario']"
  ]);

  els.saveButton = $([
    "#save-data",
    "#btn-save",
    "[data-action='save']"
  ]);

  els.recomputeButton = $([
    "#run-calc",
    "#btn-recompute",
    "[data-action='recompute']"
  ]);

  els.status = $([
    "#status",
    "#calc-hint",
    "#import-status",
    "[data-role='status']"
  ]);

  // Dropdown befüllen
  setScenarioOptions(data);

  // Szenario-Wechsel -> recompute
  if (els.scenarioSelect) {
    els.scenarioSelect.addEventListener("change", () => {
      selectedScenarioId = els.scenarioSelect.value || "";
      if (typeof onScenarioChange === "function") onScenarioChange(selectedScenarioId);
      else if (typeof onRecompute === "function") onRecompute();
    });
  }

  // Save
  if (els.saveButton && typeof onSave === "function") {
    els.saveButton.addEventListener("click", () => onSave());
  }

  // Recompute
  if (els.recomputeButton && typeof onRecompute === "function") {
    els.recomputeButton.addEventListener("click", () => onRecompute());
  }

  setStatus("UI bereit.");
}
