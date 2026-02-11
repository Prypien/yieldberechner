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
      schema_version: 2,
      created_at: now,
      updated_at: now
    },
    families: [], // [{ name: "28nm", description: "..." }]
    chip_types: [], // [{ ttnr: "...", name: "...", family: "28nm", ... }]
    vm_yield_models: [], // loaded from static/default if empty
    scenarios: [], // [{ name: "Base", start_year: 2025, end_year: 2030, ... }]
    scenario_family_params: [], // [{ scenario: "Base", family: "28nm", ... }]
    scenario_yields: [], // [{ scenario: "Base", year: 2025, ... }]
    technologies: [], // [{ name: "TechA", ... }]
    technology_yields: [] // [{ tech: "TechA", year: 1, yield: 0.99 }]
  };
}

async function readData() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    try {
      const seed = await fs.readFile(SEED_FILE, "utf-8");
      const json = JSON.parse(seed);
      await writeData(json, false);
      return json;
    } catch {
      return emptyData();
    }
  }
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
  if (!data || data.meta?.schema_version !== 1) {
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
