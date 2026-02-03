import { loadData, saveData } from "./data.js";
import { computeResults } from "./calc.js";
import { initUI, getSelectedScenarioId, getSelectedModelId, setStatus } from "./ui.js";
import { renderResultsTable } from "./output.js";

let data = null;

function getScenarioIdOrDefault() {
  const selected = getSelectedScenarioId?.();
  if (selected) return selected;
  return data?.scenarios?.[0]?.scenario_id || "";
}

function recomputeAndRender() {
  const scenarioId = getScenarioIdOrDefault();
  const table = document.getElementById("results-table");
  if (!table) {
    setStatus?.("Keine Ergebnis-Tabelle vorhanden.");
    return;
  }

  const modelId = getSelectedModelId?.();
  const results = computeResults(data, scenarioId, modelId);

  renderResultsTable(results, table);
  setStatus?.(`${results.length} Zeilen berechnet.`);
}

async function handleSave() {
  try {
    await saveData(data);
    setStatus?.("Gespeichert.");
  } catch (e) {
    console.error(e);
    alert(`Speichern fehlgeschlagen: ${e.message || e}`);
  }
}

async function init() {
  try {
    data = await loadData();
  } catch (e) {
    console.error(e);
    alert(`Laden fehlgeschlagen: ${e.message || e}`);
    return;
  }

  // UI verdrahten: UI darf data mutieren, app.js bleibt “dumm”
  initUI?.({
    data,
    onSave: handleSave,
    onRecompute: recomputeAndRender,
    onScenarioChange: recomputeAndRender,
    onModelChange: recomputeAndRender
  });

  // Erste Berechnung
  recomputeAndRender();
}

init();
