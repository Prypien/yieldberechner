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

function createSelectCell({
  options = [],
  value = "",
  values = [],
  multiple = false,
  className = "control-select",
  onChange
}) {
  const td = document.createElement("td");
  const select = document.createElement("select");
  select.className = className;
  if (multiple) select.multiple = true;

  for (const opt of options) {
    const o = document.createElement("option");
    o.value = String(opt.value);
    o.textContent = opt.label;
    if (opt.disabled) o.disabled = true;
    select.appendChild(o);
  }

  if (multiple) {
    const selected = new Set((values || []).map((v) => String(v)));
    for (const opt of Array.from(select.options)) {
      if (selected.has(opt.value)) opt.selected = true;
    }
  } else {
    select.value = value ?? "";
  }

  if (typeof onChange === "function") {
    select.addEventListener("change", () => {
      if (multiple) {
        const next = Array.from(select.selectedOptions).map((opt) => opt.value);
        onChange(next, select);
      } else {
        onChange(select.value, select);
      }
    });
  }
  td.appendChild(select);
  return { td, select };
}

function createTechSelector({
  options = [],
  values = [],
  onChange
}) {
  const container = document.createElement("div");
  container.className = "tech-selector";

  const selectedSet = new Set(values);

  for (const opt of options) {
    const label = document.createElement("label");
    label.className = "tech-check" + (selectedSet.has(opt.value) ? " is-active" : "");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = opt.value;
    input.checked = selectedSet.has(opt.value);

    label.appendChild(input);
    label.appendChild(document.createTextNode(opt.label));

    input.addEventListener("change", () => {
      if (input.checked) {
        selectedSet.add(opt.value);
        label.classList.add("is-active");
      } else {
        selectedSet.delete(opt.value);
        label.classList.remove("is-active");
      }
      if (typeof onChange === "function") {
        onChange(Array.from(selectedSet));
      }
    });

    container.appendChild(label);
  }

  return container;
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
  if (!familyId) return null;
  const families = ensureArray(data, "families");
  const existing = families.find((f) => f.family_id === familyId);
  if (existing) return existing;
  const row = {
    family_id: familyId,
    name: familyId,
    description: ""
  };
  families.push(row);
  return row;
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

function buildFamilyOptions(families, currentId) {
  const options = (families || [])
    .filter((f) => f.family_id)
    .map((f) => ({
      value: f.family_id,
      label: f.name ? `${f.name} (${f.family_id})` : f.family_id
    }));

  const known = new Set(options.map((opt) => opt.value));
  if (currentId && !known.has(currentId)) {
    options.push({ value: currentId, label: `${currentId} (nicht gefunden)` });
  }

  if (!options.length) {
    return [{ value: "", label: "Keine Families verfügbar", disabled: true }];
  }

  return options;
}

function buildTechnologyOptions(technologies, selectedIds = []) {
  const options = (technologies || [])
    .filter((t) => t.tech_id)
    .map((t) => ({
      value: t.tech_id,
      label: t.name ? `${t.name} (${t.tech_id})` : t.tech_id
    }));

  const known = new Set(options.map((opt) => opt.value));
  for (const id of selectedIds) {
    if (id && !known.has(id)) {
      options.push({ value: id, label: `${id} (nicht gefunden)` });
    }
  }

  if (!options.length) {
    return [{ value: "", label: "Keine Technologien verfügbar", disabled: true }];
  }

  return options;
}

export function initScenarioEditor({ data, onSave } = {}) {
  const scenarios = ensureArray(data, "scenarios");
  const families = ensureArray(data, "families");
  const familyParams = ensureArray(data, "scenario_family_params");
  const scenarioYields = ensureArray(data, "scenario_yields");
  const chipTypes = ensureArray(data, "chip_types");
  const technologies = ensureArray(data, "technologies");
  const models = ensureArray(data, "vm_yield_models");

  const status = createStatusReporter();

  const scenarioSelect = document.querySelector("#scenario-select");
  const scenarioList = document.querySelector("[data-role='scenario-list']");
  const activeScenarioLabels = Array.from(
    document.querySelectorAll("[data-role='active-scenario-label']")
  );

  const scenarioOpenBtn = document.querySelector("[data-action='scenario-open']");
  const scenarioEditBtn = document.querySelector("[data-action='scenario-edit']");
  const familyAddBtn = document.querySelector("[data-action='family-param-add']");
  const yieldAddBtn = document.querySelector("[data-action='scenario-yield-add']");
  const chipAddBtn = document.querySelector("[data-action='chip-type-add']");
  const familyMasterAddBtn = document.querySelector("[data-action='family-add']");
  const saveButtons = Array.from(document.querySelectorAll("[data-action='save-data']"));

  const familyParamTable = document.querySelector("[data-role='family-param-table']");
  const yieldTable = document.querySelector("[data-role='scenario-yield-table']");
  const chipTable = document.querySelector("[data-role='chip-type-table']");
  const familyMasterTable = document.querySelector("[data-role='family-table']");

  const scenarioModal = document.querySelector("[data-role='scenario-modal']");
  const scenarioModalTitle = document.querySelector("[data-role='scenario-modal-title']");
  const scenarioModalHint = document.querySelector("[data-role='scenario-modal-hint']");
  const scenarioSaveBtn = document.querySelector("[data-action='scenario-save']");
  const scenarioCancelBtns = Array.from(document.querySelectorAll("[data-action='scenario-cancel']"));
  const scenarioCreateIdInput = document.querySelector("#scenario-create-id");
  const scenarioCreateNameInput = document.querySelector("#scenario-create-name");
  const scenarioCreateStartInput = document.querySelector("#scenario-create-start");
  const scenarioCreateEndInput = document.querySelector("#scenario-create-end");
  const scenarioCreateModelSelect = document.querySelector("#scenario-create-model");

  if (!familyParamTable || !yieldTable || !chipTable) {
    return;
  }

  let currentScenarioId = "";
  let currentScenario = null;
  let syncing = false;
  let scenarioModalMode = "create";
  let scenarioEditingId = "";

  function updateActiveScenarioLabels() {
    const displayName = currentScenario?.name || currentScenario?.scenario_id || "–";
    const id = currentScenario?.scenario_id || "";
    const label =
      id && displayName !== id ? `Aktiv: ${displayName} (${id})` : `Aktiv: ${displayName}`;
    for (const el of activeScenarioLabels) {
      el.textContent = label;
    }
  }

  function renderScenarioList() {
    if (!scenarioList) return;
    scenarioList.innerHTML = "";

    if (!scenarios.length) {
      const empty = document.createElement("div");
      empty.className = "status-text";
      empty.textContent = "Noch keine Szenarien vorhanden.";
      scenarioList.appendChild(empty);
      return;
    }

    for (const s of scenarios) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scenario-card" + (s.scenario_id === currentScenarioId ? " is-active" : "");
      btn.addEventListener("click", () => selectScenario(s.scenario_id));

      const title = document.createElement("div");
      title.className = "scenario-card-title";
      title.textContent = s.name || s.scenario_id;

      const meta = document.createElement("div");
      meta.className = "scenario-card-meta";
      const start = toText(s.start_year) || "–";
      const end = toText(s.end_year) || "–";
      meta.textContent = `${s.scenario_id} · ${start}–${end}`;

      const model = models.find((m) => m.id === s.selected_vm_yield_model_id);
      const modelLine = document.createElement("div");
      modelLine.className = "scenario-card-meta";
      modelLine.textContent = `Modell: ${model?.name || s.selected_vm_yield_model_id || "–"}`;

      if (s.scenario_id === currentScenarioId) {
        const tag = document.createElement("div");
        tag.className = "scenario-card-tag";
        tag.textContent = "Aktiv";
        btn.appendChild(tag);
      }

      btn.appendChild(title);
      btn.appendChild(meta);
      btn.appendChild(modelLine);

      scenarioList.appendChild(btn);
    }
  }

  function selectScenario(id) {
    currentScenario = scenarios.find((s) => s.scenario_id === id) || scenarios[0] || null;
    currentScenarioId = currentScenario?.scenario_id || "";

    syncing = true;
    if (scenarioSelect) scenarioSelect.value = currentScenarioId;
    syncing = false;

    updateActiveScenarioLabels();
    renderScenarioList();
    renderFamilyTable();
    renderScenarioYieldTable();
  }

  function refreshScenarioSelect(selectedId) {
    renderScenarioOptions(scenarioSelect, scenarios, selectedId);
    renderScenarioList();
    updateActiveScenarioLabels();
    if (scenarioEditBtn) scenarioEditBtn.disabled = !scenarios.length;
  }

  function renderFamiliesTable() {
    if (!familyMasterTable) return;
    const tbody = familyMasterTable.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!families.length) {
      createEmptyRow(tbody, 4, "Noch keine Families.");
      return;
    }

    for (const row of families) {
      const tr = document.createElement("tr");

      let lastId = row.family_id || "";
      const idCell = createInputCell({
        value: lastId,
        placeholder: "FAM_28",
        onInput: (val) => {
          row.family_id = val.trim();
        },
        onCommit: (val, input) => {
          const next = val.trim();
          if (!next) {
            input.value = lastId;
            row.family_id = lastId;
            status("Family-ID darf nicht leer sein.");
            return;
          }
          if (findDuplicate(families, row, (r) => r.family_id === next)) {
            input.value = lastId;
            row.family_id = lastId;
            status("Family-ID existiert bereits.");
            return;
          }

          const prev = lastId;
          row.family_id = next;
          if (!row.name || row.name === prev) {
            row.name = next;
          }

          for (const fp of familyParams) {
            if (fp.family_id === prev) fp.family_id = next;
          }
          for (const chip of chipTypes) {
            if (chip.family_id === prev) chip.family_id = next;
          }

          lastId = next;
          renderFamilyTable();
          renderChipTable();
          status(`Family-ID geändert: ${prev} -> ${next}`);
        }
      });
      tr.appendChild(idCell.td);

      const nameCell = createInputCell({
        value: toText(row.name),
        placeholder: "28nm",
        onInput: (val) => {
          row.name = val;
        }
      });
      tr.appendChild(nameCell.td);

      const descCell = createInputCell({
        value: toText(row.description),
        placeholder: "z.B. 28nm technology family",
        onInput: (val) => {
          row.description = val;
        }
      });
      tr.appendChild(descCell.td);

      const actionTd = document.createElement("td");
      const removeBtn = createRemoveButton(() => {
        if (!confirm(`Family "${row.family_id}" wirklich entfernen?`)) return;
        const removedId = row.family_id;
        const idx = families.indexOf(row);
        if (idx >= 0) families.splice(idx, 1);

        for (let i = familyParams.length - 1; i >= 0; i -= 1) {
          if (familyParams[i].family_id === removedId) familyParams.splice(i, 1);
        }
        for (const chip of chipTypes) {
          if (chip.family_id === removedId) chip.family_id = "";
        }

        renderFamiliesTable();
        renderFamilyTable();
        renderChipTable();
        status("Family entfernt und verknüpfte Daten bereinigt.");
      });
      actionTd.appendChild(removeBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    }
  }

  function renderFamilyTable() {
    const tbody = familyParamTable.querySelector("tbody");
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
          const created = ensureFamilyExists(data, next);
          if (created) renderFamiliesTable();
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

      const familyOptions = buildFamilyOptions(families, row.family_id);
      const familyCell = createSelectCell({
        options: familyOptions,
        value: row.family_id || "",
        onChange: (val) => {
          row.family_id = val;
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

      const techIds = Array.isArray(row.technologies) ? row.technologies : [];
      const techOptions = buildTechnologyOptions(technologies, techIds);

      const techTd = document.createElement("td");
      const techSelector = createTechSelector({
        options: techOptions,
        values: techIds,
        onChange: (val) => {
          row.technologies = Array.isArray(val) ? val : [];
        }
      });
      techTd.appendChild(techSelector);
      tr.appendChild(techTd);

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

  function replaceScenarioId(prevId, nextId) {
    if (!prevId || prevId === nextId) return;
    for (const fp of familyParams) {
      if (fp.scenario_id === prevId) fp.scenario_id = nextId;
    }
    for (const sy of scenarioYields) {
      if (sy.scenario_id === prevId) sy.scenario_id = nextId;
    }
  }

  function openScenarioModal(mode = "create") {
    if (!scenarioModal) return;

    const isEdit = mode === "edit";
    scenarioModalMode = isEdit ? "edit" : "create";

    if (scenarioModalTitle) {
      scenarioModalTitle.textContent = isEdit ? "Szenario bearbeiten" : "Neues Szenario";
    }
    if (scenarioModalHint) {
      scenarioModalHint.textContent = isEdit
        ? "Passe die Werte des aktiven Szenarios an."
        : "Lege ein neues Szenario an und wähle danach das aktive Szenario oben aus.";
    }
    if (scenarioSaveBtn) {
      scenarioSaveBtn.textContent = isEdit ? "Änderungen speichern" : "Szenario anlegen";
    }

    if (isEdit) {
      if (!currentScenario) {
        status("Bitte zuerst ein Szenario wählen.");
        return;
      }
      scenarioEditingId = currentScenario.scenario_id || "";
      if (scenarioCreateIdInput) scenarioCreateIdInput.value = toText(currentScenario.scenario_id);
      if (scenarioCreateNameInput) scenarioCreateNameInput.value = toText(currentScenario.name);
      if (scenarioCreateStartInput) scenarioCreateStartInput.value = toText(currentScenario.start_year);
      if (scenarioCreateEndInput) scenarioCreateEndInput.value = toText(currentScenario.end_year);
      renderModelOptions(
        scenarioCreateModelSelect,
        models,
        currentScenario.selected_vm_yield_model_id || models[0]?.id
      );
    } else {
      const existingIds = new Set(scenarios.map((s) => s.scenario_id));
      const suggestedId = generateUniqueId("Scenario", existingIds);
      if (scenarioCreateIdInput) scenarioCreateIdInput.value = suggestedId;
      if (scenarioCreateNameInput) scenarioCreateNameInput.value = "";

      const baseStart = Number.isFinite(currentScenario?.start_year)
        ? currentScenario.start_year
        : 2025;
      const baseEnd = Number.isFinite(currentScenario?.end_year)
        ? currentScenario.end_year
        : baseStart;

      if (scenarioCreateStartInput) scenarioCreateStartInput.value = toText(baseStart);
      if (scenarioCreateEndInput) scenarioCreateEndInput.value = toText(baseEnd);
      renderModelOptions(
        scenarioCreateModelSelect,
        models,
        currentScenario?.selected_vm_yield_model_id || models[0]?.id
      );
      scenarioEditingId = "";
    }

    scenarioModal.classList.add("is-open");
    scenarioModal.setAttribute("aria-hidden", "false");
    scenarioCreateIdInput?.focus();
  }

  function closeScenarioModal() {
    if (!scenarioModal) return;
    scenarioModal.classList.remove("is-open");
    scenarioModal.setAttribute("aria-hidden", "true");
  }

  function saveScenarioFromModal() {
    const existingIds = new Set(scenarios.map((s) => s.scenario_id));
    const rawId = scenarioCreateIdInput?.value?.trim() || "";
    const isEdit = scenarioModalMode === "edit";
    const fallbackId = isEdit
      ? scenarioEditingId || currentScenario?.scenario_id || ""
      : generateUniqueId("Scenario", existingIds);
    const id = rawId || fallbackId;

    if (!id) {
      status("Szenario-ID fehlt.");
      return;
    }

    if (existingIds.has(id) && (!isEdit || id !== scenarioEditingId)) {
      status("Szenario-ID existiert bereits.");
      return;
    }

    const startInput = toNumberOrNull(scenarioCreateStartInput?.value);
    const endInput = toNumberOrNull(scenarioCreateEndInput?.value);
    const modelId = scenarioCreateModelSelect?.value || models[0]?.id || "";

    if (isEdit) {
      const scenario =
        scenarios.find((s) => s.scenario_id === scenarioEditingId) || currentScenario;
      if (!scenario) {
        status("Kein Szenario zum Bearbeiten gefunden.");
        return;
      }

      const fallbackStart = Number.isFinite(scenario.start_year) ? scenario.start_year : 2025;
      const fallbackEnd = Number.isFinite(scenario.end_year) ? scenario.end_year : fallbackStart;
      const nextStart = Number.isFinite(startInput) ? startInput : fallbackStart;
      let nextEnd = Number.isFinite(endInput) ? endInput : fallbackEnd;

      if (Number.isFinite(nextStart) && Number.isFinite(nextEnd) && nextEnd < nextStart) {
        nextEnd = nextStart;
        status("Endjahr lag vor Startjahr und wurde angepasst.");
      }

      const nameInput = scenarioCreateNameInput?.value?.trim() || "";
      const nextName = nameInput || scenario.name || id;
      const prevId = scenario.scenario_id;

      scenario.scenario_id = id;
      scenario.name = nextName;
      scenario.start_year = nextStart;
      scenario.end_year = nextEnd;
      scenario.selected_vm_yield_model_id = modelId;

      replaceScenarioId(prevId, id);
      refreshScenarioSelect(id);
      selectScenario(id);
      closeScenarioModal();
      status("Szenario aktualisiert.");
      return;
    }

    let end = endInput;
    const name = scenarioCreateNameInput?.value?.trim() || id;
    if (Number.isFinite(startInput) && Number.isFinite(end) && end < startInput) {
      end = startInput;
      status("Endjahr lag vor Startjahr und wurde angepasst.");
    }

    const scenario = {
      scenario_id: id,
      name,
      start_year: startInput ?? 2025,
      end_year: end ?? startInput ?? 2025,
      selected_vm_yield_model_id: modelId
    };

    scenarios.push(scenario);
    refreshScenarioSelect(id);
    selectScenario(id);
    closeScenarioModal();
    status("Szenario hinzugefügt.");
  }

  function addFamily() {
    const existingIds = new Set(families.map((f) => f.family_id));
    const id = generateUniqueId("FAM", existingIds);
    families.push({
      family_id: id,
      name: id,
      description: ""
    });
    renderFamiliesTable();
    status("Family hinzugefügt.");
  }

  function addFamilyParam() {
    if (!currentScenarioId) {
      status("Bitte zuerst ein Szenario wählen.");
      return;
    }

    const defaultFamily = families[0]?.family_id || "";
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
    const defaultFamily = families[0]?.family_id || "";
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

  // Init
  refreshScenarioSelect(scenarios[0]?.scenario_id || "");
  selectScenario(scenarioSelect?.value || scenarios[0]?.scenario_id || "");
  renderFamiliesTable();
  renderChipTable();

  // Event wiring
  if (scenarioSelect) {
    scenarioSelect.addEventListener("change", () => {
      if (syncing) return;
      selectScenario(scenarioSelect.value);
    });
  }

  if (scenarioOpenBtn) scenarioOpenBtn.addEventListener("click", () => openScenarioModal("create"));
  if (scenarioEditBtn) scenarioEditBtn.addEventListener("click", () => openScenarioModal("edit"));
  if (scenarioSaveBtn) scenarioSaveBtn.addEventListener("click", saveScenarioFromModal);
  for (const btn of scenarioCancelBtns) {
    btn.addEventListener("click", () => closeScenarioModal());
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && scenarioModal?.classList.contains("is-open")) {
      closeScenarioModal();
    }
  });

  if (familyMasterAddBtn) familyMasterAddBtn.addEventListener("click", addFamily);
  if (familyAddBtn) familyAddBtn.addEventListener("click", addFamilyParam);
  if (yieldAddBtn) yieldAddBtn.addEventListener("click", addScenarioYield);
  if (chipAddBtn) chipAddBtn.addEventListener("click", addChipType);
  if (saveButtons.length && typeof onSave === "function") {
    for (const btn of saveButtons) {
      btn.addEventListener("click", () => onSave());
    }
  }
}

export function initTechnologyEditor({ data, onSave } = {}) {
  const technologies = ensureArray(data, "technologies");
  const techYields = ensureArray(data, "technology_yields");
  const chipTypes = ensureArray(data, "chip_types");

  const status = createStatusReporter();

  const techTable = document.querySelector("[data-role='technology-table']");
  const techYieldTable = document.querySelector("[data-role='technology-yield-table']");
  const techAddBtn = document.querySelector("[data-action='technology-add']");
  const techYieldAddBtn = document.querySelector("[data-action='technology-yield-add']");
  const saveButtons = Array.from(document.querySelectorAll("[data-action='save-data']"));

  if (!techTable || !techYieldTable) {
    return;
  }

  function replaceTechnologyId(prevId, nextId) {
    if (!prevId || prevId === nextId) return;
    for (const row of techYields) {
      if (row.tech_id === prevId) row.tech_id = nextId;
    }
    for (const chip of chipTypes) {
      if (!Array.isArray(chip.technologies)) continue;
      chip.technologies = chip.technologies.map((id) => (id === prevId ? nextId : id));
    }
  }

  function removeTechnologyRefs(techId) {
    if (!techId) return;
    for (let i = techYields.length - 1; i >= 0; i -= 1) {
      if (techYields[i].tech_id === techId) techYields.splice(i, 1);
    }
    for (const chip of chipTypes) {
      if (!Array.isArray(chip.technologies)) continue;
      chip.technologies = chip.technologies.filter((id) => id !== techId);
    }
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
          const prev = lastId;
          row.tech_id = next;
          replaceTechnologyId(prev, next);
          lastId = next;
          if (prev && prev !== next) {
            renderTechYieldTable();
            status(`Tech-ID geändert: ${prev} -> ${next}`);
          }
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
        removeTechnologyRefs(row.tech_id);
        renderTechTable();
        renderTechYieldTable();
        status("Technologie entfernt und Verknüpfungen bereinigt.");
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
  if (saveButtons.length && typeof onSave === "function") {
    for (const btn of saveButtons) {
      btn.addEventListener("click", () => onSave());
    }
  }
}
