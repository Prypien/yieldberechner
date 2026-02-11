/**
 * calc.js
 * -------
 * Dieses Modul enthält NUR die Rechenlogik (pure functions):
 * - computeResults(data, scenarioName): baut die Ergebnis-Zeilen für die Output-Tabelle
 * - VM Yield über vm_yield_models (Poisson/Murphy/Seeds/Bose/NegBin)
 * - Defektdichte D(yearIndex) über scenario_family_params (relativ: yearIndex = 1..N)
 * - Station-Yields (FAB/EPI/SAW/KGD/OSAT) aus scenario_yields pro Kalenderjahr
 * - Technologien pro Chip (chip_types[].technologies) wirken als Multiplikator auf target_field
 *   dynamisch über technology_yields (relativ), sonst static_yield
 */

const YIELD_FIELDS = ["FAB", "EPI", "SAW", "KGD", "OSAT", "VM"];
const STATION_FIELDS = ["FAB", "EPI", "SAW", "KGD", "OSAT"];

const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
};

function buildIndex(data) {
  const scenariosByName = new Map((data.scenarios || []).map((s) => [s.name, s]));
  const familiesByScenarioFamily = new Map(
    (data.scenario_family_params || []).map((fp) => [`${fp.scenario}||${fp.family}`, fp])
  );
  const scenarioYieldsByScenarioYear = new Map(
    (data.scenario_yields || []).map((r) => [`${r.scenario}||${Number(r.year)}`, r])
  );
  const techById = new Map((data.technologies || []).map((t) => [t.tech_id, t]));
  const modelById = new Map((data.vm_yield_models || []).map((m) => [m.id, m]));

  const techYieldRowsByTech = new Map();
  for (const row of data.technology_yields || []) {
    const techId = row.tech_id;
    const year = Number(row.year);
    const y = Number(row.yield);
    if (!techId || !Number.isFinite(year) || !Number.isFinite(y)) continue;
    if (!techYieldRowsByTech.has(techId)) techYieldRowsByTech.set(techId, []);
    techYieldRowsByTech.get(techId).push({ year, yield: y });
  }
  // sort for fallback "last <= year"
  for (const rows of techYieldRowsByTech.values()) {
    rows.sort((a, b) => a.year - b.year);
  }

  return {
    scenariosByName,
    familiesByScenarioFamily,
    scenarioYieldsByScenarioYear,
    techById,
    modelById,
    techYieldRowsByTech
  };
}

function getScenario(index, data, scenarioName) {
  if (scenarioName && index.scenariosByName.has(scenarioName)) {
    return index.scenariosByName.get(scenarioName);
  }
  return (data.scenarios || [])[0] || null;
}

function getScenarioFamilyParams(index, scenarioName, familyName) {
  return index.familiesByScenarioFamily.get(`${scenarioName}||${familyName}`) || null;
}

function getScenarioStationYields(index, scenarioName, calendarYear) {
  return index.scenarioYieldsByScenarioYear.get(`${scenarioName}||${Number(calendarYear)}`) || null;
}

/**
 * Defektdichte pro relativem JahrIndex (1..N)
 * - Wenn t_end > t_start: linear von D0 nach D_in zwischen t_start..t_end (relativ)
 * - sonst exponentielle Annäherung ab t_start: D = D0 + D_in * exp(-t * (yearIndex - t_start))
 */
export function computeDefectDensity(fp, yearIndex) {
  const D0 = Number(fp.D0 ?? 0);
  const Din = Number(fp.D_in ?? 0);
  const t = Number(fp.t ?? 0);

  const tStart = Number(fp.t_start ?? 0);
  const tEnd = Number(fp.t_end ?? 0);

  if (Number.isFinite(tStart) && Number.isFinite(tEnd) && tEnd > tStart) {
    const y = Math.max(tStart, Math.min(tEnd, yearIndex));
    const ratio = (y - tStart) / (tEnd - tStart);
    return D0 + (Din - D0) * ratio;
  }

  const time = Math.max(0, yearIndex - tStart);
  return D0 + Din * Math.exp(-t * time);
}

/**
 * VM Yield Model (VM = f(D * A))
 * D = Defektdichte im jeweiligen Jahr
 * A = Chipfläche in cm²
 */
export function computeVmYield(model, D, A_cm2) {
  const id = model?.id;
  const x = Number(D) * Number(A_cm2);
  if (!Number.isFinite(x)) return 0;

  const alpha = Number(model?.params?.alpha ?? 3.0);
  const n = Number(model?.params?.n ?? 1);

  switch (id) {
    case "YM_POI":
      return Math.exp(-x);

    case "YM_MUR":
      return x === 0 ? 1 : (1 - Math.exp(-x)) / x;

    case "YM_SEEDS":
      return Math.exp(-Math.sqrt(x));

    case "YM_BOSE":
      return Math.pow(1 / (1 + x), Number.isFinite(n) ? n : 1);

    case "YM_NEGBIN": {
      const a = Number.isFinite(alpha) && alpha > 0 ? alpha : 3.0;
      return Math.pow(1 + x / a, -a);
    }

    default:
      return 0;
  }
}

/**
 * Technologie-Faktor als Multiplikator (z.B. 0.99)
 * - is_dynamic == 0 => static_yield
 * - is_dynamic == 1 => technology_yields: exact relYear, sonst letzter <= relYear, sonst static_yield, sonst 1
 */
export function getTechnologyFactor(index, tech, relYear) {
  if (!tech) return 1;

  const isDynamic = Boolean(Number(tech.is_dynamic));
  if (!isDynamic) {
    return clamp01(tech.static_yield ?? 1);
  }

  const rows = index.techYieldRowsByTech.get(tech.tech_id) || [];
  const y = Number(relYear);

  // exact
  const exact = rows.find((r) => r.year === y);
  if (exact) return clamp01(exact.yield);

  // last <=
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].year <= y) return clamp01(rows[i].yield);
  }

  return clamp01(tech.static_yield ?? 1);
}

/**
 * Ergebnisberechnung: erzeugt Zeilen für die Ergebnis-Tabelle
 * Output-Zeile enthält:
 * - calendar year, yearIndex (relativ 1..N), chip, yields, total, VM inputs (optional)
 */
export function computeResults(data, scenarioName, modelIdOverride = "") {
  const index = buildIndex(data);

  const scenario = getScenario(index, data, scenarioName);
  if (!scenario) return [];

  const startYear = Number(scenario.start_year);
  const endYear = Number(scenario.end_year);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || startYear > endYear) return [];

  const modelId = modelIdOverride || scenario.selected_vm_yield_model_id;
  const model =
    index.modelById.get(modelId) ||
    index.modelById.get(scenario.selected_vm_yield_model_id);
  if (!model) return []; // oder throw new Error(...) – je nachdem wie streng du sein willst

  const out = [];

  for (const chip of data.chip_types || []) {
    const familyName = chip.family;
    if (!familyName) continue;

    const fp = getScenarioFamilyParams(index, scenario.name, familyName);
    if (!fp) continue;

    const dieAreaMm2 = Number(chip.die_area_mm2 ?? 0);
    const A_cm2 = dieAreaMm2 / 100; // wie in deinem bisherigen Code: mm² -> cm²

    for (let year = startYear; year <= endYear; year += 1) {
      // yearIndex: relativ (1..N) innerhalb des Szenarios
      const yearIndex = (year - startYear) + 1;

      // Special start year (Kalenderjahr): Chip existiert erst ab dann
      const specialStart = Number(chip.special_start_year ?? NaN);
      if (Number.isFinite(specialStart) && year < specialStart) continue;

      // Station-Yields pro Kalenderjahr (wenn fehlt: default 1)
      const sy = getScenarioStationYields(index, scenario.name, year) || {};
      const baseYields = {
        FAB: clamp01(sy.FAB ?? 1),
        EPI: clamp01(sy.EPI ?? 1),
        SAW: clamp01(sy.SAW ?? 1),
        KGD: clamp01(sy.KGD ?? 1),
        OSAT: clamp01(sy.OSAT ?? 1)
      };
      const yields = {
        ...baseYields,
        VM: 1
      };

      // VM
      const D = computeDefectDensity(fp, yearIndex);
      const VM = clamp01(computeVmYield(model, D, A_cm2));
      yields.VM = VM;

      // Technologien (relatives JahrIndex als Tech-Index)
      const techIds = Array.isArray(chip.technologies) ? chip.technologies : [];
      const appliedTech = [];

      for (const techId of techIds) {
        const tech = index.techById.get(techId);
        if (!tech) continue;

        const target = tech.target_field;
        if (!STATION_FIELDS.includes(target)) continue;

        const factor = getTechnologyFactor(index, tech, yearIndex);
        yields[target] = clamp01(yields[target] * factor);

        appliedTech.push({
          tech_id: tech.tech_id,
          name: tech.name,
          target_field: target,
          factor
        });
      }

      // Total = Produkt aller Yield-Felder (inkl. VM)
      const total = clamp01(YIELD_FIELDS.reduce((p, f) => p * (yields[f] ?? 1), 1));

      out.push({
        scenario: scenario.name,
        year,       // Kalenderjahr für Anzeige
        yearIndex,  // relativ für Debug/Details
        ttnr: chip.ttnr,
        name: chip.name,
        family: familyName,
        die_area_mm2: dieAreaMm2,
        A_cm2,
        D,
        family_params: {
          D0: fp.D0,
          D_in: fp.D_in,
          t: fp.t,
          t_start: fp.t_start,
          t_end: fp.t_end
        },
        model: { id: model.id, name: model.name, formula: model.formula, uses_params: model.uses_params, params: model.params },
        baseYields,
        yields,
        total,
        tech: appliedTech
      });
    }
  }

  return out;
}
