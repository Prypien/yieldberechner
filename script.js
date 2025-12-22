const sqlSeed = {
  schema: `-- Minimal benötigte Tabellen
CREATE TABLE plants (id TEXT PRIMARY KEY, name TEXT);
CREATE TABLE families (id TEXT PRIMARY KEY, plant_id TEXT, name TEXT, D0 REAL, D_in REAL, t REAL, t_start REAL);
CREATE TABLE chip_types (ttnr TEXT PRIMARY KEY, plant_id TEXT, name TEXT, family_id TEXT, package TEXT, die_area_mm2 REAL, cw REAL, special_start_year INTEGER);
CREATE TABLE technologies (id TEXT PRIMARY KEY, plant_id TEXT, name TEXT, description TEXT, target_field TEXT, static_extra_pct REAL, is_dynamic INTEGER);
CREATE TABLE technology_years (technology_id TEXT, year INTEGER, extra_pct REAL);
CREATE TABLE chip_type_tech (ttnr TEXT, technology_id TEXT);
CREATE TABLE yield_models (id TEXT PRIMARY KEY, name TEXT, description TEXT, layers INTEGER, sql TEXT);`,
  inserts: `-- Beispiel-Daten
INSERT INTO plants VALUES ('RtP1', 'Werk RtP1');
INSERT INTO plants VALUES ('RseP', 'Werk RseP');

INSERT INTO families VALUES ('RF1', 'RtP1', 'RF1', 0.23, 0.05, 1.8, 0.2);
INSERT INTO families VALUES ('RF2', 'RtP1', 'RF2', 0.18, 0.04, 2.1, 0.3);
INSERT INTO families VALUES ('SF1', 'RseP', 'SF1', 0.26, 0.06, 1.6, 0.1);
INSERT INTO families VALUES ('SF2', 'RseP', 'SF2', 0.21, 0.04, 1.9, 0.25);

INSERT INTO chip_types VALUES ('0270.248.172', 'RtP1', 'Drive Controller', 'RF1', 'QFN-48', 64, 200, 0);
INSERT INTO chip_types VALUES ('0412.093.551', 'RtP1', 'Sensor Hub', 'RF1', 'BGA-96', 81, 200, 2027);
INSERT INTO chip_types VALUES ('0198.552.730', 'RtP1', 'Power Gate', 'RF2', 'SOIC-16', 55, 200, 0);
INSERT INTO chip_types VALUES ('0325.401.880', 'RseP', 'Connectivity Core', 'SF1', 'LGA-64', 72, 200, 0);
INSERT INTO chip_types VALUES ('0550.330.041', 'RseP', 'Analog Frontend', 'SF2', 'QFN-32', 48, 200, 0);
INSERT INTO chip_types VALUES ('0607.180.912', 'RseP', 'System Gateway', 'SF2', 'BGA-128', 95, 200, 2026);

INSERT INTO technologies VALUES ('tech_rtp1_1', 'RtP1', 'EUV Boost', 'Verbesserte Lithographie', 'FAB', 1.8, 0);
INSERT INTO technologies VALUES ('tech_rtp1_2', 'RtP1', 'Saw Clean', 'Optimierte Sägeprozesse', 'SAW', 0.9, 1);
INSERT INTO technologies VALUES ('tech_rsep_1', 'RseP', 'Fab Control', 'Stabilisierung der FAB yield', 'FAB', 1.1, 1);
INSERT INTO technologies VALUES ('tech_rsep_2', 'RseP', 'OSAT Partner', 'Verbesserte OSAT Ausbeute', 'OSAT', 0.7, 0);

INSERT INTO technology_years VALUES ('tech_rtp1_1', 2027, 2.2);
INSERT INTO technology_years VALUES ('tech_rtp1_2', 2026, 1.2);
INSERT INTO technology_years VALUES ('tech_rtp1_2', 2029, 1.6);
INSERT INTO technology_years VALUES ('tech_rsep_1', 2025, 0.8);
INSERT INTO technology_years VALUES ('tech_rsep_1', 2028, 1.4);

INSERT INTO chip_type_tech VALUES ('0270.248.172', 'tech_rtp1_1');
INSERT INTO chip_type_tech VALUES ('0270.248.172', 'tech_rtp1_2');
INSERT INTO chip_type_tech VALUES ('0412.093.551', 'tech_rtp1_1');
INSERT INTO chip_type_tech VALUES ('0325.401.880', 'tech_rsep_1');
INSERT INTO chip_type_tech VALUES ('0550.330.041', 'tech_rsep_2');
INSERT INTO chip_type_tech VALUES ('0607.180.912', 'tech_rsep_1');
INSERT INTO chip_type_tech VALUES ('0607.180.912', 'tech_rsep_2');

INSERT INTO yield_models VALUES ('poisson', 'Poisson', 'Standard-Modell mit exponentiellem Ausfall', 12, 'EXP(-D_year * A_cm2)');
INSERT INTO yield_models VALUES ('murphy', 'Murphy', 'Classic Murphy approximation', 10, '(1 - EXP(-D_year * A_cm2)) / (D_year * A_cm2)');
INSERT INTO yield_models VALUES ('neg_binom', 'Negative Binomial', 'Alpha = 3.0', 14, 'POWER(1 + (D_year * A_cm2)/alpha, -alpha)');
INSERT INTO yield_models VALUES ('seeds', 'Seeds', 'Deterministisches Platzhaltermodell', 8, 'EXP(-D_year * A_cm2 * 0.92)');`,
  exampleQuery: `-- Beispiel-Query pro Jahr
WITH base AS (
  SELECT
    c.ttnr,
    c.name,
    f.name AS family_name,
    c.package,
    (:D0 + :D_in) * POWER(0.985, :y_idx) AS D_year,
    (:die_area_mm2 / 100.0) AS A_cm2
  FROM chip_types c
  JOIN families f ON f.id = c.family_id
  WHERE c.ttnr = :ttnr
)
SELECT
  *,
  EXP(-D_year * A_cm2) AS fab_yield
FROM base;`
};

const STORAGE_KEY = "yield-calculator-state-v1";
const UI_KEY = "yield-calculator-ui-v1";

const cloneState = (value) => JSON.parse(JSON.stringify(value));

const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.warn("Konnte State nicht laden:", error);
    return null;
  }
};

const loadUiState = () => {
  try {
    const stored = localStorage.getItem(UI_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.warn("Konnte UI-State nicht laden:", error);
    return null;
  }
};

const defaultState = {
  scenario: {
    name: "Baseline 2025",
    start_year: 2025,
    end_year: 2030,
    selected_model: "poisson"
  },
  models: [
    {
      id: "poisson",
      name: "Poisson",
      description: "Standard-Modell mit exponentiellem Ausfall",
      layers: 12,
      sql: "EXP(-D_year * A_cm2)"
    },
    {
      id: "murphy",
      name: "Murphy",
      description: "Classic Murphy approximation",
      layers: 10,
      sql: "(1 - EXP(-D_year * A_cm2)) / (D_year * A_cm2)"
    },
    {
      id: "neg_binom",
      name: "Negative Binomial",
      description: "Alpha = 3.0",
      layers: 14,
      sql: "POWER(1 + (D_year * A_cm2)/alpha, -alpha)"
    },
    {
      id: "seeds",
      name: "Seeds",
      description: "Deterministisches Platzhaltermodell",
      layers: 8,
      sql: "EXP(-D_year * A_cm2 * 0.92)"
    }
  ],
  plants: {
    RtP1: {
      families: [
        { id: "RF1", name: "RF1", D0: 0.23, D_in: 0.05, t: 1.8, t_start: 0.2 },
        { id: "RF2", name: "RF2", D0: 0.18, D_in: 0.04, t: 2.1, t_start: 0.3 }
      ],
      technologies: [
        {
          id: "tech_rtp1_1",
          name: "EUV Boost",
          description: "Verbesserte Lithographie",
          target_field: "FAB",
          static_extra_pct: 1.8,
          is_dynamic: false,
          years: { 2027: 2.2 }
        },
        {
          id: "tech_rtp1_2",
          name: "Saw Clean",
          description: "Optimierte Sägeprozesse",
          target_field: "SAW",
          static_extra_pct: 0.9,
          is_dynamic: true,
          years: { 2026: 1.2, 2029: 1.6 }
        }
      ],
      chipTypes: [
        {
          ttnr: "0270.248.172",
          name: "Drive Controller",
          family_id: "RF1",
          package: "QFN-48",
          die_area_mm2: 64,
          cw: 200,
          special_start_year: 0
        },
        {
          ttnr: "0412.093.551",
          name: "Sensor Hub",
          family_id: "RF1",
          package: "BGA-96",
          die_area_mm2: 81,
          cw: 200,
          special_start_year: 2027
        },
        {
          ttnr: "0198.552.730",
          name: "Power Gate",
          family_id: "RF2",
          package: "SOIC-16",
          die_area_mm2: 55,
          cw: 200,
          special_start_year: 0
        }
      ],
      chipTypeTech: {
        "0270.248.172": ["tech_rtp1_1", "tech_rtp1_2"],
        "0412.093.551": ["tech_rtp1_1"],
        "0198.552.730": []
      }
    },
    RseP: {
      families: [
        { id: "SF1", name: "SF1", D0: 0.26, D_in: 0.06, t: 1.6, t_start: 0.1 },
        { id: "SF2", name: "SF2", D0: 0.21, D_in: 0.04, t: 1.9, t_start: 0.25 }
      ],
      technologies: [
        {
          id: "tech_rsep_1",
          name: "Fab Control",
          description: "Stabilisierung der FAB yield",
          target_field: "FAB",
          static_extra_pct: 1.1,
          is_dynamic: true,
          years: { 2025: 0.8, 2028: 1.4 }
        },
        {
          id: "tech_rsep_2",
          name: "OSAT Partner",
          description: "Verbesserte OSAT Ausbeute",
          target_field: "OSAT",
          static_extra_pct: 0.7,
          is_dynamic: false,
          years: {}
        }
      ],
      chipTypes: [
        {
          ttnr: "0325.401.880",
          name: "Connectivity Core",
          family_id: "SF1",
          package: "LGA-64",
          die_area_mm2: 72,
          cw: 200,
          special_start_year: 0
        },
        {
          ttnr: "0550.330.041",
          name: "Analog Frontend",
          family_id: "SF2",
          package: "QFN-32",
          die_area_mm2: 48,
          cw: 200,
          special_start_year: 0
        },
        {
          ttnr: "0607.180.912",
          name: "System Gateway",
          family_id: "SF2",
          package: "BGA-128",
          die_area_mm2: 95,
          cw: 200,
          special_start_year: 2026
        }
      ],
      chipTypeTech: {
        "0325.401.880": ["tech_rsep_1"],
        "0550.330.041": ["tech_rsep_2"],
        "0607.180.912": ["tech_rsep_1", "tech_rsep_2"]
      }
    }
  }
};

let state = loadState() ?? cloneState(defaultState);

const baseYields = {
  EPI: 0.985,
  VM: 0.886,
  SAW: 0.975,
  KGD: 0.955,
  OSAT: 0.982,
  EPI_SHIP: 0.995
};

const storedUi = loadUiState();
let activePlant = storedUi?.activePlant || "RtP1";
let activeTab = storedUi?.activeTab || "scenario";

let saveTimer = null;
const scheduleSave = () => {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(UI_KEY, JSON.stringify({ activePlant, activeTab }));
    } catch (error) {
      console.warn("Konnte State nicht speichern:", error);
    }
  }, 300);
};

const scenarioNameInput = document.getElementById("scenario-name");
const scenarioStartInput = document.getElementById("scenario-start");
const scenarioEndInput = document.getElementById("scenario-end");
const modelSelect = document.getElementById("model-select");
const tooltip = document.getElementById("tooltip");
const sqlSnapshot = document.getElementById("sql-snapshot");
const scenarioError = document.getElementById("scenario-error");

const clamp = (value) => Math.min(1, Math.max(0, value));

const setInputError = (input, hasError) => {
  input.classList.toggle("input-error", hasError);
};

const parseNumberInput = (input, { min = 0, integer = false } = {}) => {
  const raw = integer ? parseInt(input.value, 10) : parseFloat(input.value);
  const valid = Number.isFinite(raw) && raw >= min;
  setInputError(input, !valid);
  return valid ? raw : null;
};

const formatSql = (formula, params) => {
  let formatted = formula;
  Object.entries(params).forEach(([key, value]) => {
    formatted = formatted.replaceAll(`:${key}`, value);
  });
  return formatted;
};

const getModelById = (id) => state.models.find((model) => model.id === id);

const getPlant = () => state.plants[activePlant];

const getFamilies = () => getPlant().families;

const getTechnologies = () => getPlant().technologies;

const getChipTypes = () => getPlant().chipTypes;

const getChipTypeTech = () => getPlant().chipTypeTech;

const getScenarioYears = () => {
  const years = [];
  for (let year = state.scenario.start_year; year <= state.scenario.end_year; year++) {
    years.push(year);
  }
  return years;
};

const validateScenarioYears = () => {
  const start = state.scenario.start_year;
  const end = state.scenario.end_year;
  const valid = Number.isFinite(start) && Number.isFinite(end) && start <= end;
  if (scenarioError) {
    scenarioError.textContent = valid ? "" : "Startjahr muss kleiner oder gleich dem Endjahr sein.";
  }
  setInputError(scenarioStartInput, !valid);
  setInputError(scenarioEndInput, !valid);
  return valid;
};

const buildSqlSnapshot = () => {
  const plantName = activePlant === "RtP1" ? "Werk RtP1" : "Werk RseP";
  return [
    `-- Übersicht für ${plantName}`,
    sqlSeed.schema,
    sqlSeed.inserts,
    sqlSeed.exampleQuery
  ].join("\n\n");
};

const computeDefectDensity = (family, year) => {
  const yIdx = year - state.scenario.start_year;
  const formula = "(:D0 + :D_in) * POWER(0.985, :y_idx)";
  const value = (family.D0 + family.D_in) * Math.pow(0.985, yIdx);
  return {
    value,
    formula: formatSql(formula, {
      D0: family.D0.toFixed(4),
      D_in: family.D_in.toFixed(4),
      y_idx: yIdx
    })
  };
};

const computeFabYield = (family, dieAreaMm2, year) => {
  const D = computeDefectDensity(family, year);
  const A_cm2 = dieAreaMm2 / 100.0;
  const model = getModelById(state.scenario.selected_model);
  let value = 0;
  let formula = model.sql;
  if (model.id === "poisson") {
    value = Math.exp(-D.value * A_cm2);
  } else if (model.id === "murphy") {
    const denom = D.value * A_cm2;
    value = denom === 0 ? 1 : (1 - Math.exp(-denom)) / denom;
  } else if (model.id === "neg_binom") {
    const alpha = 3.0;
    value = Math.pow(1 + (D.value * A_cm2) / alpha, -alpha);
    formula = model.sql.replace("alpha", alpha);
  } else {
    value = Math.exp(-D.value * A_cm2 * 0.92);
  }
  return {
    value: clamp(value),
    formula: formatSql(formula, {
      D_year: D.value.toFixed(4),
      A_cm2: A_cm2.toFixed(4)
    }),
    dFormula: D.formula
  };
};

const getDynamicExtraPct = (tech, year) => {
  if (!tech.is_dynamic) return tech.static_extra_pct;
  if (tech.years[year] !== undefined) return tech.years[year];
  const previousYears = Object.keys(tech.years)
    .map((y) => parseInt(y, 10))
    .filter((y) => y < year)
    .sort((a, b) => b - a);
  if (previousYears.length > 0) return tech.years[previousYears[0]];
  return 0;
};

const computeYield = ({ field, base, techs, year }) => {
  const techAdjustments = techs
    .filter((tech) => tech.target_field === field)
    .map((tech) => ({
      name: tech.name,
      pct: getDynamicExtraPct(tech, year),
      dynamic: tech.is_dynamic
    }));
  const totalExtra = techAdjustments.reduce((sum, item) => sum + item.pct, 0);
  const value = clamp(base * (1 + totalExtra / 100));
  const formula = "field_base * (1 + (SUM(extra_pct) / 100.0))";
  return {
    value,
    formula: formatSql(formula, {
      field_base: base.toFixed(4)
    }),
    techAdjustments,
    totalExtra
  };
};

const buildFieldSql = ({ field, base, totalExtra, year, ttnr, defectFormula, fabFormula }) => {
  const lines = [
    "WITH inputs AS (",
    `  SELECT ${base.toFixed(4)} AS field_base, ${totalExtra.toFixed(2)} AS extra_pct`,
    ")",
    "SELECT",
    `  field_base * (1 + (extra_pct / 100.0)) AS ${field.toLowerCase()}_yield`,
    "FROM inputs;"
  ];

  if (field === "FAB") {
    lines.unshift(
      "-- FAB Yield Beispiel",
      `-- TTNR: ${ttnr}, Jahr: ${year}`,
      `-- Defect Density: ${defectFormula}`,
      `-- Modell: ${fabFormula}`
    );
  } else {
    lines.unshift(`-- ${field} Yield Beispiel (TTNR ${ttnr}, Jahr ${year})`);
  }

  return lines.join("\n");
};

const computeResults = () => {
  const results = [];
  if (!validateScenarioYears()) {
    return results;
  }
  const plant = getPlant();
  const techs = getTechnologies();
  const chipTypeTech = getChipTypeTech();
  const families = getFamilies();
  const start = state.scenario.start_year;
  const end = state.scenario.end_year;

  for (let year = start; year <= end; year++) {
    plant.chipTypes.forEach((chip) => {
      const active = chip.special_start_year === 0
        ? year >= start
        : year >= chip.special_start_year;
      if (!active) return;
      const family = families.find((fam) => fam.id === chip.family_id);
      const fab = computeFabYield(family, chip.die_area_mm2, year);
      const chipTechs = (chipTypeTech[chip.ttnr] || []).map((id) =>
        techs.find((tech) => tech.id === id)
      ).filter(Boolean);

      const fields = {
        EPI: computeYield({ field: "EPI", base: baseYields.EPI, techs: chipTechs, year }),
        FAB: computeYield({ field: "FAB", base: fab.value, techs: chipTechs, year }),
        VM: computeYield({ field: "VM", base: baseYields.VM, techs: chipTechs, year }),
        SAW: computeYield({ field: "SAW", base: baseYields.SAW, techs: chipTechs, year }),
        KGD: computeYield({ field: "KGD", base: baseYields.KGD, techs: chipTechs, year }),
        OSAT: computeYield({ field: "OSAT", base: baseYields.OSAT, techs: chipTechs, year }),
        EPI_SHIP: computeYield({ field: "EPI_SHIP", base: baseYields.EPI_SHIP, techs: chipTechs, year })
      };

      const total = clamp(
        fields.EPI.value * fields.FAB.value * fields.VM.value * fields.SAW.value *
        fields.KGD.value * fields.OSAT.value * fields.EPI_SHIP.value
      );

      results.push({
        year,
        chip,
        family,
        fields,
        fabFormula: fab.formula,
        fabDefectFormula: fab.dFormula,
        total
      });
    });
  }
  return results;
};

const renderPlantToggle = () => {
  document.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.plant === activePlant);
  });
};

const renderScenario = () => {
  scenarioNameInput.value = state.scenario.name;
  scenarioStartInput.value = state.scenario.start_year;
  scenarioEndInput.value = state.scenario.end_year;
  document.getElementById("calc-start-year").textContent = state.scenario.start_year;
  validateScenarioYears();
};

const renderModelSelect = () => {
  modelSelect.innerHTML = state.models
    .map((model) =>
      `<option value="${model.id}">${model.name}</option>`
    )
    .join("");
  modelSelect.value = state.scenario.selected_model;
};

const renderFamilies = () => {
  const tbody = document.querySelector("#families-table tbody");
  tbody.innerHTML = getFamilies()
    .map((family) =>
      `<tr>
        <td>${family.name}</td>
        <td><input class="input" type="number" step="0.01" data-family="${family.id}" data-field="D0" value="${family.D0}" /></td>
        <td><input class="input" type="number" step="0.01" data-family="${family.id}" data-field="D_in" value="${family.D_in}" /></td>
        <td><input class="input" type="number" step="0.01" data-family="${family.id}" data-field="t" value="${family.t}" /></td>
        <td><input class="input" type="number" step="0.01" data-family="${family.id}" data-field="t_start" value="${family.t_start}" /></td>
      </tr>`
    )
    .join("");
};

const renderSqlOverview = () => {
  sqlSnapshot.textContent = buildSqlSnapshot();
};

const renderModelsTable = () => {
  const tbody = document.querySelector("#models-table tbody");
  tbody.innerHTML = state.models
    .map((model) =>
      `<tr>
        <td><input class="input" type="text" data-model="${model.id}" data-field="name" value="${model.name}" /></td>
        <td><input class="input" type="text" data-model="${model.id}" data-field="description" value="${model.description}" /></td>
        <td><input class="input" type="number" data-model="${model.id}" data-field="layers" value="${model.layers}" /></td>
        <td><textarea class="input sql" data-model="${model.id}" data-field="sql" rows="2">${model.sql}</textarea></td>
        <td><button class="icon-btn" data-remove-model="${model.id}">✕</button></td>
      </tr>`
    )
    .join("");
};

const renderTypesTable = () => {
  const families = getFamilies();
  const techs = getTechnologies();
  const chipTypeTech = getChipTypeTech();
  const tbody = document.querySelector("#types-table tbody");
  tbody.innerHTML = getChipTypes()
    .map((chip) => {
      const techOptions = techs
        .map((tech) => {
          const selected = (chipTypeTech[chip.ttnr] || []).includes(tech.id) ? "selected" : "";
          return `<option value="${tech.id}" ${selected}>${tech.name}</option>`;
        })
        .join("");
      const familyOptions = families
        .map((family) =>
          `<option value="${family.id}" ${family.id === chip.family_id ? "selected" : ""}>${family.name}</option>`
        )
        .join("");
      return `<tr>
        <td class="mono">${chip.ttnr}</td>
        <td><input class="input" type="text" data-chip="${chip.ttnr}" data-field="name" value="${chip.name}" /></td>
        <td><select class="input" data-chip="${chip.ttnr}" data-field="family_id">${familyOptions}</select></td>
        <td><input class="input" type="text" data-chip="${chip.ttnr}" data-field="package" value="${chip.package}" /></td>
        <td><input class="input" type="number" step="0.1" data-chip="${chip.ttnr}" data-field="die_area_mm2" value="${chip.die_area_mm2}" /></td>
        <td><input class="input" type="number" step="0.1" data-chip="${chip.ttnr}" data-field="cw" value="${chip.cw}" /></td>
        <td><select multiple class="input multi" data-chip="${chip.ttnr}" data-field="technologies">${techOptions}</select></td>
        <td><input class="input" type="number" data-chip="${chip.ttnr}" data-field="special_start_year" value="${chip.special_start_year}" /></td>
      </tr>`;
    })
    .join("");
};

const renderTechTable = () => {
  const tbody = document.querySelector("#tech-table tbody");
  tbody.innerHTML = getTechnologies()
    .map((tech) =>
      `<tr data-tech-row="${tech.id}">
        <td><input class="input" type="text" data-tech="${tech.id}" data-field="name" value="${tech.name}" /></td>
        <td><input class="input" type="text" data-tech="${tech.id}" data-field="description" value="${tech.description}" /></td>
        <td>
          <select class="input" data-tech="${tech.id}" data-field="target_field">
            ${["EPI", "FAB", "VM", "SAW", "KGD", "OSAT", "EPI_SHIP", "TOTAL"].map((field) =>
              `<option value="${field}" ${field === tech.target_field ? "selected" : ""}>${field}</option>`
            ).join("")}
          </select>
        </td>
        <td>
          <input class="input" type="number" step="0.1" data-tech="${tech.id}" data-field="static_extra_pct" value="${tech.static_extra_pct}" ${tech.is_dynamic ? "disabled" : ""} />
        </td>
        <td>
          <label class="switch">
            <input type="checkbox" data-tech="${tech.id}" data-field="is_dynamic" ${tech.is_dynamic ? "checked" : ""} />
            <span></span>
          </label>
        </td>
      </tr>`
    )
    .join("");

  renderTechYears();
};

const renderTechYears = () => {
  const container = document.getElementById("tech-years");
  const years = getScenarioYears();
  container.innerHTML = getTechnologies()
    .filter((tech) => tech.is_dynamic)
    .map((tech) => {
      const rows = years
        .map((year) =>
          `<tr>
            <td>${year}</td>
            <td><input class="input" type="number" step="0.1" data-tech-year="${tech.id}" data-year="${year}" value="${tech.years[year] ?? ""}" placeholder="0" /></td>
          </tr>`
        )
        .join("");
      return `<div class="tech-years-block">
        <div class="tech-years-header">Jahre – ${tech.name}</div>
        <div class="table-scroll">
          <table class="table small">
            <thead>
              <tr><th>Jahr</th><th>Extra Yield [%]</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    })
    .join("");
};

const renderResults = () => {
  const tbody = document.querySelector("#results-table tbody");
  const results = computeResults();
  tbody.innerHTML = results
    .map((row) => {
      const fields = row.fields;
      return `<tr>
        <td>${row.year}</td>
        <td class="mono">${row.chip.ttnr}</td>
        <td>${row.chip.name}</td>
        <td>${row.family.name}</td>
        <td>${row.chip.package}</td>
        ${renderYieldCell("EPI", fields.EPI, row)}
        ${renderYieldCell("FAB", fields.FAB, row, row.fabFormula, row.fabDefectFormula)}
        ${renderYieldCell("VM", fields.VM, row)}
        ${renderYieldCell("SAW", fields.SAW, row)}
        ${renderYieldCell("KGD", fields.KGD, row)}
        ${renderYieldCell("OSAT", fields.OSAT, row)}
        ${renderYieldCell("EPI_SHIP", fields.EPI_SHIP, row)}
        ${renderYieldCell("TOTAL", { value: row.total, formula: "EPI * FAB * VM * SAW * KGD * OSAT * EPI_SHIP", techAdjustments: [], totalExtra: 0 }, row)}
      </tr>`;
    })
    .join("");
};

const renderYieldCell = (field, data, row, fabFormula, fabDefectFormula) => {
  const sqlPreview = buildFieldSql({
    field,
    base: data.value,
    totalExtra: data.totalExtra || 0,
    year: row.year,
    ttnr: row.chip.ttnr,
    defectFormula: fabDefectFormula,
    fabFormula: fabFormula || data.formula
  });
  const payload = {
    field,
    year: row.year,
    value: data.value,
    formula: data.formula,
    fabFormula: fabFormula || null,
    fabDefectFormula: fabDefectFormula || null,
    techAdjustments: data.techAdjustments || [],
    totalExtra: data.totalExtra || 0,
    sqlPreview
  };
  return `<td class="yield" data-tooltip='${JSON.stringify(payload)}'>${(data.value * 100).toFixed(2)}%</td>`;
};

const switchTab = (tab) => {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tab}`);
  });
  scheduleSave();
};

const updateResults = () => {
  renderResults();
};

const positionTooltip = (x, y) => {
  const offset = 16;
  tooltip.style.left = `${x + offset}px`;
  tooltip.style.top = `${y + offset}px`;
  const rect = tooltip.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 12;
  const maxY = window.innerHeight - rect.height - 12;
  const nextX = Math.min(x + offset, maxX);
  const nextY = Math.min(y + offset, maxY);
  const finalX = nextX < 12 ? 12 : nextX;
  const finalY = nextY < 12 ? 12 : nextY;
  tooltip.style.left = `${finalX}px`;
  tooltip.style.top = `${finalY}px`;
};

const bindEvents = () => {
  document.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activePlant = btn.dataset.plant;
      renderAll();
      scheduleSave();
    });
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  scenarioNameInput.addEventListener("input", (event) => {
    state.scenario.name = event.target.value;
    scheduleSave();
  });
  scenarioStartInput.addEventListener("input", (event) => {
    const nextValue = parseNumberInput(event.target, { min: 0, integer: true });
    if (nextValue === null) {
      validateScenarioYears();
      return;
    }
    state.scenario.start_year = nextValue;
    renderAll();
    scheduleSave();
  });
  scenarioEndInput.addEventListener("input", (event) => {
    const nextValue = parseNumberInput(event.target, { min: 0, integer: true });
    if (nextValue === null) {
      validateScenarioYears();
      return;
    }
    state.scenario.end_year = nextValue;
    renderAll();
    scheduleSave();
  });

  modelSelect.addEventListener("change", (event) => {
    state.scenario.selected_model = event.target.value;
    updateResults();
    scheduleSave();
  });

  document.body.addEventListener("input", (event) => {
    const target = event.target;
    if (target.dataset.family) {
      const family = getFamilies().find((f) => f.id === target.dataset.family);
      const value = parseNumberInput(target, { min: 0 });
      if (value === null) return;
      family[target.dataset.field] = value;
      updateResults();
      scheduleSave();
    }
    if (target.dataset.model) {
      const model = state.models.find((m) => m.id === target.dataset.model);
      if (target.dataset.field === "layers") {
        const value = parseNumberInput(target, { min: 1, integer: true });
        if (value === null) return;
        model.layers = value;
      } else {
        model[target.dataset.field] = target.value;
      }
      renderModelSelect();
      updateResults();
      scheduleSave();
    }
    if (target.dataset.chip) {
      const chip = getChipTypes().find((c) => c.ttnr === target.dataset.chip);
      if (target.dataset.field === "technologies") return;
      const numericFields = ["die_area_mm2", "cw", "special_start_year"];
      if (numericFields.includes(target.dataset.field)) {
        const min = target.dataset.field === "die_area_mm2" ? 0.1 : 0;
        const integer = target.dataset.field === "special_start_year";
        const value = parseNumberInput(target, { min, integer });
        if (value === null) return;
        chip[target.dataset.field] = value;
      } else {
        chip[target.dataset.field] = target.value;
      }
      updateResults();
      scheduleSave();
    }
    if (target.dataset.tech) {
      const tech = getTechnologies().find((t) => t.id === target.dataset.tech);
      if (target.dataset.field === "static_extra_pct") {
        const value = parseFloat(target.value);
        setInputError(target, Number.isNaN(value));
        if (Number.isNaN(value)) return;
        tech.static_extra_pct = value;
      } else if (target.dataset.field === "is_dynamic") {
        tech.is_dynamic = target.checked;
      } else {
        tech[target.dataset.field] = target.value;
      }
      renderTechTable();
      updateResults();
      scheduleSave();
    }
    if (target.dataset.techYear) {
      const tech = getTechnologies().find((t) => t.id === target.dataset.techYear);
      const year = parseInt(target.dataset.year, 10);
      if (target.value === "") {
        delete tech.years[year];
        updateResults();
        scheduleSave();
        return;
      }
      const value = parseNumberInput(target, { min: 0 });
      if (value === null) return;
      if (value === undefined) {
        delete tech.years[year];
      } else {
        tech.years[year] = value;
      }
      updateResults();
      scheduleSave();
    }
  });

  document.body.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.chip && target.dataset.field === "technologies") {
      const selected = Array.from(target.selectedOptions).map((option) => option.value);
      getChipTypeTech()[target.dataset.chip] = selected;
      updateResults();
      scheduleSave();
    }
  });

  document.body.addEventListener("click", (event) => {
    if (event.target.matches("#add-model")) {
      const id = `custom_${Date.now()}`;
      state.models.push({
        id,
        name: "Neues Modell",
        description: "Beschreibung",
        layers: 1,
        sql: "EXP(-D_year * A_cm2)"
      });
      renderModelSelect();
      renderModelsTable();
      scheduleSave();
    }
    if (event.target.dataset.removeModel) {
      const id = event.target.dataset.removeModel;
      state.models = state.models.filter((model) => model.id !== id);
      if (state.scenario.selected_model === id) {
        state.scenario.selected_model = state.models[0]?.id || "";
      }
      renderModelSelect();
      renderModelsTable();
      updateResults();
      scheduleSave();
    }
  });

  document.body.addEventListener("mouseenter", (event) => {
    const cell = event.target.closest(".yield");
    if (!cell) return;
    const data = JSON.parse(cell.dataset.tooltip);
    tooltip.innerHTML = buildTooltipContent(data);
    tooltip.classList.add("visible");
  }, true);

  document.body.addEventListener("mousemove", (event) => {
    if (!tooltip.classList.contains("visible")) return;
    positionTooltip(event.clientX, event.clientY);
  });

  document.body.addEventListener("mouseleave", (event) => {
    if (event.target.closest(".yield")) {
      tooltip.classList.remove("visible");
    }
  }, true);
};

const buildTooltipContent = (data) => {
  const techLines = data.techAdjustments.length
    ? data.techAdjustments
        .map((tech) => `${tech.name}: ${tech.pct.toFixed(2)}%${tech.dynamic ? " (dyn)" : ""}`)
        .join("\n")
    : "Keine Technologien";
  const detailLines = [
    `Feld: ${data.field}`,
    `Jahr: ${data.year}`,
    `Final: ${(data.value * 100).toFixed(2)}%`,
    "",
    "Berechnung (SQL):",
    data.formula
  ];

  if (data.field === "FAB") {
    detailLines.push("", "Defect Density:", data.fabDefectFormula, "Model:", data.fabFormula);
  }

  detailLines.push("", "Technologien:", techLines, "", "SQL-Preview:", data.sqlPreview);

  return `<div class="tooltip-title">${data.field} Yield</div>
    <pre class="tooltip-body">${detailLines.join("\n")}</pre>`;
};

const renderAll = () => {
  renderPlantToggle();
  renderScenario();
  renderModelSelect();
  renderFamilies();
  renderSqlOverview();
  renderModelsTable();
  renderTypesTable();
  renderTechTable();
  renderResults();
  switchTab(activeTab);
};

renderAll();
bindEvents();
