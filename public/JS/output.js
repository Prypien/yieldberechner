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

function getTbody(table) {
  if (!table) return null;
  return table.querySelector("tbody") || null;
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

    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${row.ttnr || ""}</td>
      <td>${row.name || ""}</td>
      <td>${fmtPct(row.yields?.FAB)}</td>
      <td>${fmtPct(row.yields?.EPI)}</td>
      <td>${fmtPct(row.yields?.VM)}</td>
      <td>${fmtPct(row.yields?.SAW)}</td>
      <td>${fmtPct(row.yields?.KGD)}</td>
      <td>${fmtPct(row.yields?.OSAT)}</td>
      <td><strong>${fmtPct(row.total)}</strong></td>
    `;

    tbody.appendChild(tr);
  }
}
