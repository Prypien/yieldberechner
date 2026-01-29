const STORAGE_KEY = "yield-ui-settings";
const INPUT_DATA_KEY = "yield-input-data";
const INPUT_SUMMARY_KEY = "yield-input-summary";
const BASE_DATA_URL = "base_data.json";

const numericFields = new Set([
  "start_year",
  "end_year",
  "D0",
  "D_in",
  "t",
  "t_start",
  "t_end",
  "die_area_mm2",
  "static_extra_pct",
  "extra_pct",
  "base_yield",
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
  "scenario_year_yields"
];

const yieldFields = ["EPI", "FAB", "VM", "SAW", "KGD", "OSAT", "EPI_SHIP"];
const MAIN_YIELD_FIELDS = ["FAB", "EPI", "SAW", "KGD", "OSAT"];

const FAB_MODEL_REGISTRY = {
  YM_POI: {
    label: "Poisson",
    sql: "EXP(-D_year * A_cm2)",
    needs: [],
    compute: ({ D_year, A_cm2 }) => Math.exp(-D_year * A_cm2)
  },
  YM_MUR: {
    label: "Murphy",
    sql: "(1 - EXP(-D_year * A_cm2)) / NULLIF(D_year * A_cm2, 0)",
    needs: [],
    compute: ({ D_year, A_cm2 }) => {
      const x = D_year * A_cm2;
      return x === 0 ? 1 : (1 - Math.exp(-x)) / x;
    }
  },
  YM_SEEDS: {
    label: "Seeds",
    sql: "EXP(-SQRT(D_year * A_cm2))",
    needs: [],
    compute: ({ D_year, A_cm2 }) => Math.exp(-Math.sqrt(D_year * A_cm2))
  },
  YM_BOSE: {
    label: "Bose–Einstein",
    sql: "POWER(1 / (1 + D_year * A_cm2), n)",
    needs: ["n"],
    compute: ({ D_year, A_cm2, params }) => {
      const n = Number(params?.n ?? 1);
      return Math.pow(1 / (1 + D_year * A_cm2), n);
    }
  },
  YM_NEGBIN: {
    label: "Negative Binomial",
    sql: "POWER(1 + (D_year * A_cm2)/alpha, -alpha)",
    needs: ["alpha"],
    compute: ({ D_year, A_cm2, params }) => {
      const alpha = Number(params?.alpha ?? 3.0);
      return Math.pow(1 + (D_year * A_cm2) / alpha, -alpha);
    }
  }
};

const HARD_CODED_YIELD_MODELS = [
  { id: "YM_POI", name: "Poisson", alpha: 3.0, n: 1 },
  { id: "YM_MUR", name: "Murphy", alpha: 3.0, n: 1 },
  { id: "YM_SEEDS", name: "Seeds", alpha: 3.0, n: 1 },
  { id: "YM_BOSE", name: "Bose–Einstein", alpha: 3.0, n: 1 },
  { id: "YM_NEGBIN", name: "Negative Binomial", alpha: 3.0, n: 1 }
];

const DEFAULT_TABLES = {
  scenarios: [],
  scenario_plants: [],
  plants: [],
  plant_base_yields: [],
  families: [],
  chip_types: [],
  technologies: [],
  technology_years: [],
  chip_type_tech: [],
  scenario_year_yields: []
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
  scenario_year_yields: "scenario_year_yields",
  scenarioyields: "scenario_year_yields",
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
  reloadBaseDataButton: document.getElementById("reload-base-data"),
  scenarioIdInput: document.getElementById("scenario-id-input"),
  scenarioNameInput: document.getElementById("scenario-name-input"),
  scenarioStartInput: document.getElementById("scenario-start-input"),
  scenarioEndInput: document.getElementById("scenario-end-input"),
  scenarioModelInput: document.getElementById("scenario-model-input"),
  addScenarioButton: document.getElementById("add-scenario"),
  scenarioList: document.getElementById("scenario-list"),
  plantIdInput: document.getElementById("plant-id-input"),
  plantNameInput: document.getElementById("plant-name-input"),
  plantYieldEpi: document.getElementById("plant-yield-epi"),
  plantYieldVm: document.getElementById("plant-yield-vm"),
  plantYieldSaw: document.getElementById("plant-yield-saw"),
  plantYieldKgd: document.getElementById("plant-yield-kgd"),
  plantYieldOsat: document.getElementById("plant-yield-osat"),
  plantYieldEpiShip: document.getElementById("plant-yield-epi-ship"),
  addPlantButton: document.getElementById("add-plant"),
  plantList: document.getElementById("plant-list"),
  familyPlantSelect: document.getElementById("family-plant-select"),
  familySelect: document.getElementById("family-select"),
  familyDensityStart: document.getElementById("family-density-start"),
  familyDensityEnd: document.getElementById("family-density-end"),
  familyT0Input: document.getElementById("family-t0-input"),
  familyTEndInput: document.getElementById("family-tend-input"),
  saveFamilyButton: document.getElementById("save-family"),
  familyList: document.getElementById("family-list"),
  typePlantSelect: document.getElementById("type-plant-select"),
  typeFamilySelect: document.getElementById("type-family-select"),
  typeTtnrInput: document.getElementById("type-ttnr-input"),
  typeNameInput: document.getElementById("type-name-input"),
  typeAreaInput: document.getElementById("type-area-input"),
  typePackageInput: document.getElementById("type-package-input"),
  typeStartYearInput: document.getElementById("type-start-year-input"),
  addTypeButton: document.getElementById("add-type"),
  typeList: document.getElementById("type-list"),
  techScenarioSelect: document.getElementById("tech-scenario-select"),
  techPlantSelect: document.getElementById("tech-plant-select"),
  techIdInput: document.getElementById("tech-id-input"),
  techNameInput: document.getElementById("tech-name-input"),
  techTargetSelect: document.getElementById("tech-target-select"),
  techStaticInput: document.getElementById("tech-static-input"),
  techDynamicInput: document.getElementById("tech-dynamic-input"),
  addTechButton: document.getElementById("add-tech"),
  techList: document.getElementById("tech-list"),
  mapTypeSelect: document.getElementById("map-type-select"),
  mapTechSelect: document.getElementById("map-tech-select"),
  addMappingButton: document.getElementById("add-mapping"),
  mappingList: document.getElementById("mapping-list"),
  typesEditorTable: document.getElementById("types-editor-table"),
  typesSaveButton: document.getElementById("types-save"),
  typesResetButton: document.getElementById("types-reset"),
  typesEditorStatus: document.getElementById("types-editor-status"),
  scenarioSelect: document.getElementById("scenario-select"),
  scenarioName: document.getElementById("scenario-name"),
  scenarioStart: document.getElementById("scenario-start"),
  scenarioEnd: document.getElementById("scenario-end"),
  modelSelect: document.getElementById("model-select"),
  plantSelect: document.getElementById("plant-select"),
  scenarioYieldsTable: document.getElementById("scenario-yields-table"),
  scenarioYieldsSave: document.getElementById("scenario-yields-save"),
  scenarioYieldsReset: document.getElementById("scenario-yields-reset"),
  scenarioYieldsStatus: document.getElementById("scenario-yields-status"),
  runCalc: document.getElementById("run-calc"),
  calcHint: document.getElementById("calc-hint"),
  modelSettings: document.getElementById("model-settings"),
  techSettings: document.getElementById("tech-settings"),
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

function saveInputSummary(summary) {
  localStorage.setItem(INPUT_SUMMARY_KEY, JSON.stringify(summary));
}

function loadInputSummary() {
  const stored = localStorage.getItem(INPUT_SUMMARY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      return null;
    }
  }
  return null;
}

async function fetchBaseTables() {
  const response = await fetch(BASE_DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const parsed = await response.json();
  return { ...structuredClone(DEFAULT_TABLES), ...parsed };
}

function upsertByKey(existingRows, baseRows, keyFields, { preserveNonNull = true } = {}) {
  const makeKey = (row) => keyFields.map((key) => String(row[key] ?? "")).join("||");
  const map = new Map(existingRows.map((row) => [makeKey(row), { ...row }]));
  baseRows.forEach((baseRow) => {
    const key = makeKey(baseRow);
    if (!map.has(key)) {
      map.set(key, { ...baseRow });
      return;
    }
    const current = map.get(key);
    const merged = { ...current };
    Object.keys(baseRow).forEach((field) => {
      const curVal = current[field];
      const baseVal = baseRow[field];
      if (!preserveNonNull) {
        merged[field] = baseVal;
        return;
      }
      const hasCur = !(curVal === null || curVal === undefined || curVal === "");
      merged[field] = hasCur ? curVal : baseVal;
    });
    map.set(key, merged);
  });
  return Array.from(map.values());
}

function mergeBaseIntoTables(current, base) {
  const next = { ...structuredClone(DEFAULT_TABLES), ...current };
  next.plants = upsertByKey(next.plants || [], base.plants || [], ["plant_id"], { preserveNonNull: true });
  next.families = upsertByKey(next.families || [], base.families || [], ["plant_id", "family_id"], { preserveNonNull: true });

  const curTypes = next.chip_types || [];
  const baseTypes = base.chip_types || [];
  const makeTypeKey = (row) => {
    const trimmed = String(row.ttnr ?? "").trim();
    return trimmed || `NAME:${String(row.name ?? "").trim()}`;
  };
  const typeMap = new Map(curTypes.map((row) => [makeTypeKey(row), { ...row }]));
  baseTypes.forEach((baseRow) => {
    const key = makeTypeKey(baseRow);
    if (!typeMap.has(key)) {
      typeMap.set(key, { ...baseRow });
      return;
    }
    const currentRow = typeMap.get(key);
    const merged = { ...currentRow };
    Object.keys(baseRow).forEach((field) => {
      const curVal = currentRow[field];
      const baseVal = baseRow[field];
      const hasCur = !(curVal === null || curVal === undefined || curVal === "");
      merged[field] = hasCur ? curVal : baseVal;
    });
    typeMap.set(key, merged);
  });
  next.chip_types = Array.from(typeMap.values());

  next.technologies = upsertByKey(
    next.technologies || [],
    base.technologies || [],
    ["plant_id", "tech_id", "scenario_id"],
    { preserveNonNull: true }
  );
  next.technology_years = upsertByKey(
    next.technology_years || [],
    base.technology_years || [],
    ["tech_id", "year"],
    { preserveNonNull: true }
  );
  next.chip_type_tech = upsertByKey(
    next.chip_type_tech || [],
    base.chip_type_tech || [],
    ["ttnr", "tech_id"],
    { preserveNonNull: true }
  );

  next.scenarios = next.scenarios || [];
  next.scenario_plants = next.scenario_plants || [];
  next.plant_base_yields = next.plant_base_yields || [];

  return next;
}

async function loadInputTables() {
  const stored = localStorage.getItem(INPUT_DATA_KEY);
  let current = null;
  if (stored) {
    try {
      current = { ...structuredClone(DEFAULT_TABLES), ...JSON.parse(stored) };
    } catch (error) {
      console.warn("Failed to parse input tables", error);
    }
  }
  try {
    const base = await fetchBaseTables();
    if (current) {
      return mergeBaseIntoTables(current, base);
    }
    return base;
  } catch (error) {
    console.warn("Failed to load base_data.json", error);
    return current || structuredClone(DEFAULT_TABLES);
  }
}

function saveInputTables(tables) {
  localStorage.setItem(INPUT_DATA_KEY, JSON.stringify(tables));
}

function getWorkingTables() {
  return structuredClone(state.tables || DEFAULT_TABLES);
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

function cloneHardcodedYieldModels() {
  return HARD_CODED_YIELD_MODELS.map((model) => ({
    ...model,
    paramWarnings: { alpha: false, n: false }
  }));
}

function ensureTechnologyOverrides(model, techId) {
  if (!model.technologyYears.has(techId)) {
    model.technologyYears.set(techId, new Map());
  }
  return model.technologyYears.get(techId);
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

  cloneHardcodedYieldModels().forEach((row) => {
    const registry = FAB_MODEL_REGISTRY[row.id];
    if (!registry) {
      errors.push(`Hardcoded Modell nicht in Registry: ${row.id}`);
    }
    const alpha = normalizeModelParam(row.alpha, 3.0);
    const nValue = normalizeModelParam(row.n, 1);
    const paramWarnings = {
      alpha: alpha.warning,
      n: nValue.warning
    };
    model.yieldModels.set(row.id, {
      id: row.id,
      name: row.name || registry?.label || row.id,
      alpha: alpha.value,
      n: nValue.value,
      paramWarnings,
      sqlFormula: registry?.sql || ""
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
      t_start: parseNumber(row.t_start ?? row.t0) ?? 0,
      t_end: parseNumber(row.t_end ?? row.tEnd) ?? null,
      name: row.name || familyId
    });
  });

  (tables.technologies || []).forEach((row) => {
    const plantId = row.plant_id || row.plantId || row.plant;
    const plant = model.plants.get(plantId);
    if (!plant) {
      errors.push(`technology ${row.tech_id || row.id} referenziert unbekanntes plant_id ${plantId}`);
      return;
    }
    const techId = row.tech_id || row.technology_id || row.id;
    plant.technologies.set(techId, {
      id: techId,
      plantId,
      scenarioId: row.scenario_id || row.scenarioId || "",
      name: row.name || techId,
      targetField: row.target_field || row.targetField || "FAB",
      staticExtraPct: parseNumber(row.static_extra_pct ?? row.staticExtraPct) ?? 0,
      isDynamic: Boolean(parseNumber(row.is_dynamic ?? row.isDynamic)),
      description: row.description || ""
    });
  });

  (tables.technology_years || []).forEach((row) => {
    const techId = row.tech_id || row.technology_id || row.id;
    const year = parseNumber(row.year);
    if (!techId || !Number.isFinite(year)) {
      return;
    }
    const techOverrides = ensureTechnologyOverrides(model, techId);
    techOverrides.set(Number(year), parseNumber(row.extra_pct ?? row.extraPct) ?? 0);
  });

  (tables.chip_types || []).forEach((row) => {
    const familyId = row.family_id;
    const chipBase = {
      ttnr: row.ttnr,
      name: row.name || row.description || "",
      familyId,
      dieArea: parseNumber(row.die_area_mm2) ?? 0,
      package: row.package || "",
      specialStartYear: parseNumber(row.special_start_year) ?? 0
    };

    if (row.plant_id) {
      const plant = model.plants.get(row.plant_id);
      if (!plant) {
        errors.push(`chip_type ${row.ttnr} referenziert unbekanntes plant_id ${row.plant_id}`);
        return;
      }
      const family = plant.families.get(familyId);
      if (!family) {
        errors.push(`chip_type ${row.ttnr} referenziert unbekannte family_id ${familyId}`);
        return;
      }
      plant.chipTypes.push({ ...chipBase, plantId: row.plant_id });
      return;
    }

    let matched = false;
    model.plants.forEach((plant) => {
      const family = plant.families.get(familyId);
      if (!family) {
        return;
      }
      matched = true;
      plant.chipTypes.push({ ...chipBase, plantId: plant.id });
    });
    if (!matched) {
      errors.push(`chip_type ${row.ttnr || row.name} referenziert unbekannte family_id ${familyId}`);
    }
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
    model.chipTypeTech.get(ttnr).push({
      techId,
      scenarioId: row.scenario_id || row.scenarioId || ""
    });
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
  const start = Number(family.t_start ?? family.t0);
  const end = Number(family.t_end ?? family.tEnd);
  const d0 = Number(family.D0 ?? family.densityStart ?? 0);
  const dEnd = Number(family.D_in ?? family.densityEnd ?? 0);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    const clampedYear = Math.min(end, Math.max(start, start + yIdx));
    const ratio = (clampedYear - start) / (end - start);
    return d0 + (dEnd - d0) * ratio;
  }
  const time = Math.max(0, yIdx - (family.t_start || 0));
  return d0 + dEnd * Math.exp(-(family.t || 0) * time);
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
          let base;
          const override = getScenarioYieldValue(model.tables, scenario.id, year, field);
          if (override !== null && override !== undefined) {
            base = override;
          } else {
            base = field === "FAB" ? fabYield : (plant.baseYields[field] ?? 1);
          }
          baseYields[field] = clamp01(base);
        });

        const techMappings = chipTypeTech.get(chip.ttnr) || [];
        const techDetails = techMappings.map((mapping) => {
          const technology = plant.technologies.get(mapping.techId);
          if (!technology) {
            return null;
          }
          const scenarioId = mapping.scenarioId || technology.scenarioId || "";
          if (scenarioId && scenarioId !== scenario.id) {
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

function updateInputSummary(summary) {
  if (!summary) {
    elements.importSummary.textContent = "Noch keine Eingaben gespeichert.";
    return;
  }
  elements.importSummary.innerHTML = `Status: <strong>${summary.note || "Eingaben aktualisiert"}</strong><br />Zeitpunkt: ${summary.timestamp}<br />Szenario: ${summary.scenario || "-"}`;
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

function renderListTable(container, columns, rows, onDelete) {
  if (!container) {
    return;
  }
  if (!rows || rows.length === 0) {
    container.innerHTML = "<p class=\"muted\">Keine Einträge vorhanden.</p>";
    return;
  }
  const table = document.createElement("table");
  table.className = "table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    headRow.appendChild(th);
  });
  if (onDelete) {
    const th = document.createElement("th");
    th.textContent = "Aktion";
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = col.format ? col.format(row[col.key], row) : row[col.key] ?? "";
      tr.appendChild(td);
    });
    if (onDelete) {
      const td = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-secondary";
      button.textContent = "Löschen";
      button.addEventListener("click", () => onDelete(row));
      td.appendChild(button);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  container.innerHTML = "";
  container.appendChild(table);
}

function getTechOptionsForPlant(plantId) {
  if (!state.model) {
    return [];
  }
  const plant = state.model.plants.get(plantId);
  if (!plant) {
    return [];
  }
  return Array.from(plant.technologies.values()).map((tech) => ({ id: tech.id, name: tech.name }));
}

function getFamiliesForPlant(plantId) {
  if (!state.model) {
    return [];
  }
  const plant = state.model.plants.get(plantId);
  if (!plant) {
    return [];
  }
  return Array.from(plant.families.values()).map((family) => ({ id: family.id, name: family.name || family.id }));
}

function getMappedTechId(ttnr) {
  const row = (state.tables.chip_type_tech || []).find((entry) => entry.ttnr === ttnr);
  return row ? row.tech_id || row.id : "";
}

function setMappedTechId(ttnr, techId) {
  const tables = getWorkingTables();
  tables.chip_type_tech = tables.chip_type_tech || [];
  tables.chip_type_tech = tables.chip_type_tech.filter((entry) => entry.ttnr !== ttnr);
  if (techId) {
    tables.chip_type_tech.push({ ttnr, tech_id: techId });
  }
  applyTables({ tables, note: `Tech-Mapping aktualisiert: ${ttnr} → ${techId || "∅"}` });
}

function getScenarioYieldValue(tables, scenarioId, year, field) {
  const rows = tables.scenario_year_yields || [];
  const hit = rows.find(
    (row) =>
      String(row.scenario_id) === String(scenarioId) &&
      Number(row.year) === Number(year) &&
      String(row.field) === String(field)
  );
  if (!hit) {
    return null;
  }
  const value = parseNumber(hit.base_yield);
  return Number.isFinite(value) ? value : null;
}

function setScenarioYieldValue(tables, scenarioId, year, field, value) {
  tables.scenario_year_yields = tables.scenario_year_yields || [];
  tables.scenario_year_yields = tables.scenario_year_yields.filter(
    (row) =>
      !(
        String(row.scenario_id) === String(scenarioId) &&
        Number(row.year) === Number(year) &&
        String(row.field) === String(field)
      )
  );
  if (value === null || value === "" || !Number.isFinite(Number(value))) {
    return;
  }
  tables.scenario_year_yields.push({
    scenario_id: scenarioId,
    year: Number(year),
    field,
    base_yield: Number(value)
  });
}

function guessDefaultScenarioYields() {
  return 1.0;
}

function renderScenarioYieldsEditor() {
  const table = elements.scenarioYieldsTable;
  if (!table) {
    return;
  }

  const scenario = getSelectedScenario();
  if (!scenario || !Number.isFinite(scenario.startYear) || !Number.isFinite(scenario.endYear)) {
    table.querySelector("thead").innerHTML = "";
    table.querySelector("tbody").innerHTML = "";
    if (elements.scenarioYieldsStatus) {
      elements.scenarioYieldsStatus.textContent = "Bitte gültiges Szenario (Start/Endjahr) wählen.";
    }
    return;
  }

  const years = [];
  for (let year = scenario.startYear; year <= scenario.endYear; year += 1) {
    years.push(year);
  }

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = `
    <tr>
      <th>Jahr</th>
      ${MAIN_YIELD_FIELDS.map((field) => `<th>${field}</th>`).join("")}
    </tr>
  `;

  tbody.innerHTML = "";

  years.forEach((year) => {
    const tr = document.createElement("tr");
    tr.dataset.year = String(year);

    const cells = MAIN_YIELD_FIELDS.map((field) => {
      const stored = getScenarioYieldValue(state.tables, scenario.id, year, field);
      const value = stored ?? guessDefaultScenarioYields(field);
      return `
        <td>
          <input class="input" type="number" step="0.0001" data-field="${field}" value="${value}">
        </td>
      `;
    }).join("");

    tr.innerHTML = `<td><strong>${year}</strong></td>${cells}`;
    tbody.appendChild(tr);
  });

  if (elements.scenarioYieldsStatus) {
    elements.scenarioYieldsStatus.textContent = `Bearbeite ${years.length} Jahre. Speichern übernimmt die Werte für dieses Szenario.`;
  }
}

function saveScenarioYieldsEditorChanges() {
  const scenario = getSelectedScenario();
  if (!scenario) {
    return;
  }

  const table = elements.scenarioYieldsTable;
  if (!table) {
    return;
  }

  const tables = getWorkingTables();
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  rows.forEach((tr) => {
    const year = Number(tr.dataset.year);
    MAIN_YIELD_FIELDS.forEach((field) => {
      const raw = tr.querySelector(`[data-field="${field}"]`)?.value ?? "";
      const value = parseNumber(raw);
      setScenarioYieldValue(tables, scenario.id, year, field, value);
    });
  });

  applyTables({ tables, note: `Hauptyields gespeichert (${scenario.id})` });
}

function resetScenarioYieldsEditor() {
  renderScenarioYieldsEditor();
  if (elements.scenarioYieldsStatus) {
    elements.scenarioYieldsStatus.textContent = "Änderungen verworfen.";
  }
}

function renderTypesEditor() {
  const table = elements.typesEditorTable;
  if (!table || !state.model) {
    return;
  }
  const chipTypes = state.tables.chip_types || [];
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = `
    <tr>
      <th>TTNR</th>
      <th>Name</th>
      <th>Werk</th>
      <th>Family</th>
      <th>Die Area (mm²)</th>
      <th>Package</th>
      <th>Start Year</th>
      <th>Tech</th>
    </tr>
  `;

  tbody.innerHTML = "";

  chipTypes.forEach((row) => {
    const ttnr = row.ttnr;
    const plantId = row.plant_id || "";
    const families = getFamiliesForPlant(plantId);
    const techOptions = getTechOptionsForPlant(plantId);
    let mappedTech = getMappedTechId(ttnr);
    if (!mappedTech && techOptions.length > 0) {
      mappedTech = techOptions[0].id;
    }
    let familyId = (row.family_id ?? "").trim();
    if (!familyId && families.length > 0) {
      familyId = families[0].id;
    }

    const tr = document.createElement("tr");
    tr.dataset.ttnr = ttnr;

    const familyOptionsHtml = families
      .map(
        (family) =>
          `<option value="${family.id}" ${String(familyId) === String(family.id) ? "selected" : ""}>${family.id}</option>`
      )
      .join("");

    const techOptionsHtml = [`<option value="">–</option>`]
      .concat(
        techOptions.map(
          (tech) => `<option value="${tech.id}" ${tech.id === mappedTech ? "selected" : ""}>${tech.name} (${tech.id})</option>`
        )
      )
      .join("");

    tr.innerHTML = `
      <td><strong>${ttnr}</strong></td>
      <td><input class="input" data-field="name" value="${row.name ?? ""}"></td>
      <td><span class="muted">${plantId}</span></td>
      <td>
        <select class="input" data-field="family_id">
          ${familyOptionsHtml || `<option value="">(keine Families)</option>`}
        </select>
      </td>
      <td><input class="input" type="number" step="0.01" data-field="die_area_mm2" value="${row.die_area_mm2 ?? ""}"></td>
      <td><input class="input" data-field="package" value="${row.package ?? ""}"></td>
      <td><input class="input" type="number" data-field="special_start_year" value="${row.special_start_year ?? ""}"></td>
      <td>
        <select class="input" data-field="tech_id">
          ${techOptionsHtml}
        </select>
      </td>
    `;

    tbody.appendChild(tr);
  });

  if (elements.typesEditorStatus) {
    elements.typesEditorStatus.textContent = `${chipTypes.length} Typen geladen. Änderungen erst mit “Änderungen speichern” übernehmen.`;
  }
}

function saveTypesEditorChanges() {
  const table = elements.typesEditorTable;
  if (!table) {
    return;
  }
  const tables = getWorkingTables();
  const chipTypes = tables.chip_types || [];
  const rows = Array.from(table.querySelectorAll("tbody tr"));

  const nextChipTypes = chipTypes.map((original) => {
    const tr = rows.find((row) => row.dataset.ttnr === original.ttnr);
    if (!tr) {
      return original;
    }
    const getVal = (field) => tr.querySelector(`[data-field="${field}"]`)?.value ?? "";
    return {
      ...original,
      name: getVal("name").trim(),
      family_id: getVal("family_id").trim(),
      die_area_mm2: parseNumber(getVal("die_area_mm2")),
      package: getVal("package").trim(),
      special_start_year: parseNumber(getVal("special_start_year"))
    };
  });

  let nextMappings = (tables.chip_type_tech || []).slice();
  const allTtnr = new Set(nextChipTypes.map((row) => row.ttnr));
  nextMappings = nextMappings.filter((row) => !allTtnr.has(row.ttnr));

  rows.forEach((tr) => {
    const ttnr = tr.dataset.ttnr;
    const techId = tr.querySelector(`[data-field="tech_id"]`)?.value ?? "";
    if (techId) {
      nextMappings.push({ ttnr, tech_id: techId });
    }
  });

  tables.chip_types = nextChipTypes;
  tables.chip_type_tech = nextMappings;
  applyTables({ tables, note: "Typen tabellarisch aktualisiert" });
}

function resetTypesEditor() {
  renderTypesEditor();
  if (elements.typesEditorStatus) {
    elements.typesEditorStatus.textContent = "Änderungen verworfen (Anzeige neu aus state gerendert).";
  }
}

function refreshInputSelects() {
  if (!state.model) {
    return;
  }
  if (elements.scenarioModelInput) {
    updateSelect(
      elements.scenarioModelInput,
      Array.from(state.model.yieldModels.keys()),
      elements.scenarioModelInput.value,
      (id) => state.model.yieldModels.get(id)?.name || id
    );
    if (!elements.scenarioModelInput.value && state.model.yieldModels.size > 0) {
      elements.scenarioModelInput.value = Array.from(state.model.yieldModels.keys())[0];
    }
  }

  const plantIds = Array.from(state.model.plants.keys());
  if (elements.familyPlantSelect) {
    updateSelect(elements.familyPlantSelect, plantIds, elements.familyPlantSelect.value, (id) => id);
    if (!elements.familyPlantSelect.value && plantIds.length > 0) {
      elements.familyPlantSelect.value = plantIds[0];
    }
  }
  if (elements.typePlantSelect) {
    updateSelect(elements.typePlantSelect, plantIds, elements.typePlantSelect.value, (id) => id);
    if (!elements.typePlantSelect.value && plantIds.length > 0) {
      elements.typePlantSelect.value = plantIds[0];
    }
  }
  if (elements.techPlantSelect) {
    updateSelect(elements.techPlantSelect, plantIds, elements.techPlantSelect.value, (id) => id);
    if (!elements.techPlantSelect.value && plantIds.length > 0) {
      elements.techPlantSelect.value = plantIds[0];
    }
  }

  const scenarios = state.model.scenarios.map((scenario) => scenario.id);
  if (elements.techScenarioSelect) {
    updateSelect(elements.techScenarioSelect, ["", ...scenarios], elements.techScenarioSelect.value, (id) => {
      if (!id) {
        return "Global";
      }
      return id;
    });
  }

  if (elements.techTargetSelect) {
    updateSelect(elements.techTargetSelect, yieldFields, elements.techTargetSelect.value, (id) => id);
  }

  if (elements.familyPlantSelect && elements.familySelect) {
    const familyPlantId = elements.familyPlantSelect.value;
    const familyOptions = [];
    const familyPlant = state.model.plants.get(familyPlantId);
    if (familyPlant) {
      familyPlant.families.forEach((family) => familyOptions.push(family.id));
    }
    updateSelect(elements.familySelect, familyOptions, elements.familySelect.value, (id) => id);
    if (!elements.familySelect.value && familyOptions.length > 0) {
      elements.familySelect.value = familyOptions[0];
    }
  }

  if (elements.typePlantSelect && elements.typeFamilySelect) {
    const selectedPlant = elements.typePlantSelect.value;
    const families = [];
    state.model.plants.forEach((plant) => {
      if (selectedPlant && plant.id !== selectedPlant) {
        return;
      }
      plant.families.forEach((family) => families.push(family.id));
    });
    updateSelect(elements.typeFamilySelect, families, elements.typeFamilySelect.value, (id) => id);
  }

  if (elements.mapTypeSelect) {
    const chipTypes = new Set();
    state.model.plants.forEach((plant) => {
      plant.chipTypes.forEach((chip) => {
        if (chip.ttnr) {
          chipTypes.add(chip.ttnr);
        }
      });
    });
    updateSelect(elements.mapTypeSelect, Array.from(chipTypes), elements.mapTypeSelect.value, (id) => id);
  }

  if (elements.mapTechSelect) {
    const technologies = [];
    state.model.plants.forEach((plant) => {
      plant.technologies.forEach((tech) => {
        technologies.push({
          id: tech.id,
          label: `${tech.name} (${tech.id})${tech.scenarioId ? ` · ${tech.scenarioId}` : ""}`,
          scenarioId: tech.scenarioId || ""
        });
      });
    });
    elements.mapTechSelect.innerHTML = "";
    technologies.forEach((tech) => {
      const option = document.createElement("option");
      option.value = tech.id;
      option.textContent = tech.label;
      elements.mapTechSelect.appendChild(option);
    });
  }

  hydrateFamilyEditorFromSelection();
}

function renderInputLists() {
  refreshInputSelects();
  const tables = state.tables;

  renderListTable(
    elements.scenarioList,
    [
      { key: "scenario_id", label: "ID", format: (_, row) => row.scenario_id || row.id },
      { key: "name", label: "Name" },
      { key: "start_year", label: "t0" },
      { key: "end_year", label: "tEnd" },
      { key: "selected_yield_model_id", label: "Modell" }
    ],
    tables.scenarios || [],
    (row) => deleteScenario(row.scenario_id || row.id)
  );

  renderListTable(
    elements.plantList,
    [
      { key: "plant_id", label: "Werk-ID", format: (_, row) => row.plant_id || row.id },
      { key: "name", label: "Name" }
    ],
    tables.plants || [],
    (row) => deletePlant(row.plant_id || row.id)
  );

  renderListTable(
    elements.familyList,
    [
      { key: "family_id", label: "Family-ID", format: (_, row) => row.family_id || row.id },
      { key: "name", label: "Name" },
      { key: "plant_id", label: "Werk" },
      { key: "D0", label: "D0" },
      { key: "D_in", label: "D_in" },
      { key: "t_start", label: "t0" },
      { key: "t_end", label: "tEnd" }
    ],
    tables.families || [],
    (row) => deleteFamily(row.plant_id, row.family_id || row.id)
  );

  renderListTable(
    elements.typeList,
    [
      { key: "ttnr", label: "TTNR" },
      { key: "name", label: "Name" },
      { key: "plant_id", label: "Werk" },
      { key: "family_id", label: "Family" },
      { key: "die_area_mm2", label: "Fläche mm²" }
    ],
    tables.chip_types || [],
    (row) => deleteChipType(row.ttnr)
  );

  renderListTable(
    elements.techList,
    [
      { key: "tech_id", label: "Tech-ID", format: (_, row) => row.tech_id || row.id },
      { key: "name", label: "Name" },
      { key: "plant_id", label: "Werk" },
      { key: "scenario_id", label: "Szenario", format: (_, row) => row.scenario_id || "Global" },
      { key: "target_field", label: "Field" },
      { key: "static_extra_pct", label: "Extra %" },
      { key: "is_dynamic", label: "Dynamisch", format: (value) => (Number(value) ? "Ja" : "Nein") }
    ],
    tables.technologies || [],
    (row) => deleteTechnology(row.tech_id || row.id, row.plant_id)
  );

  renderListTable(
    elements.mappingList,
    [
      { key: "ttnr", label: "TTNR" },
      { key: "tech_id", label: "Tech-ID", format: (_, row) => row.tech_id || row.technology_id || row.id }
    ],
    tables.chip_type_tech || [],
    (row) => deleteMapping(row.ttnr, row.tech_id || row.technology_id || row.id)
  );
}

function addScenario() {
  const id = elements.scenarioIdInput.value.trim();
  if (!id) {
    return;
  }
  const tables = getWorkingTables();
  const modelId = elements.scenarioModelInput.value || Array.from(state.model?.yieldModels?.keys() || [])[0];
  const row = {
    scenario_id: id,
    name: elements.scenarioNameInput.value.trim() || id,
    start_year: parseNumber(elements.scenarioStartInput.value),
    end_year: parseNumber(elements.scenarioEndInput.value),
    selected_yield_model_id: modelId
  };
  const index = tables.scenarios.findIndex((scenario) => (scenario.scenario_id || scenario.id) === id);
  if (index >= 0) {
    tables.scenarios[index] = row;
  } else {
    tables.scenarios.push(row);
  }
  applyTables({ tables, note: `Szenario ${id} gespeichert` });
  elements.scenarioIdInput.value = "";
  elements.scenarioNameInput.value = "";
  elements.scenarioStartInput.value = "";
  elements.scenarioEndInput.value = "";
}

function addPlant() {
  const id = elements.plantIdInput.value.trim();
  if (!id) {
    return;
  }
  const tables = getWorkingTables();
  const plantRow = {
    plant_id: id,
    name: elements.plantNameInput.value.trim() || id
  };
  const index = tables.plants.findIndex((plant) => (plant.plant_id || plant.id) === id);
  if (index >= 0) {
    tables.plants[index] = plantRow;
  } else {
    tables.plants.push(plantRow);
  }

  const yieldValues = {
    EPI: parseNumber(elements.plantYieldEpi.value),
    VM: parseNumber(elements.plantYieldVm.value),
    SAW: parseNumber(elements.plantYieldSaw.value),
    KGD: parseNumber(elements.plantYieldKgd.value),
    OSAT: parseNumber(elements.plantYieldOsat.value),
    EPI_SHIP: parseNumber(elements.plantYieldEpiShip.value)
  };
  tables.plant_base_yields = tables.plant_base_yields.filter((row) => row.plant_id !== id);
  Object.entries(yieldValues).forEach(([field, value]) => {
    tables.plant_base_yields.push({
      plant_id: id,
      field,
      base_yield: Number.isFinite(value) ? value : 1
    });
  });

  applyTables({ tables, note: `Werk ${id} gespeichert` });
  elements.plantIdInput.value = "";
  elements.plantNameInput.value = "";
  elements.plantYieldEpi.value = "";
  elements.plantYieldVm.value = "";
  elements.plantYieldSaw.value = "";
  elements.plantYieldKgd.value = "";
  elements.plantYieldOsat.value = "";
  elements.plantYieldEpiShip.value = "";
}

function hydrateFamilyEditorFromSelection() {
  if (!elements.familyPlantSelect || !elements.familySelect) {
    return;
  }
  const plantId = elements.familyPlantSelect.value;
  const familyId = elements.familySelect.value;
  if (!plantId || !familyId) {
    elements.familyDensityStart.value = "";
    elements.familyDensityEnd.value = "";
    elements.familyT0Input.value = "";
    elements.familyTEndInput.value = "";
    return;
  }
  const row = (state.tables?.families || []).find(
    (family) => family.plant_id === plantId && (family.family_id || family.id) === familyId
  );
  if (!row) {
    elements.familyDensityStart.value = "";
    elements.familyDensityEnd.value = "";
    elements.familyT0Input.value = "";
    elements.familyTEndInput.value = "";
    return;
  }
  elements.familyDensityStart.value = row.D0 ?? "";
  elements.familyDensityEnd.value = row.D_in ?? "";
  elements.familyT0Input.value = row.t_start ?? row.t0 ?? "";
  elements.familyTEndInput.value = row.t_end ?? row.tEnd ?? "";
}

function saveFamilyEdits() {
  if (!elements.familyPlantSelect || !elements.familySelect) {
    return;
  }
  const plantId = elements.familyPlantSelect.value;
  const familyId = elements.familySelect.value;
  if (!plantId || !familyId) {
    return;
  }
  const tables = getWorkingTables();
  const index = tables.families.findIndex(
    (family) => family.plant_id === plantId && (family.family_id || family.id) === familyId
  );
  const existing = index >= 0 ? tables.families[index] : null;
  const row = {
    plant_id: plantId,
    family_id: familyId,
    name: existing?.name || familyId,
    D0: parseNumber(elements.familyDensityStart.value),
    D_in: parseNumber(elements.familyDensityEnd.value),
    t_start: parseNumber(elements.familyT0Input.value),
    t_end: parseNumber(elements.familyTEndInput.value)
  };
  if (index >= 0) {
    tables.families[index] = { ...existing, ...row };
  } else {
    tables.families.push(row);
  }
  applyTables({ tables, note: `Family ${familyId} gespeichert` });
}

function addChipType() {
  if (!elements.typePlantSelect || !elements.typeFamilySelect) {
    return;
  }
  const plantId = elements.typePlantSelect.value;
  const familyId = elements.typeFamilySelect.value;
  const ttnr = elements.typeTtnrInput.value.trim();
  if (!plantId || !familyId || !ttnr) {
    return;
  }
  const tables = getWorkingTables();
  const row = {
    plant_id: plantId,
    family_id: familyId,
    ttnr,
    name: elements.typeNameInput.value.trim() || ttnr,
    die_area_mm2: parseNumber(elements.typeAreaInput.value),
    package: elements.typePackageInput.value.trim(),
    special_start_year: parseNumber(elements.typeStartYearInput.value)
  };
  const index = tables.chip_types.findIndex((chip) => chip.ttnr === ttnr);
  if (index >= 0) {
    tables.chip_types[index] = row;
  } else {
    tables.chip_types.push(row);
  }
  applyTables({ tables, note: `Typ ${ttnr} gespeichert` });
  elements.typeTtnrInput.value = "";
  elements.typeNameInput.value = "";
  elements.typeAreaInput.value = "";
  elements.typePackageInput.value = "";
  elements.typeStartYearInput.value = "";
}

function addTechnology() {
  if (!elements.techPlantSelect) {
    return;
  }
  const plantId = elements.techPlantSelect.value;
  const techId = elements.techIdInput.value.trim();
  if (!plantId || !techId) {
    return;
  }
  const tables = getWorkingTables();
  const scenarioId = elements.techScenarioSelect.value;
  const row = {
    plant_id: plantId,
    tech_id: techId,
    scenario_id: scenarioId,
    name: elements.techNameInput.value.trim() || techId,
    target_field: elements.techTargetSelect.value,
    static_extra_pct: parseNumber(elements.techStaticInput.value) ?? 0,
    is_dynamic: elements.techDynamicInput.checked ? 1 : 0
  };
  const index = tables.technologies.findIndex(
    (tech) => (tech.tech_id || tech.id) === techId && tech.plant_id === plantId
  );
  if (index >= 0) {
    tables.technologies[index] = row;
  } else {
    tables.technologies.push(row);
  }
  applyTables({ tables, note: `Technologie ${techId} gespeichert` });
  elements.techIdInput.value = "";
  elements.techNameInput.value = "";
  elements.techStaticInput.value = "";
  elements.techDynamicInput.checked = false;
}

function addMapping() {
  if (!elements.mapTypeSelect || !elements.mapTechSelect) {
    return;
  }
  const ttnr = elements.mapTypeSelect.value;
  const techId = elements.mapTechSelect.value;
  if (!ttnr || !techId) {
    return;
  }
  const tables = getWorkingTables();
  const exists = tables.chip_type_tech.some((row) => row.ttnr === ttnr && (row.tech_id || row.id) === techId);
  if (!exists) {
    tables.chip_type_tech.push({ ttnr, tech_id: techId });
  }
  applyTables({ tables, note: `Zuordnung ${ttnr} → ${techId}` });
}

function deleteScenario(scenarioId) {
  const tables = getWorkingTables();
  tables.scenarios = tables.scenarios.filter((row) => (row.scenario_id || row.id) !== scenarioId);
  tables.scenario_plants = tables.scenario_plants.filter((row) => row.scenario_id !== scenarioId);
  const removedTechIds = tables.technologies
    .filter((row) => row.scenario_id === scenarioId)
    .map((row) => row.tech_id || row.id);
  tables.technologies = tables.technologies.filter((row) => row.scenario_id !== scenarioId);
  tables.technology_years = tables.technology_years.filter(
    (row) => !removedTechIds.includes(row.tech_id || row.technology_id || row.id)
  );
  tables.chip_type_tech = tables.chip_type_tech.filter(
    (row) => !removedTechIds.includes(row.tech_id || row.technology_id || row.id)
  );
  applyTables({ tables, note: `Szenario ${scenarioId} gelöscht` });
}

function deletePlant(plantId) {
  const tables = getWorkingTables();
  const removedTechIds = tables.technologies
    .filter((row) => row.plant_id === plantId)
    .map((row) => row.tech_id || row.id);
  tables.plants = tables.plants.filter((row) => (row.plant_id || row.id) !== plantId);
  tables.plant_base_yields = tables.plant_base_yields.filter((row) => row.plant_id !== plantId);
  tables.scenario_plants = tables.scenario_plants.filter((row) => row.plant_id !== plantId);
  tables.families = tables.families.filter((row) => row.plant_id !== plantId);
  tables.chip_types = tables.chip_types.filter((row) => row.plant_id !== plantId);
  tables.technologies = tables.technologies.filter((row) => row.plant_id !== plantId);
  tables.technology_years = tables.technology_years.filter(
    (row) => !removedTechIds.includes(row.tech_id || row.technology_id || row.id)
  );
  tables.chip_type_tech = tables.chip_type_tech.filter(
    (row) => !removedTechIds.includes(row.tech_id || row.technology_id || row.id)
  );
  applyTables({ tables, note: `Werk ${plantId} gelöscht` });
}

function deleteFamily(plantId, familyId) {
  const tables = getWorkingTables();
  tables.families = tables.families.filter(
    (row) => !(row.plant_id === plantId && (row.family_id || row.id) === familyId)
  );
  const removedTypes = tables.chip_types.filter((row) => row.family_id === familyId).map((row) => row.ttnr);
  tables.chip_types = tables.chip_types.filter((row) => row.family_id !== familyId);
  tables.chip_type_tech = tables.chip_type_tech.filter((row) => !removedTypes.includes(row.ttnr));
  applyTables({ tables, note: `Familie ${familyId} gelöscht` });
}

function deleteChipType(ttnr) {
  const tables = getWorkingTables();
  tables.chip_types = tables.chip_types.filter((row) => row.ttnr !== ttnr);
  tables.chip_type_tech = tables.chip_type_tech.filter((row) => row.ttnr !== ttnr);
  applyTables({ tables, note: `Typ ${ttnr} gelöscht` });
}

function deleteTechnology(techId, plantId) {
  const tables = getWorkingTables();
  tables.technologies = tables.technologies.filter(
    (row) => !((row.tech_id || row.id) === techId && row.plant_id === plantId)
  );
  tables.technology_years = tables.technology_years.filter(
    (row) => (row.tech_id || row.technology_id || row.id) !== techId
  );
  tables.chip_type_tech = tables.chip_type_tech.filter(
    (row) => (row.tech_id || row.technology_id || row.id) !== techId
  );
  applyTables({ tables, note: `Technologie ${techId} gelöscht` });
}

function deleteMapping(ttnr, techId) {
  const tables = getWorkingTables();
  tables.chip_type_tech = tables.chip_type_tech.filter(
    (row) => !(row.ttnr === ttnr && (row.tech_id || row.technology_id || row.id) === techId)
  );
  applyTables({ tables, note: `Zuordnung entfernt` });
}

function updateScenarioUi() {
  const scenario = getSelectedScenario();
  if (!scenario) {
    elements.scenarioName.value = "";
    elements.scenarioStart.value = "";
    elements.scenarioEnd.value = "";
    elements.plantSelect.innerHTML = "";
    elements.modelSelect.innerHTML = "";
    updateFilters();
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
  if (!state.model || state.model.scenarios.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Keine Szenarien";
    option.disabled = true;
    option.selected = true;
    elements.scenarioSelect.appendChild(option);
    return;
  }
  state.model.scenarios.forEach((scenario) => {
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
          <label class="label">Name</label>
          <input class="input" type="text" data-field="name" value="${model.name || ""}" />
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
    const nameInput = card.querySelector("[data-field=\"name\"]");
    const nInput = card.querySelector("[data-field=\"n\"]");
    const alphaInput = card.querySelector("[data-field=\"alpha\"]");

    nameInput?.addEventListener("change", (event) => {
      model.name = event.target.value;
      renderModelSettings();
      validateAndCompute();
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

function updateTechnologyInTables(tech, updates, note) {
  const tables = getWorkingTables();
  const index = tables.technologies.findIndex(
    (row) => (row.tech_id || row.id) === tech.id && row.plant_id === tech.plantId
  );
  const nextRow = {
    plant_id: tech.plantId,
    tech_id: tech.id,
    scenario_id: tech.scenarioId || "",
    name: tech.name,
    target_field: tech.targetField,
    static_extra_pct: tech.staticExtraPct,
    is_dynamic: tech.isDynamic ? 1 : 0,
    ...updates
  };
  if (index >= 0) {
    tables.technologies[index] = nextRow;
  } else {
    tables.technologies.push(nextRow);
  }
  applyTables({ tables, note: note || `Technologie ${tech.id} aktualisiert` });
}

function updateTechnologyOverridesInTables(techId, overrides, note) {
  const tables = getWorkingTables();
  tables.technology_years = tables.technology_years.filter(
    (row) => (row.tech_id || row.technology_id || row.id) !== techId
  );
  Array.from(overrides.entries()).forEach(([year, extra]) => {
    tables.technology_years.push({
      tech_id: techId,
      year,
      extra_pct: extra
    });
  });
  applyTables({ tables, note: note || `Tech-Overrides ${techId} aktualisiert` });
}

function renderTechnologySettings() {
  if (!elements.techSettings) {
    return;
  }
  elements.techSettings.innerHTML = "";
  if (!state.model) {
    elements.techSettings.innerHTML = "<p class=\"muted\">Keine Technologien geladen.</p>";
    return;
  }

  const technologies = [];
  state.model.plants.forEach((plant) => {
    plant.technologies.forEach((tech) => {
      technologies.push({ tech, plant });
    });
  });

  if (technologies.length === 0) {
    elements.techSettings.innerHTML = "<p class=\"muted\">Keine Technologien vorhanden.</p>";
    return;
  }

  technologies.forEach(({ tech, plant }) => {
    const card = document.createElement("div");
    card.className = "card tech-card";
    const overrides = ensureTechnologyOverrides(state.model, tech.id);
    const overrideRows = Array.from(overrides.entries())
      .sort((a, b) => a[0] - b[0])
      .map(
        ([year, extra]) => `
        <div class="tech-year-row">
          <input class="input" type="number" data-field="year" data-year="${year}" value="${year}" />
          <input class="input" type="number" step="0.01" data-field="extra" data-year="${year}" value="${extra}" />
          <button class="btn btn-secondary" type="button" data-action="remove-year" data-year="${year}">Entfernen</button>
        </div>
      `
      )
      .join("");

    card.innerHTML = `
      <div class="model-header">
        <div>
          <h3>${tech.name}</h3>
          <div class="muted">ID: ${tech.id} · Werk: ${plant.name || plant.id} · Szenario: ${tech.scenarioId || "Global"}</div>
        </div>
        <div class="badge">${tech.targetField}</div>
      </div>
      <div class="model-grid">
        <div class="field">
          <label class="label">Name</label>
          <input class="input" type="text" data-field="name" value="${tech.name || ""}" />
        </div>
        <div class="field">
          <label class="label">Yield-Stufe</label>
          <select class="input" data-field="targetField">
            ${yieldFields.map((field) => `<option value="${field}" ${field === tech.targetField ? "selected" : ""}>${field}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label class="label">Extra % (statisch)</label>
          <input class="input" type="number" step="0.01" data-field="staticExtraPct" value="${tech.staticExtraPct ?? 0}" />
        </div>
        <div class="field checkbox-field">
          <label class="label">Dynamisch</label>
          <label class="checkbox-label">
            <input type="checkbox" data-field="isDynamic" ${tech.isDynamic ? "checked" : ""} />
            Jahres-Overrides verwenden
          </label>
        </div>
      </div>
      <div class="tech-years">
        <div class="tech-years-header">
          <div class="label">Jahres-Overrides</div>
          <button class="btn btn-secondary" type="button" data-action="add-year">Jahr hinzufügen</button>
        </div>
        <div class="tech-year-list">
          ${overrideRows || "<p class=\"muted\">Keine Overrides definiert.</p>"}
        </div>
      </div>
    `;

    const nameInput = card.querySelector("[data-field=\"name\"]");
    const targetSelect = card.querySelector("[data-field=\"targetField\"]");
    const staticInput = card.querySelector("[data-field=\"staticExtraPct\"]");
    const dynamicToggle = card.querySelector("[data-field=\"isDynamic\"]");

    nameInput?.addEventListener("change", (event) => {
      updateTechnologyInTables(tech, { name: event.target.value });
    });

    targetSelect?.addEventListener("change", (event) => {
      updateTechnologyInTables(tech, { target_field: event.target.value });
    });

    staticInput?.addEventListener("change", (event) => {
      updateTechnologyInTables(tech, { static_extra_pct: parseNumber(event.target.value) ?? 0 });
    });

    dynamicToggle?.addEventListener("change", (event) => {
      updateTechnologyInTables(tech, { is_dynamic: event.target.checked ? 1 : 0 });
    });

    card.querySelectorAll("[data-field=\"extra\"]").forEach((input) => {
      input.addEventListener("change", (event) => {
        const year = Number(event.target.dataset.year);
        const value = parseNumber(event.target.value) ?? 0;
        overrides.set(year, value);
        updateTechnologyOverridesInTables(tech.id, overrides);
      });
    });

    card.querySelectorAll("[data-field=\"year\"]").forEach((input) => {
      input.addEventListener("change", (event) => {
        const prevYear = Number(event.target.dataset.year);
        const nextYear = Number(event.target.value);
        if (!Number.isFinite(nextYear)) {
          return;
        }
        const currentValue = overrides.get(prevYear) ?? 0;
        overrides.delete(prevYear);
        overrides.set(nextYear, currentValue);
        updateTechnologyOverridesInTables(tech.id, overrides);
      });
    });

    card.querySelectorAll("[data-action=\"remove-year\"]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const year = Number(event.target.dataset.year);
        overrides.delete(year);
        updateTechnologyOverridesInTables(tech.id, overrides);
      });
    });

    card.querySelector("[data-action=\"add-year\"]")?.addEventListener("click", () => {
      const years = Array.from(overrides.keys());
      const baseYear =
        (state.model?.scenarios?.[0]?.startYear && Number(state.model.scenarios[0].startYear)) ||
        new Date().getFullYear();
      const nextYear = years.length ? Math.max(...years) + 1 : baseYear;
      if (!overrides.has(nextYear)) {
        overrides.set(nextYear, tech.staticExtraPct ?? 0);
      }
      updateTechnologyOverridesInTables(tech.id, overrides);
    });

    elements.techSettings.appendChild(card);
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
  if (!Number.isFinite(scenario.startYear) || !Number.isFinite(scenario.endYear)) {
    updateSelect(elements.filterYear, [""], state.ui.filters.year, () => "Alle Jahre");
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
  if (!select) {
    return;
  }
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
    const ttnr = String(row.ttnr ?? "").toLowerCase();
    const name = String(row.name ?? "").toLowerCase();
    if (search && !ttnr.includes(search) && !name.includes(search)) {
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

function applyTables({ tables, note }) {
  state.tables = tables;
  saveInputTables(tables);
  const { model, errors, warnings } = buildDataModel(tables);
  state.model = model;
  state.validation = { errors, warnings };
  renderScenarioOptions();
  updateScenarioUi();
  renderModelSettings();
  renderTechnologySettings();
  renderDataOverview();
  renderInputLists();
  renderTypesEditor();
  renderScenarioYieldsEditor();
  const firstTableName = Object.keys(tables)[0];
  if (firstTableName) {
    renderTablePreview(firstTableName, tables[firstTableName] || []);
  } else {
    elements.tablePreview.innerHTML = "<p class=\"muted\">Keine Tabellen gefunden.</p>";
  }
  updateValidationStatus();
  validateAndCompute();

  const summary = {
    note: note || "Eingaben aktualisiert",
    timestamp: new Date().toLocaleString("de-DE"),
    scenario: getSelectedScenario()?.id || ""
  };
  saveInputSummary(summary);
  updateInputSummary(summary);
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
    elements.calcHint.textContent = "Berechnung gesperrt – Eingabefehler vorhanden.";
    return;
  }
  const scenario = getSelectedScenario();
  if (!scenario) {
    elements.calcHint.textContent = "Bitte zuerst ein Szenario anlegen.";
    state.results = [];
    renderResults();
    return;
  }
  const startInput = parseNumber(elements.scenarioStart.value);
  const endInput = parseNumber(elements.scenarioEnd.value);
  if (Number.isFinite(startInput)) {
    scenario.startYear = startInput;
  }
  if (Number.isFinite(endInput)) {
    scenario.endYear = endInput;
  }
  if (!Number.isFinite(scenario.startYear) || !Number.isFinite(scenario.endYear)) {
    elements.calcHint.textContent = "Start- oder Endjahr fehlt.";
    state.results = [];
    renderResults();
    return;
  }
  if (scenario.startYear > scenario.endYear) {
    elements.calcHint.textContent = "Startjahr muss vor Endjahr liegen.";
    state.results = [];
    renderResults();
    return;
  }
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
    setImportStatus({ status: "status-ok", message: "Eingaben OK", details: "" });
  }
}

function initEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => handleTabChange(tab.dataset.tab));
  });

  elements.addScenarioButton?.addEventListener("click", addScenario);
  elements.addPlantButton?.addEventListener("click", addPlant);
  elements.saveFamilyButton?.addEventListener("click", saveFamilyEdits);
  elements.addTypeButton?.addEventListener("click", addChipType);
  elements.addTechButton?.addEventListener("click", addTechnology);
  elements.addMappingButton?.addEventListener("click", addMapping);
  elements.typesSaveButton?.addEventListener("click", saveTypesEditorChanges);
  elements.typesResetButton?.addEventListener("click", resetTypesEditor);
  elements.scenarioYieldsSave?.addEventListener("click", saveScenarioYieldsEditorChanges);
  elements.scenarioYieldsReset?.addEventListener("click", resetScenarioYieldsEditor);
  elements.reloadBaseDataButton?.addEventListener("click", async () => {
    setImportStatus({ status: "status-ok", message: "Lade base_data.json…", details: "" });
    try {
      const base = await fetchBaseTables();
      const current = getWorkingTables();
      const merged = mergeBaseIntoTables(current, base);
      applyTables({ tables: merged, note: "Base-Daten aktualisiert (merge)" });
    } catch (error) {
      console.warn(error);
      setImportStatus({
        status: "status-error",
        message: "Base-Daten konnten nicht geladen werden",
        details: `<div class="muted">${String(error)}</div>`
      });
    }
  });

  elements.familyPlantSelect?.addEventListener("change", () => {
    refreshInputSelects();
    hydrateFamilyEditorFromSelection();
  });
  elements.familySelect?.addEventListener("change", hydrateFamilyEditorFromSelection);
  elements.typePlantSelect?.addEventListener("change", refreshInputSelects);

  elements.scenarioSelect.addEventListener("change", () => {
    updateScenarioUi();
    renderScenarioYieldsEditor();
    validateAndCompute();
  });

  elements.modelSelect.addEventListener("change", validateAndCompute);
  elements.plantSelect.addEventListener("change", validateAndCompute);
  elements.scenarioStart.addEventListener("change", () => {
    renderScenarioYieldsEditor();
    validateAndCompute();
  });
  elements.scenarioEnd.addEventListener("change", () => {
    renderScenarioYieldsEditor();
    validateAndCompute();
  });
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

async function init() {
  loadUiSettings();
  const summary = loadInputSummary();
  updateInputSummary(summary);
  handleTabChange(state.ui.activeTab || "setup");
  elements.filterSearch.value = state.ui.filters.search;
  elements.filterPlant.value = state.ui.filters.plant;
  elements.filterFamily.value = state.ui.filters.family;
  elements.filterYear.value = state.ui.filters.year;
  initEvents();
  setImportStatus({ status: "status-ok", message: "Bereit – Eingaben werden geladen.", details: "" });
  const tables = await loadInputTables();
  applyTables({ tables, note: "Eingaben geladen" });
}

init();
