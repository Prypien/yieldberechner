/**
 * Minimal Backend für den Yield-Berechner
 *
 * - Liefert das Frontend aus /public
 * - GET  /api/data  -> lädt die gespeicherten Daten (JSON)
 * - POST /api/data  -> speichert die kompletten Daten atomar
 */

import express from "express";
import path from "path";
import fs from "fs/promises";

const app = express();
const PORT = process.env.PORT || 3000;
const SCHEMA_VERSION = 2;

const ROOT = path.resolve();
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "user_data.json");
const SEED_FILE = path.join(PUBLIC_DIR, "base_data.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(PUBLIC_DIR));

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function emptyData() {
  const now = new Date().toISOString();
  return {
    meta: {
      schema_version: SCHEMA_VERSION,
      created_at: now,
      updated_at: now
    },
    families: [], // [{ name: "28nm", description: "..." }]
    chip_types: [], // [{ ttnr: "...", name: "...", family: "28nm", ... }]
    vm_yield_models: [], // loaded from static/default if empty
    scenarios: [], // [{ name: "Base", start_year: 2025, end_year: 2030, ... }]
    scenario_family_params: [], // [{ scenario: "Base", family: "28nm", ... }]
    scenario_yields: [], // [{ scenario: "Base", year: 2025, ... }]
    technologies: [], // [{ tech_id: "TechA", name: "...", ... }]
    technology_yields: [] // [{ tech_id: "TechA", year: 1, yield: 0.99 }]
  };
}

function isSchemaVersion(data, version) {
  return Boolean(data && data.meta && data.meta.schema_version === version);
}

function makeUniqueName(base, used, fallback) {
  const clean = String(base || "").trim() || fallback;
  let candidate = clean;
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${clean} ${i}`;
    i += 1;
  }
  used.add(candidate);
  return candidate;
}

function migrateV1ToV2(data) {
  if (!isSchemaVersion(data, 1)) return null;

  const families = Array.isArray(data.families) ? data.families : [];
  const usedFamilies = new Set();
  const familyIdToName = new Map();
  const nextFamilies = families.map((family) => {
    const name = makeUniqueName(family.name || family.family_id, usedFamilies, "Family");
    if (family.family_id) familyIdToName.set(family.family_id, name);
    return {
      name,
      description: family.description || ""
    };
  });

  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const usedScenarios = new Set();
  const scenarioIdToName = new Map();
  const nextScenarios = scenarios.map((scenario) => {
    const name = makeUniqueName(scenario.name || scenario.scenario_id, usedScenarios, "Szenario");
    if (scenario.scenario_id) scenarioIdToName.set(scenario.scenario_id, name);
    return {
      name,
      start_year: scenario.start_year ?? null,
      end_year: scenario.end_year ?? null,
      selected_vm_yield_model_id: scenario.selected_vm_yield_model_id || ""
    };
  });

  const mapScenario = (value) => {
    if (!value) return "";
    return scenarioIdToName.get(value) || value;
  };

  const mapFamily = (value) => {
    if (!value) return "";
    return familyIdToName.get(value) || value;
  };

  const nextFamilyParams = (data.scenario_family_params || []).map((row) => ({
    scenario: mapScenario(row.scenario_id || row.scenario),
    family: mapFamily(row.family_id || row.family),
    D0: row.D0 ?? null,
    D_in: row.D_in ?? null,
    t: row.t ?? null,
    t_start: row.t_start ?? null,
    t_end: row.t_end ?? null
  }));

  const nextScenarioYields = (data.scenario_yields || []).map((row) => ({
    scenario: mapScenario(row.scenario_id || row.scenario),
    year: row.year ?? null,
    FAB: row.FAB ?? null,
    EPI: row.EPI ?? null,
    SAW: row.SAW ?? null,
    KGD: row.KGD ?? null,
    OSAT: row.OSAT ?? null
  }));

  const nextChipTypes = (data.chip_types || []).map((chip) => ({
    ttnr: chip.ttnr || "",
    name: chip.name || "",
    family: mapFamily(chip.family_id || chip.family),
    die_area_mm2: chip.die_area_mm2 ?? null,
    package: chip.package || "",
    special_start_year: chip.special_start_year ?? null,
    technologies: Array.isArray(chip.technologies) ? chip.technologies : []
  }));

  const meta = {
    ...(data.meta || {}),
    schema_version: SCHEMA_VERSION,
    migrated_from: 1
  };

  return {
    meta,
    families: nextFamilies,
    chip_types: nextChipTypes,
    vm_yield_models: Array.isArray(data.vm_yield_models) ? data.vm_yield_models : [],
    scenarios: nextScenarios,
    scenario_family_params: nextFamilyParams,
    scenario_yields: nextScenarioYields,
    technologies: Array.isArray(data.technologies) ? data.technologies : [],
    technology_yields: Array.isArray(data.technology_yields) ? data.technology_yields : []
  };
}

async function loadSeedData() {
  try {
    const seed = await fs.readFile(SEED_FILE, "utf-8");
    const json = JSON.parse(seed);
    if (isSchemaVersion(json, SCHEMA_VERSION)) return json;
    const migrated = migrateV1ToV2(json);
    if (migrated) return migrated;
  } catch {}
  return emptyData();
}

async function readData() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (isSchemaVersion(parsed, SCHEMA_VERSION)) return parsed;

    const migrated = migrateV1ToV2(parsed);
    if (migrated) {
      await writeData(migrated, true);
      return migrated;
    }
  } catch {
    // Fallthrough to seed below
  }

  const seedData = await loadSeedData();
  await writeData(seedData, true);
  return seedData;
}

async function writeData(data, backup = true) {
  await ensureDataDir();

  if (backup) {
    try {
      const old = await fs.readFile(DATA_FILE, "utf-8");
      await fs.writeFile(DATA_FILE + ".bak", old, "utf-8");
    } catch {}
  }

  const tmp = DATA_FILE + ".tmp";
  data.meta = data.meta || {};
  data.meta.updated_at = new Date().toISOString();

  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, DATA_FILE);
}

/* Daten laden */
app.get("/api/data", async (req, res) => {
  try {
    res.json(await readData());
  } catch (e) {
    res.status(500).json({ error: "Load failed", detail: String(e) });
  }
});

/* Daten speichern */
app.post("/api/data", async (req, res) => {
  const data = req.body;
  if (!data || data.meta?.schema_version !== SCHEMA_VERSION) {
    return res.status(400).json({ error: "Invalid schema" });
  }

  try {
    await writeData(data, true);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Save failed", detail: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
