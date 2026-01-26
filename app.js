const STORAGE_KEY = "yield-ui-settings";
const IMPORT_SUMMARY_KEY = "yield-import-summary";

const numericFields = new Set([
  "start_year",
  "end_year",
  "D0",
  "D_in",
  "t",
  "t_start",
  "die_area_mm2",
  "static_extra_pct",
  "extra_pct",
  "base_yield",
  "layers",
  "alpha",
  "n",
  "is_dynamic"
]);

const requiredTables = [
  "scenarios",
  "scenario_plants",
  "plants",
  "plant_base_yields",
  "families",
  "chip_types",
  "technologies",
  "technology_years",
  "chip_type_tech",
  "yield_models"
];

const yieldFields = ["EPI", "FAB", "VM", "SAW", "KGD", "OSAT", "EPI_SHIP"];

const FAB_MODEL_REGISTRY = {
  POISSON: {
    label: "Poisson",
    sql: "EXP(-D_year * A_cm2)",
    needs: [],
    compute: ({ D_year, A_cm2 }) => Math.exp(-D_year * A_cm2)
  },
  MURPHY: {
    label: "Murphy",
    sql: "(1 - EXP(-D_year * A_cm2)) / NULLIF(D_year * A_cm2, 0)",
    needs: [],
    compute: ({ D_year, A_cm2 }) => {
      const x = D_year * A_cm2;
      return x === 0 ? 1 : (1 - Math.exp(-x)) / x;
    }
  },
  SEEDS: {
    label: "Seeds",
    sql: "EXP(-SQRT(D_year * A_cm2))",
    needs: [],
    compute: ({ D_year, A_cm2 }) => Math.exp(-Math.sqrt(D_year * A_cm2))
  },
  BOSE: {
    label: "Bose–Einstein",
    sql: "POWER(1 / (1 + D_year * A_cm2), n)",
    needs: ["n"],
    compute: ({ D_year, A_cm2, params }) => {
      const n = Number(params?.n ?? 1);
      return Math.pow(1 / (1 + D_year * A_cm2), n);
    }
  },
  NEGBIN: {
    label: "Negative Binomial",
    sql: "POWER(1 + (D_year * A_cm2)/alpha, -alpha)",
    needs: ["alpha"],
    compute: ({ D_year, A_cm2, params }) => {
      const alpha = Number(params?.alpha ?? 3.0);
      return Math.pow(1 + (D_year * A_cm2) / alpha, -alpha);
    }
  }
};

const tableNameMap = {
  scenario: "scenarios",
  scenarios: "scenarios",
  scenario_plants: "scenario_plants",
  plants: "plants",
  plant_base_yields: "plant_base_yields",
  families: "families",
  chip_types: "chip_types",
  chiptypes: "chip_types",
  technologies: "technologies",
  technology_years: "technology_years",
  chip_type_tech: "chip_type_tech",
  yield_models: "yield_models"
};

const state = {
  tables: {},
  model: null,
  validation: { errors: [], warnings: [] },
  ui: {
    activeTab: "setup",
    filters: {
      search: "",
      plant: "",
      family: "",
      year: ""
    },
    sidepanelOpen: false,
    sort: { key: "total", direction: "desc" }
  },
  results: []
};

const elements = {
  tabs: document.querySelectorAll(".tab-btn"),
  panels: document.querySelectorAll(".tab-panel"),
  importStatus: document.getElementById("import-status"),
  importDetails: document.getElementById("import-details"),
  importSummary: document.getElementById("import-summary"),
  fileMeta: document.getElementById("file-meta"),
  xlsxInput: document.getElementById("xlsx-input"),
  scenarioSelect: document.getElementById("scenario-select"),
  scenarioName: document.getElementById("scenario-name"),
  scenarioStart: document.getElementById("scenario-start"),
  scenarioEnd: document.getElementById("scenario-end"),
  modelSelect: document.getElementById("model-select"),
  plantSelect: document.getElementById("plant-select"),
  runCalc: document.getElementById("run-calc"),
  calcHint: document.getElementById("calc-hint"),
  modelSettings: document.getElementById("model-settings"),
  dataOverview: document.getElementById("data-overview"),
  tablePreview: document.getElementById("table-preview"),
  filterSearch: document.getElementById("filter-search"),
  filterPlant: document.getElementById("filter-plant"),
  filterFamily: document.getElementById("filter-family"),
  filterYear: document.getElementById("filter-year"),
  resultsTable: document.getElementById("results-table"),
  detailPanel: document.getElementById("detail-panel"),
  detailBody: document.getElementById("detail-body"),
  sqlPreview: document.getElementById("sql-preview"),
  copySql: document.getElementById("copy-sql"),
  closePanel: document.getElementById("close-panel")
};

function saveUiSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ui));
}

function loadUiSettings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      state.ui = { ...state.ui, ...JSON.parse(stored) };
    } catch (error) {
      console.warn("Failed to parse UI settings", error);
    }
  }
}

function saveImportSummary(summary) {
  localStorage.setItem(IMPORT_SUMMARY_KEY, JSON.stringify(summary));
}

function loadImportSummary() {
  const stored = localStorage.getItem(IMPORT_SUMMARY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      return null;
    }
  }
  return null;
}

function clamp01(value) {
  if (Number.isNaN(value) || value === Infinity || value === -Infinity) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function formatDecimal(value, decimals = 4) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  if (Number.isInteger(number)) {
    return number.toString();
  }
  return number.toFixed(decimals);
}

function substituteSql(template, values) {
  let output = template;
  Object.entries(values).forEach(([key, value]) => {
    const formatted = formatDecimal(value);
    output = output.replace(new RegExp(`\\b${key}\\b`, "g"), formatted);
  });
  return output;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === "\"") {
        if (text[i + 1] === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseCsvTextToTables(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return {};
  }
  const headers = rows.shift().map((header) => header.trim());
  const tables = {};

  rows.forEach((row) => {
    if (row.length === 0 || row.every((value) => value === "")) {
      return;
    }
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });
    const tableNameRaw = record.table;
    if (!tableNameRaw) {
      return;
    }
    const tableName = normalizeTableName(tableNameRaw);
    const { table, ...rest } = record;
    const normalized = normalizeRow(rest);
    if (!tables[tableName]) {
      tables[tableName] = [];
    }
    tables[tableName].push(normalized);
  });

  return tables;
}

function normalizeTableName(name) {
  const key = name.trim().toLowerCase();
  return tableNameMap[key] || name;
}

async function parseXlsxArrayBuffer(arrayBuffer) {
  const zipEntries = await unzipXlsx(arrayBuffer);
  const workbookXml = getZipText(zipEntries, "xl/workbook.xml");
  const workbookRels = getZipText(zipEntries, "xl/_rels/workbook.xml.rels");
  if (!workbookXml || !workbookRels) {
    throw new Error("Workbook-Struktur nicht gefunden.");
  }

  const sharedStringsXml = getZipText(zipEntries, "xl/sharedStrings.xml");
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];

  const sheetMap = parseWorkbookSheets(workbookXml, workbookRels);
  const tables = {};

  Object.entries(sheetMap).forEach(([sheetName, sheetPath]) => {
    const xml = getZipText(zipEntries, sheetPath);
    if (!xml) {
      return;
    }
    const rows = parseSheet(xml, sharedStrings);
    if (rows.length > 0) {
      const tableName = normalizeTableName(sheetName);
      tables[tableName] = rows.map((row) => normalizeRow(row));
    }
  });

  return tables;
}

async function parseXlsxToTables(file) {
  const arrayBuffer = await file.arrayBuffer();
  return parseXlsxArrayBuffer(arrayBuffer);
}

async function parseCsvToTables(file) {
  const text = await file.text();
  return parseCsvTextToTables(text);
}

function normalizeRow(row) {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    if (numericFields.has(key)) {
      normalized[key] = parseNumber(value);
    } else {
      normalized[key] = value;
    }
  });
  return normalized;
}

function getZipText(zipEntries, path) {
  const entry = zipEntries.get(path);
  if (!entry) {
    return null;
  }
  return new TextDecoder("utf-8").decode(entry);
}

async function unzipXlsx(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const eocd = findEndOfCentralDirectory(view);
  if (!eocd) {
    throw new Error("XLSX-ZIP-Struktur nicht gefunden.");
  }

  const entries = new Map();
  let offset = eocd.centralDirectoryOffset;
  for (let i = 0; i < eocd.totalEntries; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      break;
    }
    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const name = new TextDecoder("utf-8").decode(
      new Uint8Array(arrayBuffer, nameStart, fileNameLength)
    );

    const localHeader = localHeaderOffset;
    const localNameLength = view.getUint16(localHeader + 26, true);
    const localExtraLength = view.getUint16(localHeader + 28, true);
    const dataStart = localHeader + 30 + localNameLength + localExtraLength;
    const compressedData = new Uint8Array(arrayBuffer, dataStart, compressedSize);

    let data;
    if (compression === 0) {
      data = compressedData;
    } else if (compression === 8) {
      data = await inflateRaw(compressedData);
    } else {
      throw new Error(`Nicht unterstützter ZIP-Compression-Typ: ${compression}`);
    }

    entries.set(name, data);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(view) {
  for (let i = view.byteLength - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      const totalEntries = view.getUint16(i + 10, true);
      const centralDirectoryOffset = view.getUint32(i + 16, true);
      return { totalEntries, centralDirectoryOffset };
    }
  }
  return null;
}

async function inflateRaw(data) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Browser unterstützt kein DecompressionStream (deflate-raw).");
  }
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(data);
  writer.close();
  const response = new Response(stream.readable);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

function parseWorkbookSheets(workbookXml, relsXml) {
  const parser = new DOMParser();
  const workbookDoc = parser.parseFromString(workbookXml, "application/xml");
  const relsDoc = parser.parseFromString(relsXml, "application/xml");
  const rels = {};
  relsDoc.querySelectorAll("Relationship").forEach((rel) => {
    rels[rel.getAttribute("Id")] = rel.getAttribute("Target");
  });

  const sheets = {};
  workbookDoc.querySelectorAll("sheet").forEach((sheet) => {
    const name = sheet.getAttribute("name");
    const relId = sheet.getAttribute("r:id");
    let target = rels[relId];
    if (!target) {
      return;
    }
    if (target.startsWith("/")) {
      target = target.slice(1);
    }
    if (!target.startsWith("xl/")) {
      target = `xl/${target}`;
    }
    sheets[name] = target.replace(/\\/g, "/");
  });
  return sheets;
}

function parseSharedStrings(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const values = [];
  doc.querySelectorAll("si").forEach((node) => {
    const text = Array.from(node.querySelectorAll("t"))
      .map((t) => t.textContent)
      .join("");
    values.push(text);
  });
  return values;
}

function parseSheet(xml, sharedStrings) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const rows = [];
  const namespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  doc.querySelectorAll("sheetData row").forEach((rowNode) => {
    const cells = rowNode.querySelectorAll("c");
    const row = [];
    cells.forEach((cell) => {
      const cellRef = cell.getAttribute("r");
      if (!cellRef) {
        return;
      }
      const colIndex = columnIndex(cellRef.replace(/\d+/g, ""));
      let value = "";
      const type = cell.getAttribute("t");
      const v = cell.getElementsByTagNameNS(namespace, "v")[0];
      const inline = cell.getElementsByTagNameNS(namespace, "t")[0];
      if (type === "s" && v) {
        value = sharedStrings[Number(v.textContent)] ?? "";
      } else if (type === "inlineStr" && inline) {
        value = inline.textContent;
      } else if (v) {
        value = v.textContent;
      }
      row[colIndex] = value;
    });
    rows.push(row);
  });

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => (header || "").trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      if (header) {
        obj[header] = row[index] ?? "";
      }
    });
    return obj;
  });
}

function columnIndex(column) {
  let index = 0;
  for (let i = 0; i < column.length; i += 1) {
    index = index * 26 + (column.charCodeAt(i) - 64);
  }
  return index - 1;
}

function normalizeModelParam(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return { value: fallback, warning: true };
  }
  return { value: number, warning: false };
}

function buildDataModel(tables) {
  const errors = [];
  const warnings = [];

  const model = {
    scenarios: [],
    plants: new Map(),
    yieldModels: new Map(),
    chipTypeTech: new Map(),
    technologyYears: new Map(),
    scenarioPlants: new Map(),
    tables
  };

  requiredTables.forEach((table) => {
    if (!tables[table]) {
      warnings.push(`Tabelle fehlt: ${table}`);
    }
  });

  (tables.yield_models || []).forEach((row) => {
    const id = row.yield_model_id || row.id;
    if (!id) {
      return;
    }
    const registry = FAB_MODEL_REGISTRY[id];
    if (!registry) {
      errors.push(`yield_models enthält unbekanntes yield_model_id ${id}`);
    }
    const layersValue = Number(row.layers);
    const layers = Number.isFinite(layersValue) ? layersValue : 1;
    const alpha = normalizeModelParam(row.alpha, 3.0);
    const nValue = normalizeModelParam(row.n, 1);
    const paramWarnings = {
      alpha: alpha.warning,
      n: nValue.warning
    };
    if (alpha.warning && registry?.needs.includes("alpha")) {
      warnings.push(`alpha ungültig für Modell ${id}, Default 3.0 genutzt.`);
    }
    if (nValue.warning && registry?.needs.includes("n")) {
      warnings.push(`n ungültig für Modell ${id}, Default 1 genutzt.`);
    }
    model.yieldModels.set(id, {
      id,
      name: row.name || registry?.label || id,
      layers,
      alpha: alpha.value,
      n: nValue.value,
      paramWarnings,
      sqlFormula: row.sql_formula || row.sql || registry?.sql || ""
    });
  });

  (tables.plants || []).forEach((row) => {
    model.plants.set(row.plant_id || row.id, {
      id: row.plant_id || row.id,
      name: row.name,
      families: new Map(),
      chipTypes: [],
      technologies: new Map(),
      baseYields: {}
    });
  });

  (tables.plant_base_yields || []).forEach((row) => {
    const plantId = row.plant_id;
    const field = row.field;
    if (!yieldFields.includes(field)) {
      warnings.push(`Unbekanntes Yield-Feld in plant_base_yields: ${field}`);
    }
    const plant = model.plants.get(plantId);
    if (!plant) {
      errors.push(`plant_base_yields referenziert unbekanntes plant_id ${plantId}`);
      return;
    }
    plant.baseYields[field] = parseNumber(row.base_yield) ?? 0;
  });

  (tables.families || []).forEach((row) => {
    const plant = model.plants.get(row.plant_id);
    if (!plant) {
      errors.push(`family ${row.family_id || row.id} referenziert unbekanntes plant_id ${row.plant_id}`);
      return;
    }
    const familyId = row.family_id || row.id;
    plant.families.set(familyId, {
      id: familyId,
      plantId: row.plant_id,
      D0: parseNumber(row.D0) ?? 0,
      D_in: parseNumber(row.D_in) ?? 0,
      t: parseNumber(row.t) ?? 0,
      t_start: parseNumber(row.t_start) ?? 0,
      name: row.name || familyId
    });
  });

  (tables.technologies || []).forEach((row) => {
    const plant = model.plants.get(row.plant_id);
    if (!plant) {
      errors.push(`technology ${row.tech_id || row.id} referenziert unbekanntes plant_id ${row.plant_id}`);
      return;
    }
    const techId = row.tech_id || row.id;
    plant.technologies.set(techId, {
      id: techId,
      plantId: row.plant_id,
      name: row.name,
      targetField: row.target_field,
      staticExtraPct: parseNumber(row.static_extra_pct) ?? 0,
      isDynamic: Number(row.is_dynamic) === 1,
      description: row.description || ""
    });
  });

  (tables.technology_years || []).forEach((row) => {
    const techId = row.tech_id || row.technology_id || row.id;
    if (!techId) {
      return;
    }
    const target = findTechnology(model, techId);
    if (!target) {
      errors.push(`technology_years referenziert unbekanntes tech_id ${techId}`);
      return;
    }
    if (!model.technologyYears.has(techId)) {
      model.technologyYears.set(techId, new Map());
    }
    model.technologyYears.get(techId).set(Number(row.year), parseNumber(row.extra_pct) ?? 0);
  });

  (tables.chip_types || []).forEach((row) => {
    const plant = model.plants.get(row.plant_id);
    if (!plant) {
      errors.push(`chip_type ${row.ttnr} referenziert unbekanntes plant_id ${row.plant_id}`);
      return;
    }
    const family = plant.families.get(row.family_id);
    if (!family) {
      errors.push(`chip_type ${row.ttnr} referenziert unbekannte family_id ${row.family_id}`);
      return;
    }
    plant.chipTypes.push({
      ttnr: row.ttnr,
      name: row.name || row.description || "",
      familyId: row.family_id,
      plantId: row.plant_id,
      dieArea: parseNumber(row.die_area_mm2) ?? 0,
      package: row.package || "",
      specialStartYear: parseNumber(row.special_start_year) ?? 0
    });
  });

  (tables.chip_type_tech || []).forEach((row) => {
    const ttnr = row.ttnr;
    const techId = row.tech_id || row.technology_id || row.id;
    if (!ttnr || !techId) {
      return;
    }
    const exists = findChipType(model, ttnr);
    if (!exists) {
      errors.push(`chip_type_tech referenziert unbekannte ttnr ${ttnr}`);
      return;
    }
    const tech = findTechnology(model, techId);
    if (!tech) {
      errors.push(`chip_type_tech referenziert unbekanntes tech_id ${techId}`);
      return;
    }
    if (!model.chipTypeTech.has(ttnr)) {
      model.chipTypeTech.set(ttnr, []);
    }
    model.chipTypeTech.get(ttnr).push(techId);
  });

  (tables.scenarios || []).forEach((row) => {
    model.scenarios.push({
      id: row.scenario_id || row.id,
      name: row.name,
      startYear: parseNumber(row.start_year),
      endYear: parseNumber(row.end_year),
      selectedYieldModelId: row.selected_yield_model_id || row.selectedCalculationModelId
    });
  });

  model.scenarios.forEach((scenario) => {
    if (!scenario.selectedYieldModelId) {
      return;
    }
    if (!model.yieldModels.has(scenario.selectedYieldModelId)) {
      errors.push(
        `scenarios selected_yield_model_id unbekannt: ${scenario.selectedYieldModelId}`
      );
    }
  });

  (tables.scenario_plants || []).forEach((row) => {
    const scenarioId = row.scenario_id;
    const plantId = row.plant_id;
    const overrideId = row.override_yield_model_id || null;
    const scenarioExists = model.scenarios.find((s) => s.id === scenarioId);
    if (!scenarioExists) {
      errors.push(`scenario_plants referenziert unbekanntes scenario_id ${scenarioId}`);
      return;
    }
    if (!model.plants.has(plantId)) {
      errors.push(`scenario_plants referenziert unbekanntes plant_id ${plantId}`);
      return;
    }
    if (overrideId && !model.yieldModels.has(overrideId)) {
      errors.push(`scenario_plants override_yield_model_id unbekannt: ${overrideId}`);
      return;
    }
    if (!model.scenarioPlants.has(scenarioId)) {
      model.scenarioPlants.set(scenarioId, []);
    }
    model.scenarioPlants.get(scenarioId).push({ plantId, overrideId });
  });

  return { model, errors, warnings };
}

function findTechnology(model, techId) {
  for (const plant of model.plants.values()) {
    if (plant.technologies.has(techId)) {
      return plant.technologies.get(techId);
    }
  }
  return null;
}

function findChipType(model, ttnr) {
  for (const plant of model.plants.values()) {
    const chip = plant.chipTypes.find((type) => type.ttnr === ttnr);
    if (chip) {
      return chip;
    }
  }
  return null;
}

function computeDefectDensity(family, yIdx) {
  const time = Math.max(0, yIdx - (family.t_start || 0));
  return (family.D0 || 0) + (family.D_in || 0) * Math.exp(-(family.t || 0) * time);
}

function computeFabYield(modelKey, D_year, A_cm2, params) {
  const registry = FAB_MODEL_REGISTRY[modelKey];
  if (!registry) {
    return 0;
  }
  const value = registry.compute({ D_year, A_cm2, params });
  return clamp01(value);
}

function buildFabBreakdown(modelKey, D_year, A_cm2, params) {
  const registry = FAB_MODEL_REGISTRY[modelKey];
  if (!registry) {
    return null;
  }
  const inputs = { D_year, A_cm2 };
  if (registry.needs.includes("alpha")) {
    inputs.alpha = params?.alpha ?? 3.0;
  }
  if (registry.needs.includes("n")) {
    inputs.n = params?.n ?? 1;
  }
  const result = computeFabYield(modelKey, D_year, A_cm2, params);
  const sqlSubstituted = substituteSql(registry.sql, inputs);
  return {
    modelKey,
    sqlTemplate: registry.sql,
    sqlSubstituted,
    inputs,
    result
  };
}

function getDynamicExtraPct(model, technology, year) {
  if (!technology.isDynamic) {
    return technology.staticExtraPct || 0;
  }
  const overrides = model.technologyYears.get(technology.id);
  if (!overrides || overrides.size === 0) {
    return technology.staticExtraPct || 0;
  }
  const candidates = Array.from(overrides.keys())
    .filter((y) => y <= year)
    .sort((a, b) => b - a);
  if (candidates.length === 0) {
    return technology.staticExtraPct || 0;
  }
  return overrides.get(candidates[0]) ?? technology.staticExtraPct ?? 0;
}

function computeResults({ scenario, plantsData, yieldModels, chipTypeTech, model }) {
  const results = [];
  const yearStart = scenario.startYear;
  const yearEnd = scenario.endYear;
  const years = [];
  for (let year = yearStart; year <= yearEnd; year += 1) {
    years.push(year);
  }

  plantsData.forEach((plant) => {
    const selectedModel = yieldModels.get(plant.overrideModelId || scenario.selectedYieldModelId);
    if (!selectedModel) {
      return;
    }
    plant.chipTypes.forEach((chip) => {
      years.forEach((year) => {
        if (chip.specialStartYear && year < chip.specialStartYear) {
          return;
        }
        const family = plant.families.get(chip.familyId);
        const yIdx = year - yearStart;
        const D_year = computeDefectDensity(family, yIdx);
        const A_cm2 = (chip.dieArea || 0) / 100;
        const fabYield = computeFabYield(selectedModel.id, D_year, A_cm2, selectedModel);
        const fabBreakdown = buildFabBreakdown(selectedModel.id, D_year, A_cm2, selectedModel);

        const baseYields = {};
        yieldFields.forEach((field) => {
          const base = field === "FAB" ? fabYield : (plant.baseYields[field] ?? 1);
          baseYields[field] = clamp01(base);
        });

        const techIds = chipTypeTech.get(chip.ttnr) || [];
        const techDetails = techIds.map((techId) => {
          const technology = plant.technologies.get(techId);
          if (!technology) {
            return null;
          }
          const extraPct = getDynamicExtraPct(model, technology, year);
          return { ...technology, extraPct };
        }).filter(Boolean);

        techDetails.forEach((tech) => {
          if (!baseYields[tech.targetField]) {
            return;
          }
          baseYields[tech.targetField] = clamp01(
            baseYields[tech.targetField] * (1 + (tech.extraPct || 0) / 100)
          );
        });

        const total = clamp01(
          yieldFields.reduce((product, field) => product * (baseYields[field] ?? 1), 1)
        );

        results.push({
          year,
          plantId: plant.id,
          plantName: plant.name,
          ttnr: chip.ttnr,
          name: chip.name,
          familyId: chip.familyId,
          package: chip.package,
          D_year,
          A_cm2,
          yields: baseYields,
          total,
          breakdowns: {
            FAB: fabBreakdown
          },
          techDetails,
          model: selectedModel
        });
      });
    });
  });

  return results;
}

function setImportStatus({ status, message, details }) {
  elements.importStatus.textContent = message;
  elements.importStatus.className = `status-pill ${status}`;
  elements.importDetails.innerHTML = details || "";
}

function updateImportSummary(summary) {
  if (!summary) {
    elements.importSummary.textContent = "Noch keine Import-Historie vorhanden.";
    return;
  }
  elements.importSummary.innerHTML = `Datei: <strong>${summary.fileName}</strong><br />Zeitpunkt: ${summary.timestamp}<br />Szenario: ${summary.scenario || "-"}`;
}

function renderDataOverview() {
  elements.dataOverview.innerHTML = "";
  Object.entries(state.tables).forEach(([name, rows]) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "data-card";
    card.innerHTML = `<strong>${name}</strong><span>${rows.length} Zeilen</span>`;
    card.addEventListener("click", () => renderTablePreview(name, rows));
    elements.dataOverview.appendChild(card);
  });
}

function renderTablePreview(name, rows) {
  if (!rows || rows.length === 0) {
    elements.tablePreview.innerHTML = `<p class="muted">Keine Daten für ${name}.</p>`;
    return;
  }
  const columns = Object.keys(rows[0]);
  const previewRows = rows.slice(0, 8);
  const table = document.createElement("table");
  table.className = "table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  const tbody = document.createElement("tbody");
  previewRows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = row[col] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  elements.tablePreview.innerHTML = "";
  elements.tablePreview.appendChild(table);
}

function updateScenarioUi() {
  const scenario = getSelectedScenario();
  if (!scenario) {
    return;
  }
  elements.scenarioName.value = scenario.name || "";
  elements.scenarioStart.value = scenario.startYear ?? "";
  elements.scenarioEnd.value = scenario.endYear ?? "";
  renderPlantSelect(scenario);
  renderYieldModels(scenario);
  updateFilters();
}

function renderScenarioOptions() {
  elements.scenarioSelect.innerHTML = "";
  state.model?.scenarios.forEach((scenario) => {
    const option = document.createElement("option");
    option.value = scenario.id;
    option.textContent = `${scenario.id} – ${scenario.name}`;
    elements.scenarioSelect.appendChild(option);
  });
  const initial = state.model?.scenarios[0];
  if (initial) {
    elements.scenarioSelect.value = initial.id;
  }
}

function renderYieldModels(scenario) {
  elements.modelSelect.innerHTML = "";
  if (!state.model) {
    return;
  }
  state.model.yieldModels.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    elements.modelSelect.appendChild(option);
  });
  elements.modelSelect.value = scenario.selectedYieldModelId || Array.from(state.model.yieldModels.keys())[0];
}

function renderModelSettings() {
  if (!elements.modelSettings) {
    return;
  }
  elements.modelSettings.innerHTML = "";
  if (!state.model) {
    elements.modelSettings.innerHTML = "<p class=\"muted\">Keine Modelle geladen.</p>";
    return;
  }

  state.model.yieldModels.forEach((model) => {
    const registry = FAB_MODEL_REGISTRY[model.id];
    const card = document.createElement("div");
    card.className = "card model-card";
    const alphaWarning = model.paramWarnings?.alpha && registry?.needs.includes("alpha");
    const nWarning = model.paramWarnings?.n && registry?.needs.includes("n");
    card.innerHTML = `
      <div class="model-header">
        <div>
          <h3>${model.name}</h3>
          <div class="muted">ID: ${model.id}</div>
        </div>
        <div class="badge">${registry?.label || model.id}</div>
      </div>
      <div class="model-grid">
        <div class="field">
          <label class="label">Layers</label>
          <input class="input" type="number" data-field="layers" value="${model.layers ?? ""}" />
        </div>
        <div class="field">
          <label class="label">n ${nWarning ? "<span class=\"badge badge-warn\">Default</span>" : ""}</label>
          <input class="input" type="number" data-field="n" value="${registry?.needs.includes("n") ? model.n ?? "" : ""}" ${registry?.needs.includes("n") ? "" : "disabled"} />
        </div>
        <div class="field">
          <label class="label">alpha ${alphaWarning ? "<span class=\"badge badge-warn\">Default</span>" : ""}</label>
          <input class="input" type="number" data-field="alpha" value="${registry?.needs.includes("alpha") ? model.alpha ?? "" : ""}" ${registry?.needs.includes("alpha") ? "" : "disabled"} />
        </div>
      </div>
      <div class="model-formula">
        <div class="label">Formel (SQL)</div>
        <pre class="sql-block">${registry?.sql || "-"}</pre>
      </div>
    `;
    const layersInput = card.querySelector("[data-field=\"layers\"]");
    const nInput = card.querySelector("[data-field=\"n\"]");
    const alphaInput = card.querySelector("[data-field=\"alpha\"]");

    layersInput?.addEventListener("change", (event) => {
      const value = Number(event.target.value);
      model.layers = Number.isFinite(value) && value > 0 ? value : 1;
      renderModelSettings();
    });

    nInput?.addEventListener("change", (event) => {
      if (!registry?.needs.includes("n")) {
        return;
      }
      const next = normalizeModelParam(event.target.value, 1);
      model.n = next.value;
      model.paramWarnings = { ...model.paramWarnings, n: next.warning };
      renderModelSettings();
      validateAndCompute();
    });

    alphaInput?.addEventListener("change", (event) => {
      if (!registry?.needs.includes("alpha")) {
        return;
      }
      const next = normalizeModelParam(event.target.value, 3.0);
      model.alpha = next.value;
      model.paramWarnings = { ...model.paramWarnings, alpha: next.warning };
      renderModelSettings();
      validateAndCompute();
    });

    elements.modelSettings.appendChild(card);
  });
}

function renderPlantSelect(scenario) {
  elements.plantSelect.innerHTML = "";
  if (!state.model) {
    return;
  }
  const scenarioPlants = state.model.scenarioPlants.get(scenario.id);
  const allowedPlantIds = scenarioPlants ? scenarioPlants.map((p) => p.plantId) : Array.from(state.model.plants.keys());

  allowedPlantIds.forEach((plantId) => {
    const plant = state.model.plants.get(plantId);
    if (!plant) {
      return;
    }
    const option = document.createElement("option");
    option.value = plant.id;
    option.textContent = plant.name;
    option.selected = true;
    elements.plantSelect.appendChild(option);
  });
}

function getSelectedScenario() {
  if (!state.model) {
    return null;
  }
  return state.model.scenarios.find((scenario) => scenario.id === elements.scenarioSelect.value) || state.model.scenarios[0];
}

function getSelectedPlants(scenario) {
  const selectedIds = Array.from(elements.plantSelect.selectedOptions).map((opt) => opt.value);
  const scenarioPlants = state.model.scenarioPlants.get(scenario.id) || [];
  return selectedIds.map((id) => {
    const plant = state.model.plants.get(id);
    const override = scenarioPlants.find((entry) => entry.plantId === id);
    return { ...plant, overrideModelId: override?.overrideId || null };
  });
}

function updateFilters() {
  const scenario = getSelectedScenario();
  if (!scenario || !state.model) {
    return;
  }
  const selectedPlants = getSelectedPlants(scenario);
  const families = new Set();
  selectedPlants.forEach((plant) => {
    plant.families.forEach((family) => families.add(family.id));
  });

  updateSelect(elements.filterPlant, ["", ...selectedPlants.map((plant) => plant.id)], state.ui.filters.plant, (id) => {
    if (!id) {
      return "Alle Werke";
    }
    return state.model.plants.get(id)?.name || id;
  });

  updateSelect(elements.filterFamily, ["", ...Array.from(families)], state.ui.filters.family, (id) => id || "Alle Families");

  const years = [];
  for (let year = scenario.startYear; year <= scenario.endYear; year += 1) {
    years.push(String(year));
  }
  updateSelect(elements.filterYear, ["", ...years], state.ui.filters.year, (id) => id || "Alle Jahre");
}

function updateSelect(select, values, currentValue, labelFn) {
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labelFn(value);
    if (currentValue === value) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function renderResults() {
  const tbody = elements.resultsTable.querySelector("tbody");
  tbody.innerHTML = "";
  const filtered = applyFilters(state.results);
  const sorted = applySort(filtered);
  sorted.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${row.ttnr}</td>
      <td>${row.name}</td>
      <td>${row.plantName}</td>
      <td>${row.familyId}</td>
      <td>${formatPct(row.yields.FAB)}</td>
      <td>${formatPct(row.yields.EPI)}</td>
      <td>${formatPct(row.yields.VM)}</td>
      <td>${formatPct(row.yields.SAW)}</td>
      <td>${formatPct(row.yields.KGD)}</td>
      <td>${formatPct(row.yields.OSAT)}</td>
      <td>${formatPct(row.yields.EPI_SHIP)}</td>
      <td><strong>${formatPct(row.total)}</strong></td>
    `;
    tr.addEventListener("click", () => openDetails(row));
    tbody.appendChild(tr);
  });
}

function applyFilters(rows) {
  const search = state.ui.filters.search.toLowerCase();
  return rows.filter((row) => {
    if (state.ui.filters.plant && row.plantId !== state.ui.filters.plant) {
      return false;
    }
    if (state.ui.filters.family && row.familyId !== state.ui.filters.family) {
      return false;
    }
    if (state.ui.filters.year && String(row.year) !== state.ui.filters.year) {
      return false;
    }
    if (search && !row.ttnr.toLowerCase().includes(search) && !row.name.toLowerCase().includes(search)) {
      return false;
    }
    return true;
  });
}

function applySort(rows) {
  const { key, direction } = state.ui.sort;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let aVal = a[key];
    let bVal = b[key];
    if (key === "fab") {
      aVal = a.yields.FAB;
      bVal = b.yields.FAB;
    }
    if (key === "total") {
      aVal = a.total;
      bVal = b.total;
    }
    if (key === "year") {
      aVal = a.year;
      bVal = b.year;
    }
    if (typeof aVal === "string") {
      return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return direction === "asc" ? aVal - bVal : bVal - aVal;
  });
  return sorted;
}

function formatPct(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${(value * 100).toFixed(2)}%`;
}

function openDetails(row) {
  state.ui.sidepanelOpen = true;
  saveUiSettings();
  elements.detailPanel.classList.toggle("open", true);
  const fabBreakdown = row.breakdowns?.FAB;
  const inputs = fabBreakdown?.inputs || {};
  const inputRows = Object.entries(inputs).map(
    ([key, value]) =>
      `<div class="detail-item"><strong>${key}</strong><span>${formatDecimal(value)}</span></div>`
  ).join("");
  elements.detailBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><strong>TTNR</strong><span>${row.ttnr}</span></div>
      <div class="detail-item"><strong>Plant</strong><span>${row.plantName}</span></div>
      <div class="detail-item"><strong>Family</strong><span>${row.familyId}</span></div>
      <div class="detail-item"><strong>Year</strong><span>${row.year}</span></div>
      <div class="detail-item"><strong>Field</strong><span>FAB</span></div>
      <div class="detail-item"><strong>Value</strong><span>${formatPct(row.yields.FAB)}</span></div>
      <div class="detail-item"><strong>Model</strong><span>${row.model?.name || row.model?.id || "-"}</span></div>
    </div>
    <h4>FAB Inputs</h4>
    <div class="detail-grid">
      ${inputRows || "<p class=\"muted\">Keine Inputs verfügbar.</p>"}
    </div>
    <h4>SQL-Formel</h4>
    <pre class="sql-block">${fabBreakdown?.sqlSubstituted || "-"}</pre>
    <h4>Station Yields</h4>
    <div class="detail-grid">
      ${yieldFields.map((field) => `<div class="detail-item"><strong>${field}</strong><span>${formatPct(row.yields[field])}</span></div>`).join("")}
    </div>
    <h4>Technologien</h4>
    <div class="detail-grid">
      ${row.techDetails.length === 0 ? "<p class=\"muted\">Keine Technologien.</p>" : row.techDetails.map((tech) => `
        <div class="detail-item"><strong>${tech.name}</strong><span>${tech.targetField} +${tech.extraPct}%</span></div>
      `).join("")}
    </div>
    <h4>Total</h4>
    <div class="badge">${formatPct(row.total)}</div>
  `;
  elements.sqlPreview.textContent = fabBreakdown?.sqlSubstituted || "";
}

function closeDetails() {
  state.ui.sidepanelOpen = false;
  saveUiSettings();
  elements.detailPanel.classList.toggle("open", false);
  elements.detailBody.innerHTML = "<p class=\"muted\">Wähle eine Zeile, um Details zu sehen.</p>";
  elements.sqlPreview.textContent = "";
}

function applyImport({ tables, fileName, fileMetaText }) {
  state.tables = tables;
  const { model, errors, warnings } = buildDataModel(tables);
  state.model = model;
  state.validation = { errors, warnings };
  renderScenarioOptions();
  updateScenarioUi();
  renderModelSettings();
  renderDataOverview();
  const firstTableName = Object.keys(tables)[0];
  if (firstTableName) {
    renderTablePreview(firstTableName, tables[firstTableName] || []);
  } else {
    elements.tablePreview.innerHTML = "<p class=\"muted\">Keine Tabellen gefunden.</p>";
  }
  updateValidationStatus();
  validateAndCompute();

  if (fileMetaText) {
    elements.fileMeta.textContent = fileMetaText;
  }

  const summary = {
    fileName,
    timestamp: new Date().toLocaleString("de-DE"),
    scenario: getSelectedScenario()?.id || ""
  };
  saveImportSummary(summary);
  updateImportSummary(summary);
}

async function loadDefaultXlsx() {
  try {
    setImportStatus({ status: "status-ok", message: "Standard-Datenbasis wird geladen…", details: "" });
    let response = await fetch("yield_data_basis.xlsx");
    let tables = null;
    let fileName = "yield_data_basis.xlsx";

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      tables = await parseXlsxArrayBuffer(arrayBuffer);
    } else {
      response = await fetch("yield_data_basis.csv");
      if (!response.ok) {
        throw new Error("Standard-Datei nicht gefunden.");
      }
      const text = await response.text();
      tables = parseCsvTextToTables(text);
      fileName = "yield_data_basis.csv";
    }

    const contentLength = response.headers.get("content-length");
    const sizeKb = contentLength ? Math.round(Number(contentLength) / 1024) : null;
    const sizeLabel = sizeKb ? `${sizeKb} KB` : "Größe unbekannt";
    applyImport({
      tables,
      fileName,
      fileMetaText: `Automatisch geladen: ${fileName} (${sizeLabel})`
    });
  } catch (error) {
    setImportStatus({
      status: "status-warn",
      message: "Automatischer Import fehlgeschlagen",
      details: `<p>${error.message}</p>`
    });
    elements.fileMeta.textContent = "Automatischer Import fehlgeschlagen.";
  }
}

function handleSortClick(event) {
  const key = event.target.getAttribute("data-sort");
  if (!key) {
    return;
  }
  if (state.ui.sort.key === key) {
    state.ui.sort.direction = state.ui.sort.direction === "asc" ? "desc" : "asc";
  } else {
    state.ui.sort.key = key;
    state.ui.sort.direction = "desc";
  }
  saveUiSettings();
  renderResults();
}

function handleTabChange(targetTab) {
  state.ui.activeTab = targetTab;
  saveUiSettings();
  elements.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${targetTab}`);
  });
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === targetTab);
  });
}

function validateAndCompute() {
  if (!state.model) {
    return;
  }
  if (state.validation.errors.length > 0) {
    elements.calcHint.textContent = "Berechnung gesperrt – Importfehler vorhanden.";
    return;
  }
  const scenario = getSelectedScenario();
  if (!scenario) {
    return;
  }
  scenario.startYear = Number(elements.scenarioStart.value) || scenario.startYear;
  scenario.endYear = Number(elements.scenarioEnd.value) || scenario.endYear;
  scenario.selectedYieldModelId = elements.modelSelect.value;
  if (!state.model.yieldModels.has(scenario.selectedYieldModelId)) {
    elements.calcHint.textContent = "Ungültiges Yield-Modell ausgewählt.";
    state.results = [];
    renderResults();
    return;
  }
  if (!FAB_MODEL_REGISTRY[scenario.selectedYieldModelId]) {
    elements.calcHint.textContent = "Yield-Modell nicht in der Registry vorhanden.";
    state.results = [];
    renderResults();
    return;
  }

  const selectedPlants = getSelectedPlants(scenario).filter(Boolean);
  if (selectedPlants.length === 0) {
    elements.calcHint.textContent = "Keine Werke ausgewählt.";
    state.results = [];
    renderResults();
    return;
  }

  state.results = computeResults({
    scenario,
    plantsData: selectedPlants,
    yieldModels: state.model.yieldModels,
    chipTypeTech: state.model.chipTypeTech,
    model: state.model
  });
  elements.calcHint.textContent = `${state.results.length} Zeilen berechnet.`;
  updateFilters();
  renderResults();
}

function updateValidationStatus() {
  if (state.validation.errors.length > 0) {
    const list = state.validation.errors.slice(0, 20).map((err) => `<li>${err}</li>`).join("");
    const more = state.validation.errors.length > 20 ? "<li>…</li>" : "";
    setImportStatus({
      status: "status-error",
      message: `Fehler (${state.validation.errors.length})`,
      details: `<ul>${list}${more}</ul>`
    });
  } else if (state.validation.warnings.length > 0) {
    const list = state.validation.warnings.slice(0, 20).map((warn) => `<li>${warn}</li>`).join("");
    const more = state.validation.warnings.length > 20 ? "<li>…</li>" : "";
    setImportStatus({
      status: "status-warn",
      message: `Warnungen (${state.validation.warnings.length})`,
      details: `<ul>${list}${more}</ul>`
    });
  } else {
    setImportStatus({ status: "status-ok", message: "Import OK", details: "" });
  }
}

function initEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => handleTabChange(tab.dataset.tab));
  });

  elements.xlsxInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    elements.fileMeta.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    try {
      setImportStatus({ status: "status-ok", message: "Import läuft…", details: "" });
      const extension = file.name.split(".").pop().toLowerCase();
      const tables = extension === "csv" ? await parseCsvToTables(file) : await parseXlsxToTables(file);
      applyImport({
        tables,
        fileName: file.name,
        fileMetaText: `${file.name} (${Math.round(file.size / 1024)} KB)`
      });
    } catch (error) {
      state.validation.errors = [error.message];
      updateValidationStatus();
    }
  });

  elements.scenarioSelect.addEventListener("change", () => {
    updateScenarioUi();
    validateAndCompute();
  });

  elements.modelSelect.addEventListener("change", validateAndCompute);
  elements.plantSelect.addEventListener("change", validateAndCompute);
  elements.scenarioStart.addEventListener("change", validateAndCompute);
  elements.scenarioEnd.addEventListener("change", validateAndCompute);
  elements.runCalc.addEventListener("click", validateAndCompute);

  elements.filterSearch.addEventListener("input", (event) => {
    state.ui.filters.search = event.target.value;
    saveUiSettings();
    renderResults();
  });

  elements.filterPlant.addEventListener("change", (event) => {
    state.ui.filters.plant = event.target.value;
    saveUiSettings();
    renderResults();
  });

  elements.filterFamily.addEventListener("change", (event) => {
    state.ui.filters.family = event.target.value;
    saveUiSettings();
    renderResults();
  });

  elements.filterYear.addEventListener("change", (event) => {
    state.ui.filters.year = event.target.value;
    saveUiSettings();
    renderResults();
  });

  elements.resultsTable.querySelector("thead").addEventListener("click", handleSortClick);

  elements.copySql.addEventListener("click", () => {
    if (!elements.sqlPreview.textContent) {
      return;
    }
    navigator.clipboard?.writeText(elements.sqlPreview.textContent);
  });

  elements.closePanel.addEventListener("click", closeDetails);

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 960 && state.ui.sidepanelOpen) {
      elements.detailPanel.classList.add("open");
    }
  });
}

function init() {
  loadUiSettings();
  const summary = loadImportSummary();
  updateImportSummary(summary);
  handleTabChange(state.ui.activeTab || "setup");
  elements.filterSearch.value = state.ui.filters.search;
  elements.filterPlant.value = state.ui.filters.plant;
  elements.filterFamily.value = state.ui.filters.family;
  elements.filterYear.value = state.ui.filters.year;
  initEvents();
  setImportStatus({ status: "status-ok", message: "Bereit – Standarddaten werden geladen.", details: "" });
  loadDefaultXlsx();
}

init();
