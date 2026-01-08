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
          description: "KGD Yield Screening",
          targetField: "KGD",
          staticExtraPct: 93.4,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 1.7 },
            { year: 2027, extraPct: 1.0 },
            { year: 2028, extraPct: 0.7 },
            { year: 2029, extraPct: 0.4 },
            { year: 2030, extraPct: 0.2 },
            { year: 2031, extraPct: 0.3 },
            { year: 2032, extraPct: 0.0 },
            { year: 2033, extraPct: 0.0 },
            { year: 2034, extraPct: 0.0 },
            { year: 2035, extraPct: 0.0 }
          ]
        },
        {
          id: "kgd_t_r",
          name: "KGD T&R",
          description: "KGD Taping & Reeling",
          targetField: "KGD",
          staticExtraPct: 99.0,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "sakasa",
          name: "Sakasa",
          description: "Verbesserte Sägestabilität",
          targetField: "SAW",
          staticExtraPct: 1.4,
          isDynamic: false,
          yearlyOverrides: []
        }
      ],
      chipTypes: [
        {
          ttnr: "0270248136",
          name: "PMJW07SE",
          familyId: "J7",
          package: "D2PAK",
          dieArea_mm2: 14.0,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "0270248138",
          name: "PMTX04SE",
          familyId: "T12",
          package: "D2PAK",
          dieArea_mm2: 11.3,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBXSO-41mm2",
          name: "PMBXSO - 41 mm2",
          familyId: "B12",
          package: "Bare Die",
          dieArea_mm2: 41.0,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381071",
          name: "PMJW03SO",
          familyId: "J7",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381069",
          name: "PMJW06SO",
          familyId: "J7",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277133169",
          name: "PMJW13SO",
          familyId: "J7",
          package: "Chip",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381066",
          name: "PMJX03SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381075",
          name: "PMJX04SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381076",
          name: "PMJX05SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381068",
          name: "PMJX06SO",
          familyId: "J12",
          package: "Chip",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381090",
          name: "PMJX07SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381077",
          name: "PMJX08SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381093",
          name: "PMJX11SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381073",
          name: "PMTX01SO",
          familyId: "T12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "0270248149",
          name: "PMJX12SE",
          familyId: "J12",
          package: "Discrete",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381074",
          name: "PMTX13SO",
          familyId: "T12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "0270248150",
          name: "PMJX15SE",
          familyId: "J12",
          package: "Discrete",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "0270248139",
          name: "PMTX05SE",
          familyId: "T12",
          package: "Discrete",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMJW07SG",
          name: "PMJW07SG",
          familyId: "J7",
          package: "Discrete",
          dieArea_mm2: 14.0,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMJW07SD",
          name: "PMJW07SD",
          familyId: "J7",
          package: "Discrete",
          dieArea_mm2: 14.0,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMJX09SO",
          name: "PMJX09SO",
          familyId: "J12",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMJWSO-39mm2",
          name: "PMJWSO-39mm²",
          familyId: "J7",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBXSOSO-34mm2",
          name: "PMBXSOSO-34mm²",
          familyId: "B12",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBWSO-20mm2",
          name: "PMBWSO-20mm²",
          familyId: "B7",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBWSO-25mm2",
          name: "PMBWSO-25mm²",
          familyId: "B7",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBX03SO",
          name: "PMBX03SO",
          familyId: "B12",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBXXSO-25mm2",
          name: "PMBXXSO-25mm²",
          familyId: "B12",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        }
      ],
      chipTypeTechnologies: [
        { ttnr: "0270248136", technologyIds: ["fab_yield", "kgd_j7"] },
        { ttnr: "0270248138", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "PMBXSO-41mm2", technologyIds: ["fab_yield", "kgd_j12", "sakasa", "kgd_sc"] },
        { ttnr: "1277381071", technologyIds: ["fab_yield", "kgd_j7"] },
        { ttnr: "1277381069", technologyIds: ["fab_yield", "kgd_j7", "wlbi", "sakasa"] },
        { ttnr: "1277133169", technologyIds: ["fab_yield", "kgd_j7", "kgd_t_r"] },
        { ttnr: "1277381066", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "1277381075", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381076", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381068", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381090", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "1277381077", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381093", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "1277381073", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "0270248149", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381074", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "0270248150", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "0270248139", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "PMJW07SG", technologyIds: ["fab_yield", "kgd_j7"] },
        { ttnr: "PMJW07SD", technologyIds: ["fab_yield", "kgd_j7"] },
        { ttnr: "PMJX09SO", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "PMJWSO-39mm2", technologyIds: ["fab_yield", "kgd_j7", "kgd_t_r"] },
        { ttnr: "PMBXSOSO-34mm2", technologyIds: ["fab_yield", "kgd_j12", "sakasa", "kgd_sc"] },
        { ttnr: "PMBWSO-20mm2", technologyIds: ["fab_yield", "kgd_j12", "sakasa", "kgd_t_r"] },
        { ttnr: "PMBWSO-25mm2", technologyIds: ["fab_yield", "kgd_j12", "sakasa", "kgd_t_r"] },
        { ttnr: "PMBX03SO", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "PMBXXSO-25mm2", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] }
      ]
    },
    RseP: {
      families: [
        { id: "S40", name: "S40", D0: 0.36, D_in: 0.06, t: 1.7, t_start: 0.1 },
        { id: "M70", name: "M70", D0: 0.49, D_in: 0.08, t: 1.5, t_start: 0.05 },
        { id: "G22", name: "G22", D0: 0.28, D_in: 0.04, t: 2.0, t_start: 0.2 },
        { id: "J7", name: "J7", D0: 0.36, D_in: 0.06, t: 1.7, t_start: 0.1 },
        { id: "T12", name: "T12", D0: 0.36, D_in: 0.06, t: 1.7, t_start: 0.1 },
        { id: "B12", name: "B12", D0: 0.36, D_in: 0.06, t: 1.7, t_start: 0.1 },
        { id: "J12", name: "J12", D0: 0.36, D_in: 0.06, t: 1.7, t_start: 0.1 },
        { id: "B7", name: "B7", D0: 0.36, D_in: 0.06, t: 1.7, t_start: 0.1 }
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
          description: "KGD Yield Screening",
          targetField: "KGD",
          staticExtraPct: 93.4,
          isDynamic: true,
          yearlyOverrides: [
            { year: 2026, extraPct: 1.7 },
            { year: 2027, extraPct: 1.0 },
            { year: 2028, extraPct: 0.7 },
            { year: 2029, extraPct: 0.4 },
            { year: 2030, extraPct: 0.2 },
            { year: 2031, extraPct: 0.3 },
            { year: 2032, extraPct: 0.0 },
            { year: 2033, extraPct: 0.0 },
            { year: 2034, extraPct: 0.0 },
            { year: 2035, extraPct: 0.0 }
          ]
        },
        {
          id: "kgd_t_r",
          name: "KGD T&R",
          description: "KGD Taping & Reeling",
          targetField: "KGD",
          staticExtraPct: 99.0,
          isDynamic: false,
          yearlyOverrides: []
        },
        {
          id: "sakasa",
          name: "Sakasa",
          description: "Verbesserte Sägestabilität",
          targetField: "SAW",
          staticExtraPct: 1.4,
          isDynamic: false,
          yearlyOverrides: []
        }
      ],
      chipTypes: [
        {
          ttnr: "0270248136",
          name: "PMJW07SE",
          familyId: "J7",
          package: "D2PAK",
          dieArea_mm2: 14.0,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "0270248138",
          name: "PMTX04SE",
          familyId: "T12",
          package: "D2PAK",
          dieArea_mm2: 11.3,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBXSO-41mm2",
          name: "PMBXSO - 41 mm2",
          familyId: "B12",
          package: "Bare Die",
          dieArea_mm2: 41.0,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381071",
          name: "PMJW03SO",
          familyId: "J7",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381069",
          name: "PMJW06SO",
          familyId: "J7",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277133169",
          name: "PMJW13SO",
          familyId: "J7",
          package: "Chip",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381066",
          name: "PMJX03SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381075",
          name: "PMJX04SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381076",
          name: "PMJX05SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381068",
          name: "PMJX06SO",
          familyId: "J12",
          package: "Chip",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381090",
          name: "PMJX07SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381077",
          name: "PMJX08SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381093",
          name: "PMJX11SO",
          familyId: "J12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381073",
          name: "PMTX01SO",
          familyId: "T12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "0270248149",
          name: "PMJX12SE",
          familyId: "J12",
          package: "Discrete",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "1277381074",
          name: "PMTX13SO",
          familyId: "T12",
          package: "CHIP",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "0270248150",
          name: "PMJX15SE",
          familyId: "J12",
          package: "Discrete",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "0270248139",
          name: "PMTX05SE",
          familyId: "T12",
          package: "Discrete",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMJW07SG",
          name: "PMJW07SG",
          familyId: "J7",
          package: "Discrete",
          dieArea_mm2: 14.0,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMJW07SD",
          name: "PMJW07SD",
          familyId: "J7",
          package: "Discrete",
          dieArea_mm2: 14.0,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMJX09SO",
          name: "PMJX09SO",
          familyId: "J12",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMJWSO-39mm2",
          name: "PMJWSO-39mm²",
          familyId: "J7",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBXSOSO-34mm2",
          name: "PMBXSOSO-34mm²",
          familyId: "B12",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBWSO-20mm2",
          name: "PMBWSO-20mm²",
          familyId: "B7",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBWSO-25mm2",
          name: "PMBWSO-25mm²",
          familyId: "B7",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBX03SO",
          name: "PMBX03SO",
          familyId: "B12",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        },
        {
          ttnr: "PMBXXSO-25mm2",
          name: "PMBXXSO-25mm²",
          familyId: "B12",
          package: "Bare Die",
          dieArea_mm2: null,
          cw: null,
          specialStartYear: 2026
        }
      ],
      chipTypeTechnologies: [
        { ttnr: "0270248136", technologyIds: ["fab_yield", "kgd_j7"] },
        { ttnr: "0270248138", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "PMBXSO-41mm2", technologyIds: ["fab_yield", "kgd_j12", "sakasa", "kgd_sc"] },
        { ttnr: "1277381071", technologyIds: ["fab_yield", "kgd_j7"] },
        { ttnr: "1277381069", technologyIds: ["fab_yield", "kgd_j7", "wlbi", "sakasa"] },
        { ttnr: "1277133169", technologyIds: ["fab_yield", "kgd_j7", "kgd_t_r"] },
        { ttnr: "1277381066", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "1277381075", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381076", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381068", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381090", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "1277381077", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381093", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "1277381073", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "0270248149", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "1277381074", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "0270248150", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "0270248139", technologyIds: ["fab_yield", "kgd_j12"] },
        { ttnr: "PMJW07SG", technologyIds: ["fab_yield", "kgd_j7"] },
        { ttnr: "PMJW07SD", technologyIds: ["fab_yield", "kgd_j7"] },
        { ttnr: "PMJX09SO", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "PMJWSO-39mm2", technologyIds: ["fab_yield", "kgd_j7", "kgd_t_r"] },
        { ttnr: "PMBXSOSO-34mm2", technologyIds: ["fab_yield", "kgd_j12", "sakasa", "kgd_sc"] },
        { ttnr: "PMBWSO-20mm2", technologyIds: ["fab_yield", "kgd_j12", "sakasa", "kgd_t_r"] },
        { ttnr: "PMBWSO-25mm2", technologyIds: ["fab_yield", "kgd_j12", "sakasa", "kgd_t_r"] },
        { ttnr: "PMBX03SO", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] },
        { ttnr: "PMBXXSO-25mm2", technologyIds: ["fab_yield", "kgd_j12", "wlbi", "sakasa"] }
      ]
    }
  }
};
