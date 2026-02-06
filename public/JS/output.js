/**
 * output.js
 * ---------
 * Zuständig für die Darstellung der Ergebnis-Tabelle.
 * Erwartet bereits berechnete Result-Zeilen (aus calc.js).
 * Keine Logik, keine Datenmanipulation, nur Rendern.
 */

function fmtPct(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "–";
  }
  return `${(value * 100).toFixed(2)}%`;
}

function fmtNumber(value, decimals = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "–";
  }
  return Number(value).toFixed(decimals);
}

function getTbody(table) {
  if (!table) return null;
  return table.querySelector("tbody") || null;
}

function buildStationTooltip(field, row) {
  const base = row.baseYields?.[field];
  const baseLine = `Basis (${row.year}): ${fmtPct(base)}`;
  const techs = (row.tech || []).filter((tech) => tech.target_field === field);
  const techLines = techs.map((tech) => {
    const factor = fmtNumber(tech.factor, 4);
    return `${tech.name}: ×${factor}`;
  });
  const resultLine = `Ergebnis: ${fmtPct(row.yields?.[field])}`;

  return [baseLine, ...(techLines.length ? ["Technologien:", ...techLines] : []), resultLine].join("\n");
}

function buildDefectDensityDetails(row) {
  const fp = row.family_params || {};
  const D0 = Number(fp.D0 ?? 0);
  const Din = Number(fp.D_in ?? 0);
  const t = Number(fp.t ?? 0);
  const tStart = Number(fp.t_start ?? 0);
  const tEnd = Number(fp.t_end ?? 0);

  if (Number.isFinite(tStart) && Number.isFinite(tEnd) && tEnd > tStart) {
    const y = Math.max(tStart, Math.min(tEnd, row.yearIndex));
    const ratio = (y - tStart) / (tEnd - tStart);
    const formula = "D = D0 + (D_in - D0) * ((yearIndex - t_start) / (t_end - t_start))";
    return [
      "Defektdichte (linear)",
      `Formel: ${formula}`,
      `D0=${fmtNumber(D0, 4)}, D_in=${fmtNumber(Din, 4)}, t_start=${fmtNumber(tStart, 2)}, t_end=${fmtNumber(tEnd, 2)}`,
      `yearIndex=${row.yearIndex} → verwendet=${fmtNumber(y, 2)} (ratio=${fmtNumber(ratio, 4)})`
    ].join("\n");
  }

  const time = Math.max(0, row.yearIndex - tStart);
  const formula = "D = D0 + D_in * exp(-t * (yearIndex - t_start))";
  return [
    "Defektdichte (exp)",
    `Formel: ${formula}`,
    `D0=${fmtNumber(D0, 4)}, D_in=${fmtNumber(Din, 4)}, t=${fmtNumber(t, 4)}, t_start=${fmtNumber(tStart, 2)}`,
    `yearIndex=${row.yearIndex} → time=${fmtNumber(time, 2)}`
  ].join("\n");
}

function buildVmTooltip(row) {
  const x = Number(row.D) * Number(row.A_cm2);
  const lines = [
    `${row.model?.name || "VM"}: ${row.model?.formula || "VM"}`
  ];

  lines.push(buildDefectDensityDetails(row));
  lines.push(`D = ${fmtNumber(row.D, 4)}`);
  lines.push(`A = ${fmtNumber(row.A_cm2, 4)} cm² (aus ${fmtNumber(row.die_area_mm2, 2)} mm²)`);
  lines.push(`D × A = ${fmtNumber(x, 6)}`);
  lines.push(`Ergebnis: ${fmtPct(row.yields?.VM)}`);

  return lines.join("\n");
}

function buildTotalTooltip(row) {
  const parts = ["FAB", "EPI", "VM", "SAW", "KGD", "OSAT"];
  const productLine = parts.map((key) => `${key}=${fmtPct(row.yields?.[key])}`).join(" · ");
  const formula = "Total = FAB × EPI × VM × SAW × KGD × OSAT";
  return [formula, productLine, `Ergebnis: ${fmtPct(row.total)}`].join("\n");
}

function createCell(value, title, { strong = false } = {}) {
  const td = document.createElement("td");
  if (title) {
    td.title = title;
    td.setAttribute("data-tooltip", title);
    td.setAttribute("aria-label", title);
    td.classList.add("has-tooltip");
  }
  if (strong) {
    const el = document.createElement("strong");
    el.textContent = value;
    td.appendChild(el);
  } else {
    td.textContent = value;
  }
  return td;
}

export function renderResultsTable(results, table) {
  const tbody = getTbody(table);
  if (!tbody) {
    console.warn("results-table tbody not found");
    return;
  }

  tbody.innerHTML = "";

  if (!Array.isArray(results) || results.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="11" style="text-align:center;">Keine Ergebnisse</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const row of results) {
    const tr = document.createElement("tr");
    tr.appendChild(createCell(String(row.year)));
    tr.appendChild(createCell(row.ttnr || ""));
    tr.appendChild(createCell(row.name || ""));
    tr.appendChild(createCell(fmtPct(row.yields?.FAB), buildStationTooltip("FAB", row)));
    tr.appendChild(createCell(fmtPct(row.yields?.EPI), buildStationTooltip("EPI", row)));
    tr.appendChild(createCell(fmtPct(row.yields?.VM), buildVmTooltip(row)));
    tr.appendChild(createCell(fmtPct(row.yields?.SAW), buildStationTooltip("SAW", row)));
    tr.appendChild(createCell(fmtPct(row.yields?.KGD), buildStationTooltip("KGD", row)));
    tr.appendChild(createCell(fmtPct(row.yields?.OSAT), buildStationTooltip("OSAT", row)));
    tr.appendChild(createCell(fmtPct(row.total), buildTotalTooltip(row), { strong: true }));

    tbody.appendChild(tr);
  }
}
