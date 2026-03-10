export const PHASE_OPTIONS = [
  "Pre-Construction", "Foundation", "Framing", "MEP", "Enclosure", "Finishes", "Closeout",
] as const;

export const WEATHER_OPTIONS = [
  "Despejado", "Nublado", "Lluvia leve", "Lluvia intensa", "Calor extremo",
] as const;

export const QUALITY_ISSUE_CATEGORIES = [
  "Estructural", "MEP", "Acabados", "Código", "Seguridad", "Otro",
] as const;

export const SEVERITY_OPTIONS = [
  { value: "critical", label: "CRÍTICO", color: "bg-[#FEE2E2] text-[#991B1B]" },
  { value: "high", label: "ALTO", color: "bg-[#FFEDD5] text-[#9A3412]" },
  { value: "medium", label: "MEDIO", color: "bg-[#FEF9C3] text-[#854D0E]" },
  { value: "low", label: "BAJO", color: "bg-[#F3F4F6] text-[#6B7280]" },
] as const;

export const QUALITY_STATUS_OPTIONS = [
  { value: "open", label: "Abierto", color: "bg-[#FEE2E2] text-[#991B1B]" },
  { value: "in_progress", label: "En resolución", color: "bg-[#DBEAFE] text-[#1E40AF]" },
  { value: "resolved", label: "Resuelto ✓", color: "bg-[#D1FAE5] text-[#065F46]" },
  { value: "closed", label: "Cerrado", color: "bg-[#F3F4F6] text-[#6B7280]" },
] as const;

export type ChecklistItem = { phase: string; category: string; item: string; sequence: number };

export const PHASE_CHECKLISTS: Record<string, ChecklistItem[]> = {
  Foundation: [
    { phase: "Foundation", category: "Estructural", item: "Excavación a profundidad correcta según planos", sequence: 1 },
    { phase: "Foundation", category: "Estructural", item: "Compactación del suelo verificada", sequence: 2 },
    { phase: "Foundation", category: "Estructural", item: "Refuerzo de acero (rebar) colocado correctamente", sequence: 3 },
    { phase: "Foundation", category: "Estructural", item: "Encofrado alineado y a nivel", sequence: 4 },
    { phase: "Foundation", category: "Estructural", item: "Concreto mezclado según especificaciones", sequence: 5 },
    { phase: "Foundation", category: "Estructural", item: "Curado del concreto en proceso", sequence: 6 },
    { phase: "Foundation", category: "Estructural", item: "Drenaje perimetral instalado", sequence: 7 },
    { phase: "Foundation", category: "Código", item: "Inspección municipal de fundación aprobada", sequence: 8 },
  ],
  Framing: [
    { phase: "Framing", category: "Estructural", item: "Dimensiones de estructura según planos aprobados", sequence: 1 },
    { phase: "Framing", category: "Estructural", item: "Conexiones de metal (hurricane straps) instaladas", sequence: 2 },
    { phase: "Framing", category: "Estructural", item: "Aberturas de ventanas y puertas según planos", sequence: 3 },
    { phase: "Framing", category: "Código", item: "Espaciado de vigas según código Florida", sequence: 4 },
    { phase: "Framing", category: "Estructural", item: "Bloqueo y bridging instalado correctamente", sequence: 5 },
    { phase: "Framing", category: "MEP", item: "Penetraciones para MEP marcadas", sequence: 6 },
    { phase: "Framing", category: "Código", item: "Inspección municipal de framing programada", sequence: 7 },
    { phase: "Framing", category: "Estructural", item: "Protección contra humedad (house wrap) instalada", sequence: 8 },
  ],
  MEP: [
    { phase: "MEP", category: "MEP", item: "Recorrido eléctrico según planos aprobados", sequence: 1 },
    { phase: "MEP", category: "MEP", item: "Panel eléctrico correctamente dimensionado", sequence: 2 },
    { phase: "MEP", category: "MEP", item: "Plomería rough-in completa y sin fugas", sequence: 3 },
    { phase: "MEP", category: "MEP", item: "HVAC ductwork instalado según diseño", sequence: 4 },
    { phase: "MEP", category: "MEP", item: "Aislamiento térmico en tuberías", sequence: 5 },
    { phase: "MEP", category: "MEP", item: "Conexiones de gas verificadas (si aplica)", sequence: 6 },
    { phase: "MEP", category: "Código", item: "Inspección rough MEP municipal aprobada", sequence: 7 },
    { phase: "MEP", category: "Seguridad", item: "Fire blocking instalado en penetraciones", sequence: 8 },
  ],
  Enclosure: [
    { phase: "Enclosure", category: "Estructural", item: "Cubierta (roofing) instalada correctamente", sequence: 1 },
    { phase: "Enclosure", category: "Estructural", item: "Membrana impermeable sin daños", sequence: 2 },
    { phase: "Enclosure", category: "Acabados", item: "Ventanas y puertas selladas correctamente", sequence: 3 },
    { phase: "Enclosure", category: "MEP", item: "HVAC equipos exteriores instalados", sequence: 4 },
    { phase: "Enclosure", category: "Código", item: "Gutters y downspouts según código", sequence: 5 },
    { phase: "Enclosure", category: "Código", item: "Inspección de techo municipal aprobada", sequence: 6 },
  ],
  Finishes: [
    { phase: "Finishes", category: "Acabados", item: "Drywall instalado y acabado correctamente", sequence: 1 },
    { phase: "Finishes", category: "Acabados", item: "Pintura primer aplicada uniformemente", sequence: 2 },
    { phase: "Finishes", category: "Acabados", item: "Pisos instalados según especificaciones", sequence: 3 },
    { phase: "Finishes", category: "Acabados", item: "Carpintería y millwork según planos", sequence: 4 },
    { phase: "Finishes", category: "MEP", item: "Fixtures eléctricos instalados", sequence: 5 },
    { phase: "Finishes", category: "MEP", item: "Fixtures de plomería instalados", sequence: 6 },
    { phase: "Finishes", category: "MEP", item: "HVAC sistema operativo y calibrado", sequence: 7 },
    { phase: "Finishes", category: "Acabados", item: "Touch-ups y limpieza final en progreso", sequence: 8 },
  ],
  Closeout: [
    { phase: "Closeout", category: "Acabados", item: "Punch list completado al 100%", sequence: 1 },
    { phase: "Closeout", category: "Acabados", item: "Limpieza final del sitio completada", sequence: 2 },
    { phase: "Closeout", category: "Acabados", item: "Manuales y garantías recopilados", sequence: 3 },
    { phase: "Closeout", category: "Código", item: "Inspección final municipal aprobada", sequence: 4 },
    { phase: "Closeout", category: "Código", item: "Certificate of Occupancy recibido", sequence: 5 },
    { phase: "Closeout", category: "Acabados", item: "Llaves y accesos entregados al propietario", sequence: 6 },
  ],
};
