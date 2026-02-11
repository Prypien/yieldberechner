/**
 * landing.js
 * ----------
 * Rendert die Szenario-Übersicht auf der Landing-Page.
 */
import { loadData } from "./data.js";

function buildScenarioCard(scenario, modelName) {
  const card = document.createElement("div");
  card.className = "info-card";

  const title = document.createElement("h3");
  title.textContent = scenario.name || "Szenario";

  const meta = document.createElement("p");
  const start = scenario.start_year ?? "–";
  const end = scenario.end_year ?? "–";
  meta.textContent = `${start}–${end}`;

  const model = document.createElement("p");
  model.textContent = `Modell: ${modelName || scenario.selected_vm_yield_model_id || "–"}`;

  const link = document.createElement("a");
  link.className = "text-link";
  link.href = "/scenario-input.html";
  link.textContent = "Zum Szenario";

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(model);
  card.appendChild(link);

  return card;
}

function renderScenarioCards(data) {
  const container = document.querySelector("[data-role='scenario-cards']");
  const empty = document.querySelector("[data-role='scenario-empty']");
  if (!container) return;

  const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : [];
  const models = Array.isArray(data?.vm_yield_models) ? data.vm_yield_models : [];
  container.innerHTML = "";

  if (!scenarios.length) {
    if (empty) empty.classList.remove("is-hidden");
    return;
  }

  if (empty) empty.classList.add("is-hidden");

  for (const scenario of scenarios) {
    const model = models.find((m) => m.id === scenario.selected_vm_yield_model_id);
    container.appendChild(buildScenarioCard(scenario, model?.name));
  }
}

async function init() {
  try {
    const data = await loadData();
    renderScenarioCards(data);
  } catch (error) {
    console.error(error);
  }
}

init();
