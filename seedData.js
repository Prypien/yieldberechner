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
        { id: "K90", name: "K90", D0: 0.27, D_in: 0.04, t: 2.1, t_start: 0.15 }
      ],
      technologies: [
        {
          id: "sakasa",
          name: "Sakasa",
          description: "Verbesserte Sägestabilität",
          targetField: "SAW",
          staticExtraPct: 1.4,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "euv_plus",
          name: "EUV Plus",
          description: "Erweiterte Lithographie-Window",
          targetField: "FAB",
          staticExtraPct: 2.1,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "wlbi",
          name: "WLBI",
          description: "Wafer-Level Burn-In zur Defektreduktion",
          targetField: "FAB",
          staticExtraPct: 0.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 0.6 },
            { year: 2029, extraPct: 1.1 },
            { year: 2032, extraPct: 1.7 }
          ]
        },
        {
          id: "cu_thin",
          name: "Cu Thin",
          description: "Kupfer-Optimierung im Back-End",
          targetField: "KGD",
          staticExtraPct: 0.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2027, extraPct: 0.4 },
            { year: 2031, extraPct: 0.9 }
          ]
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
        }
      ],
      chipTypeTechnologies: [
        { ttnr: "0270.248.172", technologyIds: ["euv_plus", "wlbi", "sakasa"] },
        { ttnr: "0412.093.551", technologyIds: ["euv_plus", "wlbi"] },
        { ttnr: "0198.552.730", technologyIds: ["sakasa"] },
        { ttnr: "0335.781.204", technologyIds: ["euv_plus", "cu_thin"] },
        { ttnr: "0620.410.995", technologyIds: ["wlbi", "sakasa"] }
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
          id: "smart_saw",
          name: "Smart Saw",
          description: "Optimiertes Sägen für weniger Chipping",
          targetField: "SAW",
          staticExtraPct: 1.0,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "osat_prime",
          name: "OSAT Prime",
          description: "Verbesserte OSAT-Partnerqualität",
          targetField: "OSAT",
          staticExtraPct: 0.8,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "epi_purify",
          name: "EPI Purify",
          description: "Reinere Epitaxie für bessere Starts",
          targetField: "EPI",
          staticExtraPct: 0.7,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "fab_stab",
          name: "Fab Stabilization",
          description: "Stabilisierung der FAB-Prozessfenster",
          targetField: "FAB",
          staticExtraPct: 0.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 0.5 },
            { year: 2030, extraPct: 1.3 },
            { year: 2034, extraPct: 1.6 }
          ]
        },
        {
          id: "kgd_screen",
          name: "KGD Screening",
          description: "Schärferes Screening vor OSAT",
          targetField: "KGD",
          staticExtraPct: 0.0,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2027, extraPct: 0.6 },
            { year: 2032, extraPct: 1.1 }
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
