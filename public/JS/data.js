/**
 * data.js
 * -------
 * Dieses Modul kümmert sich NUR um Persistenz:
 * - loadData(): Lädt zuerst user_data vom Backend (/api/data),
 *              fallback auf base_data.json (Seed), falls Backend nicht erreichbar ist.
 * - saveData(data): Speichert den kompletten Datenstand über das Backend (/api/data).
 */

const API_URL = "/api/data";
const BASE_URL = "/base_data.json";

function assertSchema(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Data is not a JSON object.");
  }
  if (!data.meta || data.meta.schema_version !== 1) {
    throw new Error("Invalid or unsupported schema_version (expected meta.schema_version === 1).");
  }
  return data;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

export async function loadData() {
  // 1) Versuch: User-Daten vom Backend
  try {
    const data = await fetchJson(API_URL);
    return assertSchema(data);
  } catch (e) {
    // 2) Fallback: base_data.json aus public/
    const base = await fetchJson(BASE_URL);
    return assertSchema(base);
  }
}

export async function saveData(data) {
  assertSchema(data);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`Save failed: HTTP ${res.status}`);
  }
}

