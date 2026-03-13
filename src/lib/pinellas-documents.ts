// Pinellas County, FL — Residential Construction Document Templates
// 83 documents organized by tab (inicio / disciplinas) and discipline

export interface PinellasDocTemplate {
  tab: "inicio" | "disciplinas";
  discipline: string;
  name: string;
  description?: string;
  is_mandatory: boolean;
  is_florida_specific: boolean;
  pinellas_reference?: string;
  priority: "critical" | "high" | "medium" | "low";
  assigned_role: "admin" | "gc" | "client";
  expiration_alert_days?: number;
  has_expiration?: boolean;
  sequence: number;
  subcategory?: string;
}

// ═══════════════════════════════════════
// DISCIPLINE METADATA
// ═══════════════════════════════════════
export const DISCIPLINES: Record<string, { icon: string; color: string; label: string }> = {
  Permits: { icon: "🏛", color: "#1E40AF", label: "Permisos & Regulatorio" },
  Legal: { icon: "📋", color: "#7C3AED", label: "Contratos" },
  Insurance: { icon: "🛡", color: "#059669", label: "Seguros" },
  Financial: { icon: "💰", color: "#D97706", label: "Financiero" },
  Technical: { icon: "📐", color: "#0F1B2D", label: "Técnico Inicio" },
  Contractors: { icon: "👷", color: "#92400E", label: "Contratistas" },
  Architecture: { icon: "📐", color: "#7C3AED", label: "Architecture" },
  Structural: { icon: "🏗", color: "#1D4ED8", label: "Structural Engineering" },
  Civil: { icon: "🌍", color: "#059669", label: "Civil / Site" },
  MEP: { icon: "⚡", color: "#D97706", label: "MEP" },
  Geotechnical: { icon: "🔬", color: "#92400E", label: "Geotechnical" },
  Environmental: { icon: "🌿", color: "#065F46", label: "Environmental" },
  Inspections: { icon: "🔍", color: "#1E40AF", label: "Inspecciones" },
  "Lien Waivers": { icon: "✍️", color: "#DC2626", label: "Lien Waivers" },
  Closeout: { icon: "🏁", color: "#0D7377", label: "Closeout" },
};

// ═══════════════════════════════════════
// TAB 1 — INICIO (30 docs)
// ═══════════════════════════════════════
const INICIO_DOCS: PinellasDocTemplate[] = [
  // PERMISOS & REGULATORIO
  { tab: "inicio", discipline: "Permits", name: "Building Permit — Pinellas County BDS", pinellas_reference: "Pinellas County Building & Development Services", is_mandatory: true, is_florida_specific: true, priority: "critical", assigned_role: "admin", has_expiration: true, expiration_alert_days: 30, sequence: 1 },
  { tab: "inicio", discipline: "Permits", name: "Notice of Commencement (NOC)", description: "Must be recorded before first draw", pinellas_reference: "Florida Statute § 713.13", is_mandatory: true, is_florida_specific: true, priority: "critical", assigned_role: "admin", sequence: 2 },
  { tab: "inicio", discipline: "Permits", name: "Certificate of Occupancy (CO)", pinellas_reference: "Required before occupancy", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "admin", sequence: 3 },
  { tab: "inicio", discipline: "Permits", name: "FEMA Elevation Certificate", pinellas_reference: "Required for flood zone properties", is_mandatory: false, is_florida_specific: true, priority: "high", assigned_role: "admin", sequence: 4 },
  { tab: "inicio", discipline: "Permits", name: "Zoning/Land Use Approval", pinellas_reference: "Pinellas County Planning Department", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 5 },
  { tab: "inicio", discipline: "Permits", name: "Environmental Resource Permit (ERP)", pinellas_reference: "Southwest Florida Water Management District", is_mandatory: false, is_florida_specific: true, priority: "medium", assigned_role: "admin", sequence: 6 },
  { tab: "inicio", discipline: "Permits", name: "Right-of-Way Permit", pinellas_reference: "Pinellas County Public Works", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 7 },
  { tab: "inicio", discipline: "Permits", name: "Stormwater Management Approval", pinellas_reference: "Pinellas County Stormwater", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 8 },

  // CONTRATOS
  { tab: "inicio", discipline: "Legal", name: "GC Contract (AIA Form or equivalent)", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "admin", sequence: 9 },
  { tab: "inicio", discipline: "Legal", name: "Loan Agreement / Construction Loan Docs", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "admin", sequence: 10 },
  { tab: "inicio", discipline: "Legal", name: "Title Insurance Commitment", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 11 },
  { tab: "inicio", discipline: "Legal", name: "Operating Agreement LLC", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 12 },
  { tab: "inicio", discipline: "Legal", name: "Owner-Builder Affidavit OR Licensed Contractor Verification", pinellas_reference: "Florida Statute § 489", is_mandatory: true, is_florida_specific: true, priority: "high", assigned_role: "admin", sequence: 13 },

  // SEGUROS
  { tab: "inicio", discipline: "Insurance", name: "Builder's Risk Insurance", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "admin", has_expiration: true, expiration_alert_days: 30, sequence: 14 },
  { tab: "inicio", discipline: "Insurance", name: "General Liability Insurance (GC)", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "gc", has_expiration: true, expiration_alert_days: 30, sequence: 15 },
  { tab: "inicio", discipline: "Insurance", name: "Workers' Compensation Insurance (GC)", pinellas_reference: "Florida Statute § 440", is_mandatory: true, is_florida_specific: true, priority: "high", assigned_role: "gc", has_expiration: true, expiration_alert_days: 30, sequence: 16 },
  { tab: "inicio", discipline: "Insurance", name: "Flood Insurance (if SFHA zone)", pinellas_reference: "NFIP — Required for federally backed loans", is_mandatory: false, is_florida_specific: true, priority: "medium", assigned_role: "admin", has_expiration: true, expiration_alert_days: 30, sequence: 17 },

  // FINANCIERO
  { tab: "inicio", discipline: "Financial", name: "Appraisal Report (ARV)", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 18 },
  { tab: "inicio", discipline: "Financial", name: "Survey (Boundary + Topographic)", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 19 },
  { tab: "inicio", discipline: "Financial", name: "Closing Statement (HUD-1 / CD)", is_mandatory: true, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 20 },
  { tab: "inicio", discipline: "Financial", name: "Draw Schedule Agreement", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 21 },
  { tab: "inicio", discipline: "Financial", name: "Impact Fee Receipt", pinellas_reference: "Pinellas County Impact Fees", is_mandatory: false, is_florida_specific: true, priority: "medium", assigned_role: "admin", sequence: 22 },

  // TÉCNICO INICIO
  { tab: "inicio", discipline: "Technical", name: "Approved Architectural Plans (Signed & Sealed)", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "admin", sequence: 23 },
  { tab: "inicio", discipline: "Technical", name: "Structural Engineering Plans (Signed & Sealed)", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "admin", sequence: 24 },
  { tab: "inicio", discipline: "Technical", name: "Geotechnical / Soil Report", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 25 },
  { tab: "inicio", discipline: "Technical", name: "Energy Code Compliance (Florida Energy Code)", pinellas_reference: "Florida Building Code — Energy", is_mandatory: true, is_florida_specific: true, priority: "medium", assigned_role: "admin", sequence: 26 },

  // CONTRATISTAS
  { tab: "inicio", discipline: "Contractors", name: "GC State License (CBC or CGC)", pinellas_reference: "Florida DBPR — Division of Building Permits", is_mandatory: true, is_florida_specific: true, priority: "critical", assigned_role: "gc", has_expiration: true, expiration_alert_days: 60, sequence: 27 },
  { tab: "inicio", discipline: "Contractors", name: "GC W-9 Form", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "gc", sequence: 28 },
  { tab: "inicio", discipline: "Contractors", name: "GC Certificate of Insurance (COI)", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "gc", has_expiration: true, expiration_alert_days: 30, sequence: 29 },
  { tab: "inicio", discipline: "Contractors", name: "GC Lien Law Notice (Preliminary Notice)", pinellas_reference: "Florida Statute § 713.06", is_mandatory: true, is_florida_specific: true, priority: "high", assigned_role: "gc", sequence: 30 },
];

// ═══════════════════════════════════════
// TAB 2 — DISCIPLINAS (53 docs)
// ═══════════════════════════════════════
const DISCIPLINAS_DOCS: PinellasDocTemplate[] = [
  // ARCHITECTURE
  { tab: "disciplinas", discipline: "Architecture", name: "Architectural Plans — Schematic Design (SD)", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 1 },
  { tab: "disciplinas", discipline: "Architecture", name: "Architectural Plans — Design Development (DD)", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 2 },
  { tab: "disciplinas", discipline: "Architecture", name: "Architectural Plans — Construction Documents (CD)", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 3 },
  { tab: "disciplinas", discipline: "Architecture", name: "Site Plan", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 4 },
  { tab: "disciplinas", discipline: "Architecture", name: "Floor Plans (all levels)", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 5 },
  { tab: "disciplinas", discipline: "Architecture", name: "Elevations (all 4 sides)", is_mandatory: true, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 6 },
  { tab: "disciplinas", discipline: "Architecture", name: "Sections", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 7 },
  { tab: "disciplinas", discipline: "Architecture", name: "Details & Specifications", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 8 },
  { tab: "disciplinas", discipline: "Architecture", name: "Window & Door Schedule", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "admin", sequence: 9 },
  { tab: "disciplinas", discipline: "Architecture", name: "Finish Schedule", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "admin", sequence: 10 },
  { tab: "disciplinas", discipline: "Architecture", name: "Accessibility Compliance (ADA if applicable)", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "admin", sequence: 11 },
  { tab: "disciplinas", discipline: "Architecture", name: "As-Built Plans", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 12 },

  // STRUCTURAL
  { tab: "disciplinas", discipline: "Structural", name: "Structural Engineering Plans (Signed & Sealed)", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "admin", sequence: 1 },
  { tab: "disciplinas", discipline: "Structural", name: "Foundation Design", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 2 },
  { tab: "disciplinas", discipline: "Structural", name: "Framing Plans", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 3 },
  { tab: "disciplinas", discipline: "Structural", name: "Structural Calculations", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 4 },
  { tab: "disciplinas", discipline: "Structural", name: "Special Inspection Program", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 5 },
  { tab: "disciplinas", discipline: "Structural", name: "Wind Load Analysis", pinellas_reference: "Florida Building Code — High Velocity Hurricane Zone requirements", is_mandatory: true, is_florida_specific: true, priority: "critical", assigned_role: "admin", sequence: 6 },
  { tab: "disciplinas", discipline: "Structural", name: "Concrete Mix Design", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "gc", sequence: 7 },
  { tab: "disciplinas", discipline: "Structural", name: "Steel Shop Drawings", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "gc", sequence: 8 },
  { tab: "disciplinas", discipline: "Structural", name: "Structural As-Builts", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 9 },

  // CIVIL
  { tab: "disciplinas", discipline: "Civil", name: "Boundary Survey", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 1 },
  { tab: "disciplinas", discipline: "Civil", name: "Topographic Survey", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 2 },
  { tab: "disciplinas", discipline: "Civil", name: "Site Plan", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 3 },
  { tab: "disciplinas", discipline: "Civil", name: "Grading & Drainage Plan", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 4 },
  { tab: "disciplinas", discipline: "Civil", name: "Erosion Control Plan (SWPPP)", pinellas_reference: "NPDES Permit requirement", is_mandatory: true, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 5 },
  { tab: "disciplinas", discipline: "Civil", name: "Utility Plan (water, sewer, storm)", is_mandatory: true, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 6 },
  { tab: "disciplinas", discipline: "Civil", name: "Paving & Hardscape Plan", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "admin", sequence: 7 },
  { tab: "disciplinas", discipline: "Civil", name: "Landscape Plan", pinellas_reference: "Pinellas County Landscape Ordinance", is_mandatory: false, is_florida_specific: true, priority: "low", assigned_role: "admin", sequence: 8 },
  { tab: "disciplinas", discipline: "Civil", name: "Stormwater Calculations", is_mandatory: true, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 9 },
  { tab: "disciplinas", discipline: "Civil", name: "Civil As-Builts", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 10 },

  // MEP
  { tab: "disciplinas", discipline: "MEP", name: "HVAC Plans & Equipment Schedule", subcategory: "Mechanical", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 1 },
  { tab: "disciplinas", discipline: "MEP", name: "Manual J Load Calculation", subcategory: "Mechanical", pinellas_reference: "Florida Energy Code requirement", is_mandatory: true, is_florida_specific: true, priority: "high", assigned_role: "admin", sequence: 2 },
  { tab: "disciplinas", discipline: "MEP", name: "Mechanical Specifications", subcategory: "Mechanical", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 3 },
  { tab: "disciplinas", discipline: "MEP", name: "HVAC As-Builts", subcategory: "Mechanical", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 4 },
  { tab: "disciplinas", discipline: "MEP", name: "Electrical Plans (service, panels, circuits)", subcategory: "Electrical", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 5 },
  { tab: "disciplinas", discipline: "MEP", name: "Load Calculations", subcategory: "Electrical", is_mandatory: true, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 6 },
  { tab: "disciplinas", discipline: "MEP", name: "Lighting Plan & Schedule", subcategory: "Electrical", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "admin", sequence: 7 },
  { tab: "disciplinas", discipline: "MEP", name: "Solar/PV Plans (if applicable)", subcategory: "Electrical", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "admin", sequence: 8 },
  { tab: "disciplinas", discipline: "MEP", name: "Electrical As-Builts", subcategory: "Electrical", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 9 },
  { tab: "disciplinas", discipline: "MEP", name: "Plumbing Plans (supply, drain, vent)", subcategory: "Plumbing", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 10 },
  { tab: "disciplinas", discipline: "MEP", name: "Plumbing Isometrics", subcategory: "Plumbing", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 11 },
  { tab: "disciplinas", discipline: "MEP", name: "Fixture Schedule", subcategory: "Plumbing", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "admin", sequence: 12 },
  { tab: "disciplinas", discipline: "MEP", name: "Plumbing As-Builts", subcategory: "Plumbing", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 13 },

  // GEOTECHNICAL
  { tab: "disciplinas", discipline: "Geotechnical", name: "Geotechnical Investigation Report", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 1 },
  { tab: "disciplinas", discipline: "Geotechnical", name: "Soil Boring Logs", is_mandatory: true, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 2 },
  { tab: "disciplinas", discipline: "Geotechnical", name: "Percolation Test (if septic)", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 3 },
  { tab: "disciplinas", discipline: "Geotechnical", name: "Foundation Recommendations", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 4 },
  { tab: "disciplinas", discipline: "Geotechnical", name: "Compaction Testing Reports", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "gc", sequence: 5 },

  // ENVIRONMENTAL
  { tab: "disciplinas", discipline: "Environmental", name: "Environmental Site Assessment (Phase I)", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 1 },
  { tab: "disciplinas", discipline: "Environmental", name: "Wetland Delineation (if applicable)", pinellas_reference: "SWFWMD / Army Corps of Engineers", is_mandatory: false, is_florida_specific: true, priority: "medium", assigned_role: "admin", sequence: 2 },
  { tab: "disciplinas", discipline: "Environmental", name: "Species Survey (if applicable)", pinellas_reference: "Florida Fish & Wildlife Conservation", is_mandatory: false, is_florida_specific: true, priority: "low", assigned_role: "admin", sequence: 3 },
  { tab: "disciplinas", discipline: "Environmental", name: "Contamination Assessment (Phase II if needed)", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "admin", sequence: 4 },
  { tab: "disciplinas", discipline: "Environmental", name: "Environmental Permit (ERP)", is_mandatory: false, is_florida_specific: true, priority: "medium", assigned_role: "admin", sequence: 5 },
  { tab: "disciplinas", discipline: "Environmental", name: "FEMA LOMA/LOMR (if flood zone amendment)", is_mandatory: false, is_florida_specific: true, priority: "medium", assigned_role: "admin", sequence: 6 },

  // INSPECTIONS
  { tab: "disciplinas", discipline: "Inspections", name: "Foundation Inspection Sign-off", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "gc", sequence: 1 },
  { tab: "disciplinas", discipline: "Inspections", name: "Rough Framing Inspection", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "gc", sequence: 2 },
  { tab: "disciplinas", discipline: "Inspections", name: "Rough MEP Inspections (Mechanical, Electrical, Plumbing)", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "gc", sequence: 3 },
  { tab: "disciplinas", discipline: "Inspections", name: "Insulation Inspection", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "gc", sequence: 4 },
  { tab: "disciplinas", discipline: "Inspections", name: "Drywall/Sheathing Inspection", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "gc", sequence: 5 },
  { tab: "disciplinas", discipline: "Inspections", name: "Final Building Inspection", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "gc", sequence: 6 },
  { tab: "disciplinas", discipline: "Inspections", name: "Final MEP Inspections", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "gc", sequence: 7 },
  { tab: "disciplinas", discipline: "Inspections", name: "Certificate of Occupancy (CO)", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "admin", sequence: 8 },
  { tab: "disciplinas", discipline: "Inspections", name: "Elevator Inspection (if applicable)", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "gc", sequence: 9 },
  { tab: "disciplinas", discipline: "Inspections", name: "Fire Marshal Inspection (if applicable)", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "gc", sequence: 10 },

  // LIEN WAIVERS
  { tab: "disciplinas", discipline: "Lien Waivers", name: "Conditional Waiver on Progress Payment", pinellas_reference: "Florida Statute § 713.20", is_mandatory: true, is_florida_specific: true, priority: "high", assigned_role: "gc", sequence: 1 },
  { tab: "disciplinas", discipline: "Lien Waivers", name: "Unconditional Waiver on Progress Payment", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "gc", sequence: 2 },
  { tab: "disciplinas", discipline: "Lien Waivers", name: "Conditional Waiver on Final Payment", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "gc", sequence: 3 },
  { tab: "disciplinas", discipline: "Lien Waivers", name: "Unconditional Waiver on Final Payment", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "gc", sequence: 4 },
  { tab: "disciplinas", discipline: "Lien Waivers", name: "Subcontractor Waivers (per draw)", is_mandatory: true, is_florida_specific: false, priority: "medium", assigned_role: "gc", sequence: 5 },
  { tab: "disciplinas", discipline: "Lien Waivers", name: "Supplier Waivers (per draw)", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "gc", sequence: 6 },
  { tab: "disciplinas", discipline: "Lien Waivers", name: "Final Lien Waiver — GC", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "gc", sequence: 7 },
  { tab: "disciplinas", discipline: "Lien Waivers", name: "Final Lien Waiver — All Subs", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "gc", sequence: 8 },

  // CLOSEOUT
  { tab: "disciplinas", discipline: "Closeout", name: "Punch List (signed by GC + Owner)", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "gc", sequence: 1 },
  { tab: "disciplinas", discipline: "Closeout", name: "Certificate of Occupancy (CO)", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "admin", sequence: 2 },
  { tab: "disciplinas", discipline: "Closeout", name: "Warranty — GC (1 year minimum)", pinellas_reference: "Florida Statute § 558", is_mandatory: true, is_florida_specific: true, priority: "high", assigned_role: "gc", sequence: 3 },
  { tab: "disciplinas", discipline: "Closeout", name: "Warranty — Manufacturer Equipment", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "gc", sequence: 4 },
  { tab: "disciplinas", discipline: "Closeout", name: "Operation & Maintenance Manuals", is_mandatory: false, is_florida_specific: false, priority: "medium", assigned_role: "gc", sequence: 5 },
  { tab: "disciplinas", discipline: "Closeout", name: "As-Built Plans (all disciplines)", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "gc", sequence: 6 },
  { tab: "disciplinas", discipline: "Closeout", name: "Final Lien Waivers (all parties)", is_mandatory: true, is_florida_specific: false, priority: "critical", assigned_role: "gc", sequence: 7 },
  { tab: "disciplinas", discipline: "Closeout", name: "Final Accounting / Cost Statement", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 8 },
  { tab: "disciplinas", discipline: "Closeout", name: "Property Insurance Transition", is_mandatory: true, is_florida_specific: false, priority: "high", assigned_role: "admin", sequence: 9 },
  { tab: "disciplinas", discipline: "Closeout", name: "HOA Turnover Documents (if applicable)", is_mandatory: false, is_florida_specific: false, priority: "low", assigned_role: "admin", sequence: 10 },
];

export const ALL_PINELLAS_DOCS: PinellasDocTemplate[] = [...INICIO_DOCS, ...DISCIPLINAS_DOCS];

export const INICIO_DISCIPLINES = ["Permits", "Legal", "Insurance", "Financial", "Technical", "Contractors"] as const;
export const DISCIPLINAS_DISCIPLINES = ["Architecture", "Structural", "Civil", "MEP", "Geotechnical", "Environmental", "Inspections", "Lien Waivers", "Closeout"] as const;
