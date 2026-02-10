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
let selectedModelId = "";

let els = {
  scenarioSelect: null,
  modelSelect: null,
  scenarioChips: null,
  saveButtons: [],
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
    renderScenarioChips(data);
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

  renderScenarioChips(data);
}

function setModelOptions(data, scenarioId) {
  const select = els.modelSelect;
  if (!select) return;

  const models = Array.isArray(data?.vm_yield_models) ? data.vm_yield_models : [];
  select.innerHTML = "";

  if (models.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Keine Modelle";
    opt.disabled = true;
    opt.selected = true;
    select.appendChild(opt);
    selectedModelId = "";
    return;
  }

  for (const model of models) {
    const opt = document.createElement("option");
    opt.value = model.id;
    opt.textContent = model.name || model.id;
    select.appendChild(opt);
  }

  const scenario = (data?.scenarios || []).find((s) => s.scenario_id === scenarioId);
  const scenarioModelId = scenario?.selected_vm_yield_model_id || models[0].id;
  const wanted = selectedModelId || scenarioModelId;
  select.value = wanted;
  selectedModelId = select.value || scenarioModelId;
}

function renderScenarioChips(data) {
  const wrap = els.scenarioChips;
  if (!wrap) return;

  const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : [];
  wrap.innerHTML = "";

  if (!scenarios.length) {
    const empty = document.createElement("div");
    empty.className = "scenario-chip";
    empty.textContent = "Keine Szenarien";
    wrap.appendChild(empty);
    return;
  }

  for (const s of scenarios) {
    const chip = document.createElement("span");
    chip.className = "scenario-chip" + (s.scenario_id === selectedScenarioId ? " is-active" : "");
    chip.textContent = s.name || s.scenario_id;
    chip.title = s.scenario_id;
    wrap.appendChild(chip);
  }
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

export function getSelectedModelId() {
  if (els.modelSelect?.value) return els.modelSelect.value;
  return selectedModelId || "";
}

export function initUI({
  data,
  onSave,
  onRecompute,
  onScenarioChange,
  onModelChange
} = {}) {
  // Versuche mehrere mögliche IDs/Klassen, damit es mit deinem aktuellen HTML schon läuft.
  els.scenarioSelect = $([
    "#scenario-select",
    "[data-role='scenario-select']",
    "select[name='scenario']"
  ]);

  els.modelSelect = $([
    "#model-select",
    "[data-role='model-select']",
    "select[name='vm-model']"
  ]);

  els.scenarioChips = $([
    "[data-role='scenario-chips']"
  ]);

  els.saveButtons = Array.from(
    document.querySelectorAll("#save-data, #btn-save, [data-action='save'], [data-action='save-data']")
  );

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
  setModelOptions(data, selectedScenarioId);

  // Szenario-Wechsel -> recompute
  if (els.scenarioSelect) {
    els.scenarioSelect.addEventListener("change", () => {
      selectedScenarioId = els.scenarioSelect.value || "";
      setModelOptions(data, selectedScenarioId);
      renderScenarioChips(data);
      if (typeof onScenarioChange === "function") onScenarioChange(selectedScenarioId);
      else if (typeof onRecompute === "function") onRecompute();
    });
  }

  if (els.modelSelect) {
    els.modelSelect.addEventListener("change", () => {
      selectedModelId = els.modelSelect.value || "";
      if (typeof onModelChange === "function") onModelChange(selectedModelId);
      else if (typeof onRecompute === "function") onRecompute();
    });
  }

  // Save
  if (els.saveButtons.length && typeof onSave === "function") {
    for (const btn of els.saveButtons) {
      btn.addEventListener("click", () => onSave());
    }
  }

  // Recompute
  if (els.recomputeButton && typeof onRecompute === "function") {
    els.recomputeButton.addEventListener("click", () => onRecompute());

    // Filter Events (Trigger re-render)
    const filters = ["filter-year", "filter-family", "filter-ttnr", "filter-name", "filter-min-yield", "toggle-heatmap"];
    for (const id of filters) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => {
          // We assume onRecompute will just call renderResultsTable again
          // which now reads values directly from DOM (a bit dirty but simple for now)
          // OR better: we trigger the standard recompute flow
          if (typeof onRecompute === "function") onRecompute();
        });
        el.addEventListener("input", () => {
          if (typeof onRecompute === "function") onRecompute();
        });
      }
    }

    setStatus("UI bereit.");
  }
}
