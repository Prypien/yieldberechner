/**
 * app.js
 * ------
 * Einstiegspunkt: lädt Daten, initialisiert UI/Editor und triggert Berechnung.
 */
import { loadData, saveData } from "./data.js";
import { computeResults } from "./calc.js";
import { initUI, getSelectedScenarioId, getSelectedModelId } from "./ui.js";
import { renderResultsTable } from "./output.js";
import { initScenarioEditor, initTechnologyEditor } from "./editor.js";

let data = null;

function updateStatus(text) {
  const el = document.querySelector("#status") || document.querySelector("[data-role='status']");
  if (el) {
    el.textContent = text || "";
  } else if (text) {
    console.log("[status]", text);
  }
}

function getScenarioIdOrDefault() {
  const selected = getSelectedScenarioId?.();
  if (selected) return selected;
  return data?.scenarios?.[0]?.scenario_id || "";
}

function recomputeAndRender() {
  const scenarioId = getScenarioIdOrDefault();
  const table = document.getElementById("results-table");
  if (!table) {
    updateStatus("Keine Ergebnis-Tabelle vorhanden.");
    return;
  }

  const modelId = getSelectedModelId?.();
  const results = computeResults(data, scenarioId, modelId);

  renderResultsTable(results, table);
  updateStatus(`${results.length} Zeilen berechnet.`);
}

async function handleSave() {
  try {
    await saveData(data);
    updateStatus("Gespeichert.");
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

  const hasResultsTable = Boolean(document.getElementById("results-table"));
  const hasScenarioEditor = Boolean(document.querySelector("[data-role='family-param-table']"));
  const hasTechnologyEditor = Boolean(document.querySelector("[data-role='technology-table']"));

  if (hasResultsTable) {
    // Output Page
    initUI?.({
      data,
      onSave: handleSave,
      onRecompute: recomputeAndRender,
      onScenarioChange: recomputeAndRender,
      onModelChange: recomputeAndRender
    });

    recomputeAndRender();
  }

  if (hasScenarioEditor) {
    initScenarioEditor?.({ data, onSave: handleSave });
  }

  if (hasTechnologyEditor) {
    initTechnologyEditor?.({ data, onSave: handleSave });
  }
}

init();
