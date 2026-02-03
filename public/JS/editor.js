/**
 * editor.js
 * ---------
 * UI-Logik für Szenario-Inputs und Technologien.
 * - Rendert Tabellen aus dem geladenen data-Objekt
 * - Erlaubt Hinzufügen/Entfernen/Bearbeiten
 * - Mutiert data in-place (Speichern übernimmt app.js)
 */

const STATION_FIELDS = ["FAB", "EPI", "SAW", "KGD", "OSAT"];

function createStatusReporter(root = document) {
  const el = root.querySelector("#status") || root.querySelector("[data-role='status']");
  return (text) => {
    if (el) {
      el.textContent = text || "";
    } else if (text) {
      console.log("[status]", text);
    }
  };
}

function ensureArray(obj, key) {
  if (!Array.isArray(obj[key])) obj[key] = [];
  return obj[key];
}

function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function createEmptyRow(tbody, colSpan, message) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = colSpan;
  td.style.textAlign = "center";
  td.textContent = message;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function createInputCell({
  type = "text",
  value = "",
  placeholder = "",
  step,
  onInput,
  onCommit
}) {
  const td = document.createElement("td");
  const input = document.createElement("input");
  input.type = type;
  input.value = value ?? "";
  if (placeholder) input.placeholder = placeholder;
  if (step) input.step = String(step);
  if (typeof onInput === "function") {
    input.addEventListener("input", () => onInput(input.value, input));
  }
  if (typeof onCommit === "function") {
    input.addEventListener("change", () => onCommit(input.value, input));
  }
  td.appendChild(input);
  return { td, input };
}

function createSelectCell({ options = [], value = "", onChange }) {
  const td = document.createElement("td");
  const select = document.createElement("select");
  select.className = "control-select";

  for (const opt of options) {
    const o = document.createElement("option");
    o.value = String(opt.value);
    o.textContent = opt.label;
    select.appendChild(o);
  }

  select.value = value ?? "";
  if (typeof onChange === "function") {
    select.addEventListener("change", () => onChange(select.value, select));
  }
  td.appendChild(select);
  return { td, select };
}

function createRemoveButton(onRemove) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-secondary";
  btn.textContent = "Entfernen";
  btn.addEventListener("click", () => onRemove());
  return btn;
}

function renderScenarioOptions(select, scenarios, selectedId) {
  if (!select) return;
  select.innerHTML = "";

  if (!scenarios.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Keine Szenarien";
    opt.disabled = true;
    opt.selected = true;
    select.appendChild(opt);
    return;
  }

  for (const s of scenarios) {
    const opt = document.createElement("option");
    opt.value = s.scenario_id;
    opt.textContent = s.name || s.scenario_id;
    select.appendChild(opt);
  }

  const next = selectedId || scenarios[0].scenario_id;
  select.value = next;
}

function renderModelOptions(select, models, selectedId) {
  if (!select) return;
  select.innerHTML = "";

  if (!models.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Keine Modelle";
    opt.disabled = true;
    opt.selected = true;
    select.appendChild(opt);
    return;
  }

  for (const m of models) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name || m.id;
    select.appendChild(opt);
  }

  select.value = selectedId || models[0].id;
}

function ensureFamilyExists(data, familyId) {
  if (!familyId) return;
  const families = ensureArray(data, "families");
  if (families.some((f) => f.family_id === familyId)) return;
  families.push({
    family_id: familyId,
    name: familyId,
    description: ""
  });
}

function findDuplicate(list, item, predicate) {
  return list.some((row) => row !== item && predicate(row));
}

function generateUniqueId(prefix, existingIds) {
  let idx = 1;
  let candidate = `${prefix}_${idx}`;
  while (existingIds.has(candidate)) {
    idx += 1;
    candidate = `${prefix}_${idx}`;
  }
  return candidate;
}

export function initScenarioEditor({ data, onSave } = {}) {
  const scenarios = ensureArray(data, "scenarios");
  const familyParams = ensureArray(data, "scenario_family_params");
  const scenarioYields = ensureArray(data, "scenario_yields");
  const chipTypes = ensureArray(data, "chip_types");
  const models = ensureArray(data, "vm_yield_models");

  const status = createStatusReporter();

  const scenarioSelect = document.querySelector("#scenario-select");
  const scenarioIdInput = document.querySelector("#scenario-id");
  const scenarioNameInput = document.querySelector("#scenario-name");
  const scenarioStartInput = document.querySelector("#scenario-start");
  const scenarioEndInput = document.querySelector("#scenario-end");
  const scenarioModelSelect = document.querySelector("#scenario-model");

  const scenarioAddBtn = document.querySelector("[data-action='scenario-add']");
  const familyAddBtn = document.querySelector("[data-action='family-param-add']");
  const yieldAddBtn = document.querySelector("[data-action='scenario-yield-add']");
  const chipAddBtn = document.querySelector("[data-action='chip-type-add']");
  const saveBtn = document.querySelector("#save-data");

  const familyTable = document.querySelector("[data-role='family-param-table']");
  const yieldTable = document.querySelector("[data-role='scenario-yield-table']");
  const chipTable = document.querySelector("[data-role='chip-type-table']");

  if (!familyTable || !yieldTable || !chipTable) {
    return;
  }

  let currentScenarioId = "";
  let currentScenario = null;
  let syncing = false;

  function selectScenario(id) {
    currentScenario = scenarios.find((s) => s.scenario_id === id) || scenarios[0] || null;
    currentScenarioId = currentScenario?.scenario_id || "";

    syncing = true;
    if (scenarioIdInput) scenarioIdInput.value = toText(currentScenario?.scenario_id);
    if (scenarioNameInput) scenarioNameInput.value = toText(currentScenario?.name);
    if (scenarioStartInput) scenarioStartInput.value = toText(currentScenario?.start_year);
    if (scenarioEndInput) scenarioEndInput.value = toText(currentScenario?.end_year);
    renderModelOptions(scenarioModelSelect, models, currentScenario?.selected_vm_yield_model_id);
    syncing = false;

    renderFamilyTable();
    renderScenarioYieldTable();
  }

  function refreshScenarioSelect(selectedId) {
    renderScenarioOptions(scenarioSelect, scenarios, selectedId);
  }

  function updateScenarioNameOption() {
    if (!scenarioSelect || !currentScenario) return;
    const options = Array.from(scenarioSelect.options);
    for (const opt of options) {
      if (opt.value === currentScenario.scenario_id) {
        opt.textContent = currentScenario.name || currentScenario.scenario_id;
        break;
      }
    }
  }

  function renderFamilyTable() {
    const tbody = familyTable.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!currentScenarioId) {
      createEmptyRow(tbody, 7, "Bitte zuerst ein Szenario wählen.");
      return;
    }

    const rows = familyParams.filter((row) => row.scenario_id === currentScenarioId);
    if (!rows.length) {
      createEmptyRow(tbody, 7, "Noch keine Familienparameter.");
      return;
    }

    for (const row of rows) {
      const tr = document.createElement("tr");

      let lastFamily = row.family_id || "";
      const familyCell = createInputCell({
        value: lastFamily,
        placeholder: "FAM_28",
        onInput: (val) => {
          row.family_id = val.trim();
        },
        onCommit: (val, input) => {
          const next = val.trim();
          if (
            next &&
            findDuplicate(
              familyParams,
              row,
              (r) => r.scenario_id === currentScenarioId && r.family_id === next
            )
          ) {
            input.value = lastFamily;
            row.family_id = lastFamily;
            status("Diese Family existiert bereits im Szenario.");
            return;
          }
          row.family_id = next;
          ensureFamilyExists(data, next);
          lastFamily = next;
        }
      });
      tr.appendChild(familyCell.td);

      const numericFields = [
        { key: "D0", placeholder: "0.25", step: 0.01 },
        { key: "D_in", placeholder: "0.06", step: 0.01 },
        { key: "t", placeholder: "0.18", step: 0.01 },
        { key: "t_start", placeholder: "2", step: 1 },
        { key: "t_end", placeholder: "5", step: 1 }
      ];

      for (const field of numericFields) {
        const cell = createInputCell({
          type: "number",
          value: toText(row[field.key]),
          placeholder: field.placeholder,
          step: field.step,
          onInput: (val) => {
            row[field.key] = toNumberOrNull(val);
          }
        });
        tr.appendChild(cell.td);
      }

      const actionTd = document.createElement("td");
      const removeBtn = createRemoveButton(() => {
        const idx = familyParams.indexOf(row);
        if (idx >= 0) familyParams.splice(idx, 1);
        renderFamilyTable();
        status("Family-Parameter entfernt.");
      });
      actionTd.appendChild(removeBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    }
  }

  function renderScenarioYieldTable() {
    const tbody = yieldTable.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!currentScenarioId) {
      createEmptyRow(tbody, 7, "Bitte zuerst ein Szenario wählen.");
      return;
    }

    const rows = scenarioYields.filter((row) => row.scenario_id === currentScenarioId);
    if (!rows.length) {
      createEmptyRow(tbody, 7, "Noch keine Szenario-Yields.");
      return;
    }

    for (const row of rows) {
      const tr = document.createElement("tr");

      let lastYear = row.year ?? "";
      const yearCell = createInputCell({
        type: "number",
        value: toText(row.year),
        placeholder: "2025",
        step: 1,
        onInput: (val) => {
          row.year = toNumberOrNull(val);
        },
        onCommit: (val, input) => {
          const next = toNumberOrNull(val);
          if (
            Number.isFinite(next) &&
            findDuplicate(
              scenarioYields,
              row,
              (r) => r.scenario_id === currentScenarioId && Number(r.year) === Number(next)
            )
          ) {
            input.value = toText(lastYear);
            row.year = lastYear;
            status("Dieses Jahr existiert bereits im Szenario.");
            return;
          }
          row.year = next;
          lastYear = next;
        }
      });
      tr.appendChild(yearCell.td);

      for (const field of STATION_FIELDS) {
        const cell = createInputCell({
          type: "number",
          value: toText(row[field]),
          placeholder: "0.95",
          step: 0.001,
          onInput: (val) => {
            row[field] = toNumberOrNull(val);
          }
        });
        tr.appendChild(cell.td);
      }

      const actionTd = document.createElement("td");
      const removeBtn = createRemoveButton(() => {
        const idx = scenarioYields.indexOf(row);
        if (idx >= 0) scenarioYields.splice(idx, 1);
        renderScenarioYieldTable();
        status("Szenario-Yield entfernt.");
      });
      actionTd.appendChild(removeBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    }
  }

  function renderChipTable() {
    const tbody = chipTable.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!chipTypes.length) {
      createEmptyRow(tbody, 8, "Noch keine Chip-Typen.");
      return;
    }

    for (const row of chipTypes) {
      const tr = document.createElement("tr");

      let lastTtnr = row.ttnr || "";
      const ttnrCell = createInputCell({
        value: lastTtnr,
        placeholder: "1111111111",
        onInput: (val) => {
          row.ttnr = val.trim();
        },
        onCommit: (val, input) => {
          const next = val.trim();
          if (next && findDuplicate(chipTypes, row, (r) => r.ttnr === next)) {
            input.value = lastTtnr;
            row.ttnr = lastTtnr;
            status("TTNR existiert bereits.");
            return;
          }
          row.ttnr = next;
          lastTtnr = next;
        }
      });
      tr.appendChild(ttnrCell.td);

      const nameCell = createInputCell({
        value: toText(row.name),
        placeholder: "Example Chip A",
        onInput: (val) => {
          row.name = val;
        }
      });
      tr.appendChild(nameCell.td);

      const familyCell = createInputCell({
        value: toText(row.family_id),
        placeholder: "FAM_28",
        onInput: (val) => {
          row.family_id = val.trim();
        },
        onCommit: (val) => {
          const next = val.trim();
          row.family_id = next;
          ensureFamilyExists(data, next);
        }
      });
      tr.appendChild(familyCell.td);

      const areaCell = createInputCell({
        type: "number",
        value: toText(row.die_area_mm2),
        placeholder: "50",
        step: 0.1,
        onInput: (val) => {
          row.die_area_mm2 = toNumberOrNull(val);
        }
      });
      tr.appendChild(areaCell.td);

      const packageCell = createInputCell({
        value: toText(row.package),
        placeholder: "QFN",
        onInput: (val) => {
          row.package = val;
        }
      });
      tr.appendChild(packageCell.td);

      const startCell = createInputCell({
        type: "number",
        value: toText(row.special_start_year),
        placeholder: "2026",
        step: 1,
        onInput: (val) => {
          row.special_start_year = toNumberOrNull(val);
        }
      });
      tr.appendChild(startCell.td);

      const techCell = createInputCell({
        value: Array.isArray(row.technologies) ? row.technologies.join(", ") : "",
        placeholder: "TECH_SAKASA, TECH_OSAT_PLUS",
        onInput: (val) => {
          row.technologies = parseCsv(val);
        }
      });
      tr.appendChild(techCell.td);

      const actionTd = document.createElement("td");
      const removeBtn = createRemoveButton(() => {
        const idx = chipTypes.indexOf(row);
        if (idx >= 0) chipTypes.splice(idx, 1);
        renderChipTable();
        status("Chip-Typ entfernt.");
      });
      actionTd.appendChild(removeBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    }
  }

  function addScenario() {
    const rawId = scenarioIdInput?.value?.trim() || "";
    const existingIds = new Set(scenarios.map((s) => s.scenario_id));
    const id = rawId || generateUniqueId("Scenario", existingIds);

    if (scenarios.some((s) => s.scenario_id === id)) {
      status("Szenario-ID existiert bereits.");
      return;
    }

    const start = toNumberOrNull(scenarioStartInput?.value);
    const end = toNumberOrNull(scenarioEndInput?.value);
    const modelId = scenarioModelSelect?.value || models[0]?.id || "";

    const scenario = {
      scenario_id: id,
      name: scenarioNameInput?.value?.trim() || id,
      start_year: start ?? 2025,
      end_year: end ?? start ?? 2025,
      selected_vm_yield_model_id: modelId
    };

    scenarios.push(scenario);
    refreshScenarioSelect(id);
    selectScenario(id);
    status("Szenario hinzugefügt.");
  }

  function addFamilyParam() {
    if (!currentScenarioId) {
      status("Bitte zuerst ein Szenario wählen.");
      return;
    }

    const defaultFamily = data.families?.[0]?.family_id || "";
    familyParams.push({
      scenario_id: currentScenarioId,
      family_id: defaultFamily,
      D0: null,
      D_in: null,
      t: null,
      t_start: null,
      t_end: null
    });
    renderFamilyTable();
    status("Family-Parameter hinzugefügt.");
  }

  function addScenarioYield() {
    if (!currentScenarioId) {
      status("Bitte zuerst ein Szenario wählen.");
      return;
    }

    const rows = scenarioYields.filter((row) => row.scenario_id === currentScenarioId);
    const years = rows.map((r) => Number(r.year)).filter(Number.isFinite);
    const baseYear = Number(currentScenario?.start_year);
    const nextYear =
      years.length ? Math.max(...years) + 1 : Number.isFinite(baseYear) ? baseYear : 2025;

    scenarioYields.push({
      scenario_id: currentScenarioId,
      year: nextYear,
      FAB: null,
      EPI: null,
      SAW: null,
      KGD: null,
      OSAT: null
    });
    renderScenarioYieldTable();
    status("Szenario-Yield hinzugefügt.");
  }

  function addChipType() {
    const defaultFamily = data.families?.[0]?.family_id || "";
    chipTypes.push({
      ttnr: "",
      name: "",
      family_id: defaultFamily,
      die_area_mm2: null,
      package: "",
      special_start_year: null,
      technologies: []
    });
    renderChipTable();
    status("Chip-Typ hinzugefügt.");
  }

  function updateScenarioId() {
    if (!currentScenario || !scenarioIdInput) return;
    const next = scenarioIdInput.value.trim();
    if (!next) {
      scenarioIdInput.value = currentScenario.scenario_id;
      status("Szenario-ID darf nicht leer sein.");
      return;
    }
    if (scenarios.some((s) => s !== currentScenario && s.scenario_id === next)) {
      scenarioIdInput.value = currentScenario.scenario_id;
      status("Szenario-ID existiert bereits.");
      return;
    }

    const prev = currentScenario.scenario_id;
    currentScenario.scenario_id = next;
    currentScenarioId = next;

    for (const fp of familyParams) {
      if (fp.scenario_id === prev) fp.scenario_id = next;
    }
    for (const sy of scenarioYields) {
      if (sy.scenario_id === prev) sy.scenario_id = next;
    }

    refreshScenarioSelect(next);
    status(`Szenario-ID geändert: ${prev} -> ${next}`);
  }

  // Init
  refreshScenarioSelect(scenarios[0]?.scenario_id || "");
  selectScenario(scenarioSelect?.value || scenarios[0]?.scenario_id || "");
  renderChipTable();

  // Event wiring
  if (scenarioSelect) {
    scenarioSelect.addEventListener("change", () => {
      if (syncing) return;
      selectScenario(scenarioSelect.value);
    });
  }

  if (scenarioIdInput) {
    scenarioIdInput.addEventListener("change", () => {
      if (syncing) return;
      updateScenarioId();
    });
  }

  if (scenarioNameInput) {
    scenarioNameInput.addEventListener("input", () => {
      if (!currentScenario || syncing) return;
      currentScenario.name = scenarioNameInput.value.trim();
      updateScenarioNameOption();
    });
  }

  if (scenarioStartInput) {
    scenarioStartInput.addEventListener("input", () => {
      if (!currentScenario || syncing) return;
      currentScenario.start_year = toNumberOrNull(scenarioStartInput.value);
      if (
        Number.isFinite(currentScenario.start_year) &&
        Number.isFinite(currentScenario.end_year) &&
        currentScenario.end_year < currentScenario.start_year
      ) {
        status("Warnung: Endjahr liegt vor dem Startjahr.");
      }
    });
  }

  if (scenarioEndInput) {
    scenarioEndInput.addEventListener("input", () => {
      if (!currentScenario || syncing) return;
      currentScenario.end_year = toNumberOrNull(scenarioEndInput.value);
      if (
        Number.isFinite(currentScenario.start_year) &&
        Number.isFinite(currentScenario.end_year) &&
        currentScenario.end_year < currentScenario.start_year
      ) {
        status("Warnung: Endjahr liegt vor dem Startjahr.");
      }
    });
  }

  if (scenarioModelSelect) {
    scenarioModelSelect.addEventListener("change", () => {
      if (!currentScenario || syncing) return;
      currentScenario.selected_vm_yield_model_id = scenarioModelSelect.value;
    });
  }

  if (scenarioAddBtn) scenarioAddBtn.addEventListener("click", addScenario);
  if (familyAddBtn) familyAddBtn.addEventListener("click", addFamilyParam);
  if (yieldAddBtn) yieldAddBtn.addEventListener("click", addScenarioYield);
  if (chipAddBtn) chipAddBtn.addEventListener("click", addChipType);
  if (saveBtn && typeof onSave === "function") {
    saveBtn.addEventListener("click", () => onSave());
  }
}

export function initTechnologyEditor({ data, onSave } = {}) {
  const technologies = ensureArray(data, "technologies");
  const techYields = ensureArray(data, "technology_yields");

  const status = createStatusReporter();

  const techTable = document.querySelector("[data-role='technology-table']");
  const techYieldTable = document.querySelector("[data-role='technology-yield-table']");
  const techAddBtn = document.querySelector("[data-action='technology-add']");
  const techYieldAddBtn = document.querySelector("[data-action='technology-yield-add']");
  const saveBtn = document.querySelector("#save-data");

  if (!techTable || !techYieldTable) {
    return;
  }

  function renderTechTable() {
    const tbody = techTable.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!technologies.length) {
      createEmptyRow(tbody, 6, "Noch keine Technologien.");
      return;
    }

    for (const row of technologies) {
      const tr = document.createElement("tr");

      let lastId = row.tech_id || "";
      const idCell = createInputCell({
        value: lastId,
        placeholder: "TECH_SAKASA",
        onInput: (val) => {
          row.tech_id = val.trim();
        },
        onCommit: (val, input) => {
          const next = val.trim();
          if (next && findDuplicate(technologies, row, (r) => r.tech_id === next)) {
            input.value = lastId;
            row.tech_id = lastId;
            status("Tech-ID existiert bereits.");
            return;
          }
          row.tech_id = next;
          lastId = next;
        }
      });
      tr.appendChild(idCell.td);

      const nameCell = createInputCell({
        value: toText(row.name),
        placeholder: "Sakasa",
        onInput: (val) => {
          row.name = val;
        }
      });
      tr.appendChild(nameCell.td);

      const targetCell = createInputCell({
        value: toText(row.target_field),
        placeholder: "SAW",
        onInput: (val) => {
          row.target_field = val.trim();
        },
        onCommit: (val) => {
          const next = val.trim();
          if (next && !STATION_FIELDS.includes(next)) {
            status(`Warnung: ${next} ist kein gültiges Ziel-Feld.`);
          }
        }
      });
      tr.appendChild(targetCell.td);

      const dynamicCell = createSelectCell({
        options: [
          { value: 1, label: "Ja" },
          { value: 0, label: "Nein" }
        ],
        value: Number(row.is_dynamic) ? "1" : "0",
        onChange: (val) => {
          row.is_dynamic = Number(val);
        }
      });
      tr.appendChild(dynamicCell.td);

      const staticCell = createInputCell({
        type: "number",
        value: toText(row.static_yield),
        placeholder: "0.99",
        step: 0.001,
        onInput: (val) => {
          row.static_yield = toNumberOrNull(val);
        }
      });
      tr.appendChild(staticCell.td);

      const actionTd = document.createElement("td");
      const removeBtn = createRemoveButton(() => {
        const idx = technologies.indexOf(row);
        if (idx >= 0) technologies.splice(idx, 1);
        renderTechTable();
        renderTechYieldTable();
        status("Technologie entfernt.");
      });
      actionTd.appendChild(removeBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    }
  }

  function renderTechYieldTable() {
    const tbody = techYieldTable.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!techYields.length) {
      createEmptyRow(tbody, 4, "Noch keine Yield-Zeilen.");
      return;
    }

    for (const row of techYields) {
      const tr = document.createElement("tr");

      let lastTech = row.tech_id || "";
      const techCell = createInputCell({
        value: lastTech,
        placeholder: "TECH_SAKASA",
        onInput: (val) => {
          row.tech_id = val.trim();
        },
        onCommit: (val, input) => {
          const next = val.trim();
          if (
            next &&
            findDuplicate(
              techYields,
              row,
              (r) => r.tech_id === next && Number(r.year) === Number(row.year)
            )
          ) {
            input.value = lastTech;
            row.tech_id = lastTech;
            status("Diese Tech/Yield-Kombination existiert bereits.");
            return;
          }
          row.tech_id = next;
          lastTech = next;
        }
      });
      tr.appendChild(techCell.td);

      let lastYear = row.year ?? "";
      const yearCell = createInputCell({
        type: "number",
        value: toText(row.year),
        placeholder: "1",
        step: 1,
        onInput: (val) => {
          row.year = toNumberOrNull(val);
        },
        onCommit: (val, input) => {
          const next = toNumberOrNull(val);
          if (
            Number.isFinite(next) &&
            findDuplicate(
              techYields,
              row,
              (r) => r.tech_id === row.tech_id && Number(r.year) === Number(next)
            )
          ) {
            input.value = toText(lastYear);
            row.year = lastYear;
            status("Diese Tech/Yield-Kombination existiert bereits.");
            return;
          }
          row.year = next;
          lastYear = next;
        }
      });
      tr.appendChild(yearCell.td);

      const yieldCell = createInputCell({
        type: "number",
        value: toText(row.yield),
        placeholder: "0.98",
        step: 0.001,
        onInput: (val) => {
          row.yield = toNumberOrNull(val);
        }
      });
      tr.appendChild(yieldCell.td);

      const actionTd = document.createElement("td");
      const removeBtn = createRemoveButton(() => {
        const idx = techYields.indexOf(row);
        if (idx >= 0) techYields.splice(idx, 1);
        renderTechYieldTable();
        status("Yield-Zeile entfernt.");
      });
      actionTd.appendChild(removeBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    }
  }

  function addTechnology() {
    technologies.push({
      tech_id: "",
      name: "",
      target_field: "",
      is_dynamic: 0,
      static_yield: null
    });
    renderTechTable();
    status("Technologie hinzugefügt.");
  }

  function addTechYield() {
    const defaultTech = technologies[0]?.tech_id || "";
    techYields.push({
      tech_id: defaultTech,
      year: 1,
      yield: null
    });
    renderTechYieldTable();
    status("Yield-Zeile hinzugefügt.");
  }

  renderTechTable();
  renderTechYieldTable();

  if (techAddBtn) techAddBtn.addEventListener("click", addTechnology);
  if (techYieldAddBtn) techYieldAddBtn.addEventListener("click", addTechYield);
  if (saveBtn && typeof onSave === "function") {
    saveBtn.addEventListener("click", () => onSave());
  }
}
