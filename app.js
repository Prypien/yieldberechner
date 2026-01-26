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

INSERT INTO families VALUES ('T12', 'RtP1', 'T12', 0.42, 0.07, 1.6, 0.1);
INSERT INTO families VALUES ('P28', 'RtP1', 'P28', 0.31, 0.05, 1.9, 0.2);
INSERT INTO families VALUES ('H55', 'RtP1', 'H55', 0.58, 0.09, 1.4, 0.0);
INSERT INTO families VALUES ('K90', 'RtP1', 'K90', 0.27, 0.04, 2.1, 0.15);
INSERT INTO families VALUES ('S40', 'RseP', 'S40', 0.36, 0.06, 1.7, 0.1);
INSERT INTO families VALUES ('M70', 'RseP', 'M70', 0.49, 0.08, 1.5, 0.05);
INSERT INTO families VALUES ('G22', 'RseP', 'G22', 0.28, 0.04, 2.0, 0.2);

INSERT INTO chip_types VALUES ('0270.248.172', 'RtP1', 'Power IC Gen2', 'T12', 'QFN-64', 124.6, 680, 0);
INSERT INTO chip_types VALUES ('0412.093.551', 'RtP1', 'Sensor Hub MX', 'P28', 'BGA-100', 86.2, 520, 2028);
INSERT INTO chip_types VALUES ('0198.552.730', 'RtP1', 'Gate Driver Pro', 'T12', 'SOIC-20', 52.4, 420, 0);
INSERT INTO chip_types VALUES ('0335.781.204', 'RtP1', 'Motor Control X3', 'H55', 'QFN-88', 178.3, 740, 2027);
INSERT INTO chip_types VALUES ('0620.410.995', 'RtP1', 'PMIC Core', 'K90', 'LQFP-64', 64.9, 510, 0);
INSERT INTO chip_types VALUES ('0325.401.880', 'RseP', 'Connectivity Core', 'S40', 'LGA-72', 72.8, 460, 0);
INSERT INTO chip_types VALUES ('0550.330.041', 'RseP', 'Analog Frontend Plus', 'G22', 'QFN-40', 48.5, 380, 0);
INSERT INTO chip_types VALUES ('0607.180.912', 'RseP', 'System Gateway LX', 'M70', 'BGA-144', 112.3, 620, 2026);
INSERT INTO chip_types VALUES ('0715.522.310', 'RseP', 'RF Control Node', 'S40', 'QFN-56', 96.4, 540, 2029);

INSERT INTO technologies VALUES ('sakasa', 'RtP1', 'Sakasa', 'Verbesserte Sägestabilität', 'SAW', 1.4, 0);
INSERT INTO technologies VALUES ('euv_plus', 'RtP1', 'EUV Plus', 'Erweiterte Lithographie-Window', 'FAB', 2.1, 0);
INSERT INTO technologies VALUES ('wlbi', 'RtP1', 'WLBI', 'Wafer-Level Burn-In zur Defektreduktion', 'FAB', 0.0, 1);
INSERT INTO technologies VALUES ('cu_thin', 'RtP1', 'Cu Thin', 'Kupfer-Optimierung im Back-End', 'KGD', 0.0, 1);
INSERT INTO technologies VALUES ('smart_saw', 'RseP', 'Smart Saw', 'Optimiertes Sägen für weniger Chipping', 'SAW', 1.0, 0);
INSERT INTO technologies VALUES ('osat_prime', 'RseP', 'OSAT Prime', 'Verbesserte OSAT-Partnerqualität', 'OSAT', 0.8, 0);
INSERT INTO technologies VALUES ('epi_purify', 'RseP', 'EPI Purify', 'Reinere Epitaxie für bessere Starts', 'EPI', 0.7, 0);
INSERT INTO technologies VALUES ('fab_stab', 'RseP', 'Fab Stabilization', 'Stabilisierung der FAB-Prozessfenster', 'FAB', 0.0, 1);
INSERT INTO technologies VALUES ('kgd_screen', 'RseP', 'KGD Screening', 'Schärferes Screening vor OSAT', 'KGD', 0.0, 1);

INSERT INTO technology_years VALUES ('wlbi', 2026, 0.6);
INSERT INTO technology_years VALUES ('wlbi', 2029, 1.1);
INSERT INTO technology_years VALUES ('wlbi', 2032, 1.7);
INSERT INTO technology_years VALUES ('cu_thin', 2027, 0.4);
INSERT INTO technology_years VALUES ('cu_thin', 2031, 0.9);
INSERT INTO technology_years VALUES ('fab_stab', 2026, 0.5);
INSERT INTO technology_years VALUES ('fab_stab', 2030, 1.3);
INSERT INTO technology_years VALUES ('fab_stab', 2034, 1.6);
INSERT INTO technology_years VALUES ('kgd_screen', 2027, 0.6);
INSERT INTO technology_years VALUES ('kgd_screen', 2032, 1.1);

INSERT INTO chip_type_tech VALUES ('0270.248.172', 'euv_plus');
INSERT INTO chip_type_tech VALUES ('0270.248.172', 'wlbi');
INSERT INTO chip_type_tech VALUES ('0270.248.172', 'sakasa');
INSERT INTO chip_type_tech VALUES ('0412.093.551', 'euv_plus');
INSERT INTO chip_type_tech VALUES ('0412.093.551', 'wlbi');
INSERT INTO chip_type_tech VALUES ('0198.552.730', 'sakasa');
INSERT INTO chip_type_tech VALUES ('0335.781.204', 'euv_plus');
INSERT INTO chip_type_tech VALUES ('0335.781.204', 'cu_thin');
INSERT INTO chip_type_tech VALUES ('0620.410.995', 'wlbi');
INSERT INTO chip_type_tech VALUES ('0620.410.995', 'sakasa');
INSERT INTO chip_type_tech VALUES ('0325.401.880', 'fab_stab');
INSERT INTO chip_type_tech VALUES ('0325.401.880', 'smart_saw');
INSERT INTO chip_type_tech VALUES ('0550.330.041', 'osat_prime');
INSERT INTO chip_type_tech VALUES ('0550.330.041', 'epi_purify');
INSERT INTO chip_type_tech VALUES ('0607.180.912', 'fab_stab');
INSERT INTO chip_type_tech VALUES ('0607.180.912', 'kgd_screen');
INSERT INTO chip_type_tech VALUES ('0607.180.912', 'osat_prime');
INSERT INTO chip_type_tech VALUES ('0715.522.310', 'smart_saw');
INSERT INTO chip_type_tech VALUES ('0715.522.310', 'kgd_screen');

INSERT INTO yield_models VALUES ('poisson', 'Poisson', 'Classical Poisson yield model', 44, 'FAB = EXP(-D_year * A_cm2)');
INSERT INTO yield_models VALUES ('murphy', 'Murphy', 'Murphy yield approximation for clustered defects', 38, 'FAB = (1 - EXP(-D_year * A_cm2)) / (D_year * A_cm2)');
INSERT INTO yield_models VALUES ('neg_binom', 'Negative Binomial', 'Alpha = 3.0 with clustered defect correction', 52, 'FAB = POWER(1 + (D_year * A_cm2)/alpha, -alpha)');
INSERT INTO yield_models VALUES ('seeds', 'Seeds', 'Deterministic seed-based yield with fixed loss factor', 30, 'FAB = EXP(-D_year * A_cm2 * 0.92)');`,
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

const db = {
  scenario: {
    id: "T2504",
    name: "T2504",
    startYear: 2026,
    endYear: 2035,
    selectedCalculationModelId: "poisson"
  },
  calculationModels: [
    {
      id: "poisson",
      name: "Poisson",
      description: "Classical Poisson yield model",
      layers: 44,
      sqlFormula: "FAB = EXP(-D_year * A_cm2)"
    },
    {
      id: "murphy",
      name: "Murphy",
      description: "Murphy yield approximation for clustered defects",
      layers: 38,
      sqlFormula: "FAB = (1 - EXP(-D_year * A_cm2)) / (D_year * A_cm2)"
    },
    {
      id: "neg_binom",
      name: "Negative Binomial",
      description: "Alpha = 3.0 with clustered defect correction",
      layers: 52,
      sqlFormula: "FAB = POWER(1 + (D_year * A_cm2)/alpha, -alpha)"
    },
    {
      id: "seeds",
      name: "Seeds",
      description: "Deterministic seed-based yield with fixed loss factor",
      layers: 30,
      sqlFormula: "FAB = EXP(-D_year * A_cm2 * 0.92)"
    }
  ],
  plants: {
    RtP1: {
      families: [
        { id: "T12", name: "T12", D0: 0.42, D_in: 0.07, t: 1.6, t_start: 0.1 },
        { id: "P28", name: "P28", D0: 0.31, D_in: 0.05, t: 1.9, t_start: 0.2 },
        { id: "H55", name: "H55", D0: 0.58, D_in: 0.09, t: 1.4, t_start: 0.0 },
        { id: "K90", name: "K90", D0: 0.27, D_in: 0.04, t: 2.1, t_start: 0.15 },
        { id: "J7", name: "J7", D0: 0.42, D_in: 0.07, t: 1.6, t_start: 0.1 },
        { id: "J12", name: "J12", D0: 0.42, D_in: 0.07, t: 1.6, t_start: 0.1 },
        { id: "B12", name: "B12", D0: 0.42, D_in: 0.07, t: 1.6, t_start: 0.1 },
        { id: "B7", name: "B7", D0: 0.42, D_in: 0.07, t: 1.6, t_start: 0.1 }
      ],
      technologies: [
        {
          id: "fab_yield",
          name: "FAB Yield Improvement",
          description: "Verbesserung des FAB-Yields",
          targetField: "FAB",
          staticExtraPct: 95.6,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 1.0 },
            { year: 2027, extraPct: 0.5 },
            { year: 2028, extraPct: 0.5 },
            { year: 2029, extraPct: 0.2 },
            { year: 2030, extraPct: 0.2 },
            { year: 2031, extraPct: 0.0 },
            { year: 2032, extraPct: 0.1 },
            { year: 2033, extraPct: 0.0 },
            { year: 2034, extraPct: 0.1 },
            { year: 2035, extraPct: 0.0 }
          ]
        },
        {
          id: "epi_yield",
          name: "EPI Yield Improvement",
          description: "Verbesserung des EPI-Yields",
          targetField: "EPI",
          staticExtraPct: 95.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 3.5 },
            { year: 2027, extraPct: 0.1 },
            { year: 2028, extraPct: 0.1 },
            { year: 2029, extraPct: 0.1 },
            { year: 2030, extraPct: 0.1 },
            { year: 2031, extraPct: 0.1 },
            { year: 2032, extraPct: 0.1 },
            { year: 2033, extraPct: 0.1 },
            { year: 2034, extraPct: 0.1 },
            { year: 2035, extraPct: 0.1 }
          ]
        },
        {
          id: "wlbi",
          name: "WLBI",
          description: "Wafer-Level Burn-In zur Defektreduktion",
          targetField: "WLBI",
          staticExtraPct: 100.0,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "bopp_yield",
          name: "BOPP Yield Improvement",
          description: "Verbesserung des BOPP-Yields",
          targetField: "BOPP",
          staticExtraPct: 96.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 1.0 },
            { year: 2027, extraPct: 1.0 },
            { year: 2028, extraPct: 0.0 },
            { year: 2029, extraPct: 0.0 },
            { year: 2030, extraPct: 0.0 },
            { year: 2031, extraPct: 0.0 },
            { year: 2032, extraPct: 0.0 },
            { year: 2033, extraPct: 0.0 },
            { year: 2034, extraPct: 0.0 },
            { year: 2035, extraPct: 0.0 }
          ]
        },
        {
          id: "bs_inspection",
          name: "BS-Inspection",
          description: "Backside Inspection",
          targetField: "BS",
          staticExtraPct: 99.0,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "dicing_yield",
          name: "Dicing Yield",
          description: "Dicing Yield",
          targetField: "DICING",
          staticExtraPct: 99.0,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "avi_yield",
          name: "AVI Yield Improvement",
          description: "Verbesserung des AVI-Yields",
          targetField: "AVI",
          staticExtraPct: 96.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 1.0 },
            { year: 2027, extraPct: 1.0 },
            { year: 2028, extraPct: 0.2 },
            { year: 2029, extraPct: 0.1 },
            { year: 2030, extraPct: 0.1 },
            { year: 2031, extraPct: 0.1 },
            { year: 2032, extraPct: 0.1 },
            { year: 2033, extraPct: 0.1 },
            { year: 2034, extraPct: 0.1 },
            { year: 2035, extraPct: 0.1 }
          ]
        },
        {
          id: "kgd_j12",
          name: "KGD J12",
          description: "KGD Yield für J12/T12/B12/J17",
          targetField: "KGD",
          staticExtraPct: 98.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 0.0 },
            { year: 2027, extraPct: 0.2 },
            { year: 2028, extraPct: 0.1 },
            { year: 2029, extraPct: 0.1 },
            { year: 2030, extraPct: 0.1 },
            { year: 2031, extraPct: 0.1 },
            { year: 2032, extraPct: 0.1 },
            { year: 2033, extraPct: 0.1 },
            { year: 2034, extraPct: 0.1 },
            { year: 2035, extraPct: 0.1 }
          ]
        },
        {
          id: "kgd_j7",
          name: "KGD J7",
          description: "KGD Yield für J7",
          targetField: "KGD",
          staticExtraPct: 95.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 1.5 },
            { year: 2027, extraPct: 1.0 },
            { year: 2028, extraPct: 0.5 },
            { year: 2029, extraPct: 0.5 },
            { year: 2030, extraPct: 0.0 },
            { year: 2031, extraPct: 0.0 },
            { year: 2032, extraPct: 0.0 },
            { year: 2033, extraPct: 0.0 },
            { year: 2034, extraPct: 0.0 },
            { year: 2035, extraPct: 0.0 }
          ]
        },
        {
          id: "kgd_sc",
          name: "KGD SC",
          description: "KGD Yield für SC",
          targetField: "KGD",
          staticExtraPct: 96.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 0.8 },
            { year: 2027, extraPct: 0.4 },
            { year: 2028, extraPct: 0.4 },
            { year: 2029, extraPct: 0.4 },
            { year: 2030, extraPct: 0.4 },
            { year: 2031, extraPct: 0.4 },
            { year: 2032, extraPct: 0.4 },
            { year: 2033, extraPct: 0.4 },
            { year: 2034, extraPct: 0.4 },
            { year: 2035, extraPct: 0.4 }
          ]
        },
        {
          id: "osat_yield",
          name: "OSAT Yield",
          description: "OSAT Yield für alle",
          targetField: "OSAT",
          staticExtraPct: 95.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 0.5 },
            { year: 2027, extraPct: 0.1 },
            { year: 2028, extraPct: 0.1 },
            { year: 2029, extraPct: 0.1 },
            { year: 2030, extraPct: 0.1 },
            { year: 2031, extraPct: 0.1 },
            { year: 2032, extraPct: 0.1 },
            { year: 2033, extraPct: 0.1 },
            { year: 2034, extraPct: 0.1 },
            { year: 2035, extraPct: 0.1 }
          ]
        },
        {
          id: "epi_ship",
          name: "EPI Auslieferung",
          description: "Yield in der Auslieferung",
          targetField: "EPI_SHIP",
          staticExtraPct: 99.0,
          isDynamic: false,
          yearlyOverrides: []
        }
      ],
      chipTypes: [
        {
          ttnr: "0270.248.172",
          name: "Power IC Gen2",
          familyId: "T12",
          package: "QFN-64",
          dieArea_mm2: 124.6,
          cw: 680,
          specialStartYear: 0
        },
        {
          ttnr: "0412.093.551",
          name: "Sensor Hub MX",
          familyId: "P28",
          package: "BGA-100",
          dieArea_mm2: 86.2,
          cw: 520,
          specialStartYear: 2028
        },
        {
          ttnr: "0198.552.730",
          name: "Gate Driver Pro",
          familyId: "T12",
          package: "SOIC-20",
          dieArea_mm2: 52.4,
          cw: 420,
          specialStartYear: 0
        },
        {
          ttnr: "0335.781.204",
          name: "Motor Control X3",
          familyId: "H55",
          package: "QFN-88",
          dieArea_mm2: 178.3,
          cw: 740,
          specialStartYear: 2027
        },
        {
          ttnr: "0620.410.995",
          name: "PMIC Core",
          familyId: "K90",
          package: "LQFP-64",
          dieArea_mm2: 64.9,
          cw: 510,
          specialStartYear: 0
        },
        {
          ttnr: "1099.505.880",
          name: "Retrofit FX",
          familyId: "J7",
          package: "QFN-48",
          dieArea_mm2: 42.7,
          cw: 390,
          specialStartYear: 0
        },
        {
          ttnr: "1044.511.221",
          name: "Gateway Ultra",
          familyId: "J12",
          package: "BGA-196",
          dieArea_mm2: 132.2,
          cw: 610,
          specialStartYear: 2026
        },
        {
          ttnr: "1019.604.882",
          name: "Sensor R12",
          familyId: "B12",
          package: "LQFP-48",
          dieArea_mm2: 77.1,
          cw: 480,
          specialStartYear: 2027
        },
        {
          ttnr: "1034.088.220",
          name: "Drive B7",
          familyId: "B7",
          package: "QFN-56",
          dieArea_mm2: 92.2,
          cw: 520,
          specialStartYear: 2026
        }
      ],
      chipTypeTechnologies: [
        { ttnr: "0270.248.172", technologyIds: ["fab_yield", "epi_yield", "kgd_j12", "osat_yield", "epi_ship"] },
        { ttnr: "0412.093.551", technologyIds: ["fab_yield", "kgd_j12", "osat_yield"] },
        { ttnr: "0198.552.730", technologyIds: ["fab_yield", "epi_yield", "kgd_j12"] },
        { ttnr: "0335.781.204", technologyIds: ["fab_yield", "epi_yield", "kgd_j12", "osat_yield"] },
        { ttnr: "0620.410.995", technologyIds: ["fab_yield", "epi_yield", "kgd_sc"] },
        { ttnr: "1099.505.880", technologyIds: ["fab_yield", "epi_yield", "kgd_j7"] },
        { ttnr: "1044.511.221", technologyIds: ["fab_yield", "epi_yield", "kgd_j12", "osat_yield", "epi_ship"] },
        { ttnr: "1019.604.882", technologyIds: ["fab_yield", "epi_yield", "kgd_j12", "osat_yield"] },
        { ttnr: "1034.088.220", technologyIds: ["fab_yield", "epi_yield", "kgd_j7", "osat_yield"] }
      ]
    },
    RseP: {
      families: [
        { id: "S40", name: "S40", D0: 0.36, D_in: 0.06, t: 1.7, t_start: 0.1 },
        { id: "M70", name: "M70", D0: 0.49, D_in: 0.08, t: 1.5, t_start: 0.05 },
        { id: "G22", name: "G22", D0: 0.28, D_in: 0.04, t: 2.0, t_start: 0.2 }
      ],
      technologies: [
        {
          id: "fab_stab",
          name: "Fab Stabilization",
          description: "Stabilisierung der FAB-Prozessfenster",
          targetField: "FAB",
          staticExtraPct: 92.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 1.0 },
            { year: 2027, extraPct: 0.6 },
            { year: 2028, extraPct: 0.4 },
            { year: 2029, extraPct: 0.2 },
            { year: 2030, extraPct: 0.2 },
            { year: 2031, extraPct: 0.2 },
            { year: 2032, extraPct: 0.2 },
            { year: 2033, extraPct: 0.2 },
            { year: 2034, extraPct: 0.2 },
            { year: 2035, extraPct: 0.2 }
          ]
        },
        {
          id: "smart_saw",
          name: "Smart Saw",
          description: "Optimiertes Sägen für weniger Chipping",
          targetField: "SAW",
          staticExtraPct: 96.0,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "osat_prime",
          name: "OSAT Prime",
          description: "Verbesserte OSAT-Partnerqualität",
          targetField: "OSAT",
          staticExtraPct: 98.0,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "epi_purify",
          name: "EPI Purify",
          description: "Reinere Epitaxie für bessere Starts",
          targetField: "EPI",
          staticExtraPct: 96.5,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "kgd_screen",
          name: "KGD Screening",
          description: "Schärferes Screening vor OSAT",
          targetField: "KGD",
          staticExtraPct: 97.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 0.8 },
            { year: 2027, extraPct: 0.6 },
            { year: 2028, extraPct: 0.4 },
            { year: 2029, extraPct: 0.4 },
            { year: 2030, extraPct: 0.4 },
            { year: 2031, extraPct: 0.4 },
            { year: 2032, extraPct: 0.4 },
            { year: 2033, extraPct: 0.4 },
            { year: 2034, extraPct: 0.4 },
            { year: 2035, extraPct: 0.4 }
          ]
        }
      ],
      chipTypes: [
        {
          ttnr: "0325.401.880",
          name: "Connectivity Core",
          familyId: "S40",
          package: "LGA-72",
          dieArea_mm2: 72.8,
          cw: 460,
          specialStartYear: 0
        },
        {
          ttnr: "0550.330.041",
          name: "Analog Frontend Plus",
          familyId: "G22",
          package: "QFN-40",
          dieArea_mm2: 48.5,
          cw: 380,
          specialStartYear: 0
        },
        {
          ttnr: "0607.180.912",
          name: "System Gateway LX",
          familyId: "M70",
          package: "BGA-144",
          dieArea_mm2: 112.3,
          cw: 620,
          specialStartYear: 2026
        },
        {
          ttnr: "0715.522.310",
          name: "RF Control Node",
          familyId: "S40",
          package: "QFN-56",
          dieArea_mm2: 96.4,
          cw: 540,
          specialStartYear: 2029
        }
      ],
      chipTypeTechnologies: [
        { ttnr: "0325.401.880", technologyIds: ["fab_stab", "smart_saw"] },
        { ttnr: "0550.330.041", technologyIds: ["osat_prime", "epi_purify"] },
        { ttnr: "0607.180.912", technologyIds: ["fab_stab", "kgd_screen", "osat_prime"] },
        { ttnr: "0715.522.310", technologyIds: ["smart_saw", "kgd_screen"] }
      ]
    }
  }
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

const buildYearsFromOverrides = (overrides) =>
  overrides.reduce((acc, entry) => {
    acc[entry.year] = entry.extraPct;
    return acc;
  }, {});

const buildChipTechMap = (mappings) =>
  mappings.reduce((acc, mapping) => {
    acc[mapping.ttnr] = mapping.technologyIds;
    return acc;
  }, {});

const buildPlantState = (plants) =>
  Object.fromEntries(
    Object.entries(plants).map(([plantId, plant]) => [
      plantId,
      {
        families: plant.families.map((family) => ({
          id: family.id,
          name: family.name,
          D0: family.D0,
          D_in: family.D_in,
          t: family.t,
          t_start: family.t_start
        })),
        technologies: plant.technologies.map((tech) => ({
          id: tech.id,
          name: tech.name,
          description: tech.description,
          target_field: tech.targetField,
          static_extra_pct: tech.staticExtraPct,
          is_dynamic: tech.isDynamic,
          years: buildYearsFromOverrides(tech.yearlyOverrides)
        })),
        chipTypes: plant.chipTypes.map((chip) => ({
          ttnr: chip.ttnr,
          name: chip.name,
          family_id: chip.familyId,
          package: chip.package,
          die_area_mm2: chip.dieArea_mm2,
          cw: chip.cw,
          special_start_year: chip.specialStartYear
        })),
        chipTypeTech: buildChipTechMap(plant.chipTypeTechnologies)
      }
    ])
  );

const buildScenarioState = ({ scenario, plants }) => ({
  id: scenario.id || `scenario_${Date.now()}`,
  name: scenario.name,
  start_year: scenario.startYear ?? scenario.start_year,
  end_year: scenario.endYear ?? scenario.end_year,
  selected_model: scenario.selectedCalculationModelId ?? scenario.selected_model,
  plants: buildPlantState(plants)
});

const defaultState = {
  scenarios: [buildScenarioState({ scenario: db.scenario, plants: db.plants })],
  models: db.calculationModels.map((model) => ({
    id: model.id,
    name: model.name,
    description: model.description,
    layers: model.layers,
    sql: model.sqlFormula
  }))
};

const normalizeState = (storedState) => {
  if (!storedState) return null;
  if (storedState.scenarios?.length) return storedState;
  if (storedState.scenario && storedState.plants) {
    const scenarioId = storedState.scenario.id || `scenario_${Date.now()}`;
    return {
      scenarios: [
        {
          id: scenarioId,
          name: storedState.scenario.name,
          start_year: storedState.scenario.start_year,
          end_year: storedState.scenario.end_year,
          selected_model: storedState.scenario.selected_model,
          plants: storedState.plants
        }
      ],
      models: storedState.models || cloneState(defaultState.models)
    };
  }
  return storedState;
};

let state = normalizeState(loadState()) ?? cloneState(defaultState);

const baseYields = {
  EPI: 0.985,
  VM: 0.886,
  SAW: 0.975,
  KGD: 0.955,
  OSAT: 0.982,
  EPI_SHIP: 0.995
};

const storedUi = loadUiState();
let activeScenarioId = storedUi?.activeScenarioId || state.scenarios[0]?.id;
let activePlant = storedUi?.activePlant || "RtP1";
let activeTab = storedUi?.activeTab || "setup";

let saveTimer = null;
const scheduleSave = () => {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(UI_KEY, JSON.stringify({ activeScenarioId, activePlant, activeTab }));
    } catch (error) {
      console.warn("Konnte State nicht speichern:", error);
    }
  }, 300);
};

const Engine = (() => {
  const clampYield = (value) => Math.min(1, Math.max(0, value));

  const formatSql = (formula, params) => {
    let formatted = formula;
    Object.entries(params).forEach(([key, value]) => {
      formatted = formatted.replaceAll(`:${key}`, value);
    });
    return formatted;
  };

  const computeDefectDensity = ({ family, year, startYear, decay = 0.985 }) => {
    const yIdx = year - startYear;
    const value = (family.D0 + family.D_in) * Math.pow(decay, yIdx);
    const formula = formatSql("(:D0 + :D_in) * POWER(0.985, :y_idx)", {
      D0: family.D0.toFixed(4),
      D_in: family.D_in.toFixed(4),
      y_idx: yIdx
    });
    return { value, yIdx, formula };
  };

  const computeFabYield = ({ family, dieAreaMm2, year, startYear, model }) => {
    const defect = computeDefectDensity({ family, year, startYear });
    const A_cm2 = dieAreaMm2 / 100.0;
    let value = 0;
    let formula = model.sql;

    if (model.id === "poisson") {
      value = Math.exp(-defect.value * A_cm2);
    } else if (model.id === "murphy") {
      const denom = defect.value * A_cm2;
      value = denom === 0 ? 1 : (1 - Math.exp(-denom)) / denom;
    } else if (model.id === "neg_binom") {
      const alpha = 3.0;
      value = Math.pow(1 + (defect.value * A_cm2) / alpha, -alpha);
      formula = model.sql.replace("alpha", alpha);
    } else {
      value = Math.exp(-defect.value * A_cm2 * 0.92);
    }

    return {
      value: clampYield(value),
      formula: formatSql(formula, {
        D_year: defect.value.toFixed(4),
        A_cm2: A_cm2.toFixed(4)
      }),
      defectFormula: defect.formula,
      defectDensity: defect.value,
      areaCm2: A_cm2
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
    if (base === null) {
      return { value: null, formula: "", techAdjustments: [], totalExtra: 0 };
    }
    const techAdjustments = techs
      .filter((tech) => tech.target_field === field)
      .map((tech) => ({
        name: tech.name,
        pct: getDynamicExtraPct(tech, year),
        dynamic: tech.is_dynamic
      }));
    const totalExtra = techAdjustments.reduce((sum, item) => sum + item.pct, 0);
    const value = clampYield(base * (1 + totalExtra / 100));
    const formula = formatSql("field_base * (1 + (SUM(extra_pct) / 100.0))", {
      field_base: base.toFixed(4)
    });
    return { value, formula, techAdjustments, totalExtra };
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

  const computeResults = ({ scenario, plant, model, baseYields }) => {
    const results = [];
    const errors = [];
    const start = scenario.start_year;
    const end = scenario.end_year;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      errors.push({
        type: "scenario",
        message: "Startjahr muss kleiner oder gleich dem Endjahr sein."
      });
      return { results, errors };
    }

    for (let year = start; year <= end; year += 1) {
      plant.chipTypes.forEach((chip) => {
        const active = chip.special_start_year === 0
          ? year >= start
          : year >= chip.special_start_year;
        if (!active) return;

        const rowErrors = [];
        const family = plant.families.find((fam) => fam.id === chip.family_id) || null;

        if (!family) {
          rowErrors.push(`Familie '${chip.family_id}' existiert nicht.`);
        }

        const chipTechIds = plant.chipTypeTech[chip.ttnr] || [];
        const techs = [];
        const missingTechIds = [];
        chipTechIds.forEach((id) => {
          const tech = plant.technologies.find((item) => item.id === id);
          if (tech) {
            techs.push(tech);
          } else {
            missingTechIds.push(id);
          }
        });

        if (missingTechIds.length) {
          rowErrors.push(`Technologien fehlen: ${missingTechIds.join(", ")}.`);
        }

        const fab = family
          ? computeFabYield({
              family,
              dieAreaMm2: chip.die_area_mm2,
              year,
              startYear: start,
              model
            })
          : { value: null, formula: "", defectFormula: "", defectDensity: null, areaCm2: null };

        const fields = {
          EPI: computeYield({ field: "EPI", base: baseYields.EPI, techs, year }),
          FAB: computeYield({ field: "FAB", base: fab.value, techs, year }),
          VM: computeYield({ field: "VM", base: baseYields.VM, techs, year }),
          SAW: computeYield({ field: "SAW", base: baseYields.SAW, techs, year }),
          KGD: computeYield({ field: "KGD", base: baseYields.KGD, techs, year }),
          OSAT: computeYield({ field: "OSAT", base: baseYields.OSAT, techs, year }),
          EPI_SHIP: computeYield({ field: "EPI_SHIP", base: baseYields.EPI_SHIP, techs, year })
        };

        const fieldValues = Object.values(fields).map((item) => item.value);
        const hasNull = fieldValues.some((value) => value === null);
        const total = hasNull
          ? null
          : clampYield(fieldValues.reduce((acc, value) => acc * value, 1));

        results.push({
          id: `${year}-${chip.ttnr}`,
          year,
          chip,
          family,
          fields,
          total,
          errors: rowErrors,
          missingTechIds,
          fabFormula: fab.formula,
          fabDefectFormula: fab.defectFormula,
          defectDensity: fab.defectDensity,
          areaCm2: fab.areaCm2,
          sqlPreview: fab.value === null
            ? ""
            : buildFieldSql({
                field: "FAB",
                base: fab.value,
                totalExtra: fields.FAB.totalExtra || 0,
                year,
                ttnr: chip.ttnr,
                defectFormula: fab.defectFormula,
                fabFormula: fab.formula
              })
        });
      });
    }

    return { results, errors };
  };

  return {
    clampYield,
    computeDefectDensity,
    computeFabYield,
    computeYield,
    computeResults,
    getDynamicExtraPct
  };
})();

const scenarioSelect = document.getElementById("scenario-select");
const addScenarioButton = document.getElementById("add-scenario");
const scenarioNameInput = document.getElementById("scenario-name");
const scenarioStartInput = document.getElementById("scenario-start");
const scenarioEndInput = document.getElementById("scenario-end");
const modelSelect = document.getElementById("model-select");
const sqlSnapshot = document.getElementById("sql-snapshot");
const scenarioError = document.getElementById("scenario-error");
const plantSelect = document.getElementById("plant-select");
const scenarioStatus = document.getElementById("scenario-status");
const validationStatus = document.getElementById("validation-status");
const validationDetails = document.getElementById("validation-details");
const sanityCheckButton = document.getElementById("sanity-check");
const sanityStatus = document.getElementById("sanity-status");
const sanityList = document.getElementById("sanity-list");
const filterTTNR = document.getElementById("filter-ttnr");
const filterFamily = document.getElementById("filter-family");
const filterYear = document.getElementById("filter-year");
const detailPanel = document.getElementById("detail-panel");
const detailStatus = document.getElementById("detail-status");
const detailBody = document.getElementById("detail-body");
const sqlPreview = document.getElementById("sql-preview");
const copySqlButton = document.getElementById("copy-sql");

let latestResults = [];
let latestErrors = [];
let selectedRowId = null;

const setInputError = (input, hasError) => {
  input.classList.toggle("input-error", hasError);
};

const parseNumberInput = (input, { min = 0, integer = false } = {}) => {
  const raw = integer ? parseInt(input.value, 10) : parseFloat(input.value);
  const valid = Number.isFinite(raw) && raw >= min;
  setInputError(input, !valid);
  return valid ? raw : null;
};

const getScenario = () => {
  const scenario = state.scenarios.find((item) => item.id === activeScenarioId) || state.scenarios[0];
  if (scenario && scenario.id !== activeScenarioId) {
    activeScenarioId = scenario.id;
  }
  return scenario;
};

const getModelById = (id) => state.models.find((model) => model.id === id);

const getPlant = () => getScenario().plants[activePlant];

const getFamilies = () => getPlant().families;

const getTechnologies = () => getPlant().technologies;

const getChipTypes = () => getPlant().chipTypes;

const getChipTypeTech = () => getPlant().chipTypeTech;

const getScenarioYears = () => {
  const scenario = getScenario();
  const years = [];
  if (!Number.isFinite(scenario.start_year) || !Number.isFinite(scenario.end_year)) return years;
  for (let year = scenario.start_year; year <= scenario.end_year; year += 1) {
    years.push(year);
  }
  return years;
};

const validateScenarioYears = () => {
  const scenario = getScenario();
  const start = scenario.start_year;
  const end = scenario.end_year;
  const valid = Number.isFinite(start) && Number.isFinite(end) && start <= end;
  scenarioError.textContent = valid ? "" : "Startjahr muss kleiner oder gleich dem Endjahr sein.";
  setInputError(scenarioStartInput, !valid);
  setInputError(scenarioEndInput, !valid);
  scenarioStatus.classList.toggle("status-valid", valid);
  scenarioStatus.classList.toggle("status-invalid", !valid);
  scenarioStatus.textContent = valid ? "✅ gültig" : "❌ Fehler";
  return valid;
};

const buildSqlSnapshot = () => {
  const plantName = `Werk ${activePlant}`;
  return [
    `-- Übersicht für ${plantName}`,
    sqlSeed.schema,
    sqlSeed.inserts,
    sqlSeed.exampleQuery
  ].join("\n\n");
};

const renderValidationStatus = () => {
  if (!validateScenarioYears()) {
    validationStatus.classList.remove("status-valid");
    validationStatus.classList.add("status-invalid");
    validationStatus.textContent = "❌ Fehler";
    validationDetails.textContent = "Ungültige Szenario-Jahre blockieren die Berechnung.";
    return;
  }
  const rowErrorCount = latestResults.filter((row) => row.errors.length).length;
  if (latestErrors.length || rowErrorCount) {
    validationStatus.classList.remove("status-valid");
    validationStatus.classList.add("status-invalid");
    const totalErrors = latestErrors.length + rowErrorCount;
    validationStatus.textContent = `❌ Fehler (${totalErrors})`;
    const detailParts = [];
    if (latestErrors.length) detailParts.push(latestErrors.join(" "));
    if (rowErrorCount) detailParts.push(`${rowErrorCount} Ergebniszeilen mit fehlenden Referenzen.`);
    validationDetails.textContent = detailParts.join(" ");
    return;
  }
  validationStatus.classList.remove("status-invalid");
  validationStatus.classList.add("status-valid");
  validationStatus.textContent = "✅ gültig";
  validationDetails.textContent = "Keine Validierungsfehler gefunden.";
};

const renderScenarioSelect = () => {
  scenarioSelect.innerHTML = state.scenarios
    .map((scenario) => `<option value="${scenario.id}">${scenario.name}</option>`)
    .join("");
  scenarioSelect.value = activeScenarioId;
};

const renderPlantSelect = () => {
  const scenario = getScenario();
  const plantIds = Object.keys(scenario.plants);
  if (!scenario.plants[activePlant]) {
    activePlant = plantIds[0];
  }
  plantSelect.innerHTML = plantIds
    .map((plantId) => `<option value="${plantId}">${plantId}</option>`)
    .join("");
  plantSelect.value = activePlant;
};

const renderScenario = () => {
  const scenario = getScenario();
  scenarioNameInput.value = scenario.name;
  scenarioStartInput.value = scenario.start_year;
  scenarioEndInput.value = scenario.end_year;
  document.getElementById("calc-start-year").textContent = scenario.start_year;
  validateScenarioYears();
};

const renderModelSelect = () => {
  const scenario = getScenario();
  if (!getModelById(scenario.selected_model)) {
    scenario.selected_model = state.models[0]?.id || "";
  }
  modelSelect.innerHTML = state.models
    .map((model) => `<option value="${model.id}">${model.name}</option>`)
    .join("");
  modelSelect.value = scenario.selected_model;
};

const renderFamilies = () => {
  const tbody = document.querySelector("#families-table tbody");
  tbody.innerHTML = getFamilies()
    .map((family) =>
      `<tr>
        <td>${family.name}</td>
        <td><input class="input input-number" type="number" step="0.01" min="0" inputmode="decimal" data-family="${family.id}" data-field="D0" value="${family.D0}" /></td>
        <td><input class="input input-number" type="number" step="0.01" min="0" inputmode="decimal" data-family="${family.id}" data-field="D_in" value="${family.D_in}" /></td>
        <td><input class="input input-number" type="number" step="0.01" min="0" inputmode="decimal" data-family="${family.id}" data-field="t" value="${family.t}" /></td>
        <td><input class="input input-number" type="number" step="0.01" min="0" inputmode="decimal" data-family="${family.id}" data-field="t_start" value="${family.t_start}" /></td>
      </tr>`
    )
    .join("");
};

const renderSqlOverview = () => {
  sqlSnapshot.textContent = buildSqlSnapshot();
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
        <td><input class="input input-number" type="number" step="0.1" min="0.1" inputmode="decimal" data-chip="${chip.ttnr}" data-field="die_area_mm2" value="${chip.die_area_mm2}" /></td>
        <td><input class="input input-number" type="number" step="0.1" min="0" inputmode="decimal" data-chip="${chip.ttnr}" data-field="cw" value="${chip.cw}" /></td>
        <td><select multiple class="input multi" data-chip="${chip.ttnr}" data-field="technologies">${techOptions}</select></td>
        <td><input class="input input-number" type="number" min="0" step="1" inputmode="numeric" placeholder="0" data-chip="${chip.ttnr}" data-field="special_start_year" value="${chip.special_start_year}" /></td>
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
          <input class="input input-number" type="number" step="0.1" inputmode="decimal" data-tech="${tech.id}" data-field="static_extra_pct" value="${tech.static_extra_pct}" ${tech.is_dynamic ? "disabled" : ""} />
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
            <td><input class="input input-number" type="number" step="0.1" min="0" inputmode="decimal" data-tech-year="${tech.id}" data-year="${year}" value="${tech.years[year] ?? ""}" placeholder="0" /></td>
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

const formatYield = (value) => {
  if (value === null) return "—";
  return `${(value * 100).toFixed(2)}%`;
};

const renderYieldCell = (value, isTotal = false) => {
  const classes = ["yield", "num"];
  if (isTotal) classes.push("total-cell");
  return `<td class="${classes.join(" ")}">${formatYield(value)}</td>`;
};

const applyFilters = (results) => {
  const ttnrQuery = filterTTNR.value.trim().toLowerCase();
  const familyFilter = filterFamily.value;
  const yearFilter = filterYear.value;

  return results.filter((row) => {
    if (ttnrQuery && !row.chip.ttnr.toLowerCase().includes(ttnrQuery)) return false;
    if (familyFilter && familyFilter !== "all" && row.chip.family_id !== familyFilter) return false;
    if (yearFilter && yearFilter !== "all" && String(row.year) !== yearFilter) return false;
    return true;
  });
};

const renderResultsTable = () => {
  const tbody = document.querySelector("#results-table tbody");
  const filtered = applyFilters(latestResults);
  tbody.innerHTML = filtered
    .map((row) => {
      const errorClass = row.errors.length ? "row-error" : "";
      return `<tr class="${errorClass}" data-row-id="${row.id}">
        <td class="num">${row.year}</td>
        <td class="mono">${row.chip.ttnr}</td>
        <td>${row.chip.name}</td>
        <td>${row.chip.family_id}</td>
        <td>${row.chip.package}</td>
        ${renderYieldCell(row.fields.EPI.value)}
        ${renderYieldCell(row.fields.FAB.value)}
        ${renderYieldCell(row.fields.VM.value)}
        ${renderYieldCell(row.fields.SAW.value)}
        ${renderYieldCell(row.fields.KGD.value)}
        ${renderYieldCell(row.fields.OSAT.value)}
        ${renderYieldCell(row.fields.EPI_SHIP.value)}
        ${renderYieldCell(row.total, true)}
      </tr>`;
    })
    .join("");

  if (selectedRowId && !filtered.some((row) => row.id === selectedRowId)) {
    selectedRowId = null;
    renderDetailPanel(null);
  }
};

const renderFilterOptions = () => {
  const families = getFamilies();
  const years = getScenarioYears();

  filterFamily.innerHTML = [
    `<option value="all">Alle</option>`,
    ...families.map((family) => `<option value="${family.id}">${family.name}</option>`)
  ].join("");

  filterYear.innerHTML = [
    `<option value="all">Alle</option>`,
    ...years.map((year) => `<option value="${year}">${year}</option>`)
  ].join("");
};

const renderDetailPanel = (row) => {
  if (!row) {
    detailStatus.textContent = "Keine Auswahl";
    detailStatus.classList.remove("status-valid", "status-invalid");
    detailBody.innerHTML = `<p class="muted-text">Wähle eine Zeile aus der Ergebnistabelle, um Details zu sehen.</p>`;
    sqlPreview.textContent = "";
    return;
  }

  detailStatus.textContent = row.errors.length ? "❌ Fehler" : "✅ ok";
  detailStatus.classList.toggle("status-invalid", row.errors.length > 0);
  detailStatus.classList.toggle("status-valid", row.errors.length === 0);

  const errorBlock = row.errors.length
    ? `<div class="detail-errors"><strong>Fehler</strong><ul>${row.errors.map((err) => `<li>${err}</li>`).join("")}</ul></div>`
    : "";

  const techLines = Object.entries(row.fields)
    .map(([field, data]) => {
      if (!data.techAdjustments.length) return `<li>${field}: keine Extras</li>`;
      const entries = data.techAdjustments
        .map((tech) => `${tech.name}: ${tech.pct.toFixed(2)}%${tech.dynamic ? " (dyn)" : ""}`)
        .join(", ");
      return `<li>${field}: ${entries}</li>`;
    })
    .join("");

  detailBody.innerHTML = `
    ${errorBlock}
    <div class="detail-item"><strong>TTNR</strong>${row.chip.ttnr} · ${row.chip.name}</div>
    <div class="detail-item"><strong>Jahr</strong>${row.year}</div>
    <div class="detail-grid">
      <div class="detail-item"><strong>Defect Density</strong>${row.defectDensity === null ? "—" : row.defectDensity.toFixed(4)}</div>
      <div class="detail-item"><strong>Die Area (cm²)</strong>${row.areaCm2 === null ? "—" : row.areaCm2.toFixed(4)}</div>
      <div class="detail-item"><strong>FAB Yield</strong>${formatYield(row.fields.FAB.value)}</div>
      <div class="detail-item"><strong>Total Yield</strong>${formatYield(row.total)}</div>
    </div>
    <div>
      <strong>Tech-Extras</strong>
      <ul>${techLines || "<li>Keine Technologien</li>"}</ul>
    </div>
  `;

  sqlPreview.textContent = row.sqlPreview;
};

const computeAndRenderResults = () => {
  if (!validateScenarioYears()) {
    latestResults = [];
    latestErrors = ["Ungültige Szenario-Jahre blockieren die Berechnung."];
    renderResultsTable();
    renderValidationStatus();
    return;
  }

  const scenario = getScenario();
  const plant = getPlant();
  const model = getModelById(scenario.selected_model) || state.models[0];
  const { results, errors } = Engine.computeResults({ scenario, plant, model, baseYields });
  latestResults = results;
  latestErrors = errors.map((error) => error.message);
  renderResultsTable();
  renderValidationStatus();
};

const debounce = (fn, delay) => {
  let timer = null;
  return (...args) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

const debouncedUpdateResults = debounce(() => {
  computeAndRenderResults();
}, 300);

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

const runSanityCheck = () => {
  const issues = [];
  const scenario = getScenario();
  const plant = getPlant();
  const model = getModelById(scenario.selected_model);
  const family = plant.families[0];

  if (family) {
    const defect = Engine.computeDefectDensity({ family, year: scenario.start_year, startYear: scenario.start_year });
    const expected = family.D0 + family.D_in;
    const diff = Math.abs(defect.value - expected);
    console.assert(diff < 1e-6, "Sanity: yIdx=0 defect density");
    if (diff >= 1e-6) {
      issues.push("Defect Density yIdx=0 stimmt nicht mit D0 + D_in überein.");
    }
  }

  const murphyModel = state.models.find((item) => item.id === "murphy") || model;
  const murphyResult = Engine.computeFabYield({
    family: { D0: 0, D_in: 0 },
    dieAreaMm2: 0,
    year: scenario.start_year,
    startYear: scenario.start_year,
    model: murphyModel
  });
  console.assert(murphyResult.value === 1, "Sanity: Murphy denom 0");
  if (murphyResult.value !== 1) {
    issues.push("Murphy-Division durch 0 wird nicht korrekt abgefangen.");
  }

  const { results } = Engine.computeResults({ scenario, plant, model, baseYields });
  const totalOutOfRange = results.some((row) => row.total !== null && (row.total < 0 || row.total > 1));
  console.assert(!totalOutOfRange, "Sanity: total yield in [0,1]");
  if (totalOutOfRange) {
    issues.push("Total Yield liegt außerhalb von [0..1].");
  }

  const dynamicTech = plant.technologies.find((tech) => tech.is_dynamic && Object.keys(tech.years).length > 0);
  if (dynamicTech) {
    const years = Object.keys(dynamicTech.years).map((year) => parseInt(year, 10)).sort((a, b) => a - b);
    const lastYear = years[years.length - 1];
    const nextYear = lastYear + 1;
    const expected = dynamicTech.years[lastYear];
    const actual = Engine.getDynamicExtraPct(dynamicTech, nextYear);
    console.assert(actual === expected, "Sanity: dynamic extra carry forward");
    if (actual !== expected) {
      issues.push("Dynamic Extras: letzter bekannter Wert wird nicht weitergeführt.");
    }
  }

  if (issues.length) {
    sanityStatus.textContent = "Sanity Check failed";
    sanityStatus.classList.add("status-invalid");
    sanityStatus.classList.remove("status-valid");
    sanityList.innerHTML = issues.map((issue) => `<li>${issue}</li>`).join("");
  } else {
    sanityStatus.textContent = "Sanity Check ok";
    sanityStatus.classList.add("status-valid");
    sanityStatus.classList.remove("status-invalid");
    sanityList.innerHTML = "";
  }
};

const bindEvents = () => {
  plantSelect.addEventListener("change", (event) => {
    activePlant = event.target.value;
    renderAll();
    scheduleSave();
  });

  scenarioSelect.addEventListener("change", (event) => {
    activeScenarioId = event.target.value;
    renderAll();
    scheduleSave();
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  addScenarioButton.addEventListener("click", () => {
    const scenario = getScenario();
    const nextScenario = {
      id: `scenario_${Date.now()}`,
      name: `${scenario.name} Kopie`,
      start_year: scenario.start_year,
      end_year: scenario.end_year,
      selected_model: scenario.selected_model,
      plants: cloneState(scenario.plants)
    };
    state.scenarios.push(nextScenario);
    activeScenarioId = nextScenario.id;
    renderAll();
    scheduleSave();
  });

  scenarioNameInput.addEventListener("input", (event) => {
    getScenario().name = event.target.value;
    renderScenarioSelect();
    scheduleSave();
  });
  scenarioStartInput.addEventListener("input", (event) => {
    const nextValue = parseNumberInput(event.target, { min: 0, integer: true });
    if (nextValue === null) {
      validateScenarioYears();
      return;
    }
    getScenario().start_year = nextValue;
    renderAll();
    scheduleSave();
  });
  scenarioEndInput.addEventListener("input", (event) => {
    const nextValue = parseNumberInput(event.target, { min: 0, integer: true });
    if (nextValue === null) {
      validateScenarioYears();
      return;
    }
    getScenario().end_year = nextValue;
    renderAll();
    scheduleSave();
  });

  modelSelect.addEventListener("change", (event) => {
    getScenario().selected_model = event.target.value;
    debouncedUpdateResults();
    scheduleSave();
  });

  document.body.addEventListener("input", (event) => {
    const target = event.target;
    if (target.dataset.family) {
      const family = getFamilies().find((f) => f.id === target.dataset.family);
      const value = parseNumberInput(target, { min: 0 });
      if (value === null) return;
      family[target.dataset.field] = value;
      debouncedUpdateResults();
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
      debouncedUpdateResults();
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
      debouncedUpdateResults();
      scheduleSave();
    }
    if (target.dataset.techYear) {
      const tech = getTechnologies().find((t) => t.id === target.dataset.techYear);
      const year = parseInt(target.dataset.year, 10);
      if (target.value === "") {
        delete tech.years[year];
        debouncedUpdateResults();
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
      debouncedUpdateResults();
      scheduleSave();
    }
  });

  document.body.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.chip && target.dataset.field === "technologies") {
      const selected = Array.from(target.selectedOptions).map((option) => option.value);
      getChipTypeTech()[target.dataset.chip] = selected;
      debouncedUpdateResults();
      scheduleSave();
    }
  });

  document.querySelector("#results-table tbody").addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-row-id]");
    if (!row) return;
    selectedRowId = row.dataset.rowId;
    const selected = latestResults.find((item) => item.id === selectedRowId);
    renderDetailPanel(selected);
  });

  [filterTTNR, filterFamily, filterYear].forEach((input) => {
    input.addEventListener("input", () => {
      renderResultsTable();
    });
    input.addEventListener("change", () => {
      renderResultsTable();
    });
  });

  sanityCheckButton.addEventListener("click", runSanityCheck);

  copySqlButton.addEventListener("click", () => {
    if (!sqlPreview.textContent) return;
    navigator.clipboard?.writeText(sqlPreview.textContent);
  });
};

const renderAll = () => {
  renderScenarioSelect();
  renderPlantSelect();
  renderScenario();
  renderModelSelect();
  renderFamilies();
  renderSqlOverview();
  renderTypesTable();
  renderTechTable();
  renderFilterOptions();
  computeAndRenderResults();
  switchTab(activeTab);
};

renderAll();
bindEvents();
