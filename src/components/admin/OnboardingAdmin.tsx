import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, Pencil, Eye, EyeOff,
  CalendarIcon, Download, Upload,
} from "lucide-react";

interface OnboardingItem {
  id: string;
  project_id: string | null;
  block: string;
  section: string;
  sequence: number;
  item_text: string;
  status: string | null;
  assigned_to: string | null;
  due_date: string | null;
  notes: string | null;
  visible_to_client: boolean | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const BLOCKS = [
  "Bloque 1 — Portafolio",
  "Bloque 2 — Dinero",
  "Bloque 3 — Mercado",
];

const BASE_CHECKLIST: { block: string; section: string; seq: number; text: string }[] = [
  // Bloque 1
  { block: "Bloque 1 — Portafolio", section: "Información base por proyecto", seq: 1, text: "Dirección completa de la propiedad" },
  { block: "Bloque 1 — Portafolio", section: "Información base por proyecto", seq: 2, text: "Folio de propiedad (Property Appraiser ID — Pinellas County)" },
  { block: "Bloque 1 — Portafolio", section: "Información base por proyecto", seq: 3, text: "Nombre de la LLC o entidad propietaria del lote" },
  { block: "Bloque 1 — Portafolio", section: "Información base por proyecto", seq: 4, text: "Nombre y contacto del General Contractor (GC)" },
  { block: "Bloque 1 — Portafolio", section: "Información base por proyecto", seq: 5, text: "Fase actual de construcción (descripción + % de avance estimado)" },
  { block: "Bloque 1 — Portafolio", section: "Información base por proyecto", seq: 6, text: "Fecha de inicio de obra" },
  { block: "Bloque 1 — Portafolio", section: "Información base por proyecto", seq: 7, text: "Fecha estimada de terminación (CO target)" },
  { block: "Bloque 1 — Portafolio", section: "Información del loan por proyecto", seq: 8, text: "Monto total del construction loan" },
  { block: "Bloque 1 — Portafolio", section: "Información del loan por proyecto", seq: 9, text: "Nombre del banco prestamista" },
  { block: "Bloque 1 — Portafolio", section: "Información del loan por proyecto", seq: 10, text: "Último draw aprobado: monto y fecha" },
  { block: "Bloque 1 — Portafolio", section: "Información del loan por proyecto", seq: 11, text: "Próximo draw estimado: monto y fecha tentativa" },
  { block: "Bloque 1 — Portafolio", section: "Documentos requeridos por proyecto", seq: 12, text: "Contrato de construcción con el GC" },
  { block: "Bloque 1 — Portafolio", section: "Documentos requeridos por proyecto", seq: 13, text: "Loan agreement con el banco" },
  { block: "Bloque 1 — Portafolio", section: "Documentos requeridos por proyecto", seq: 14, text: "Deed o título de la propiedad" },
  { block: "Bloque 1 — Portafolio", section: "Documentos requeridos por proyecto", seq: 15, text: "Permisos de construcción activos (Building Permit — City of St. Pete / Pinellas County)" },
  { block: "Bloque 1 — Portafolio", section: "Documentos requeridos por proyecto", seq: 16, text: "Último draw request aprobado con todos sus soportes" },
  { block: "Bloque 1 — Portafolio", section: "Documentos requeridos por proyecto", seq: 17, text: "Schedule of Values (SOV) original del GC" },
  // Bloque 2
  { block: "Bloque 2 — Dinero", section: "Modelo financiero por proyecto", seq: 18, text: "Costo total desglosado: land cost" },
  { block: "Bloque 2 — Dinero", section: "Modelo financiero por proyecto", seq: 19, text: "Costo total desglosado: hard costs (construcción)" },
  { block: "Bloque 2 — Dinero", section: "Modelo financiero por proyecto", seq: 20, text: "Costo total desglosado: soft costs (diseño, permisos, legal)" },
  { block: "Bloque 2 — Dinero", section: "Modelo financiero por proyecto", seq: 21, text: "Costo total desglosado: financing costs (intereses del loan)" },
  { block: "Bloque 2 — Dinero", section: "Modelo financiero por proyecto", seq: 22, text: "Precio de venta objetivo por casa" },
  { block: "Bloque 2 — Dinero", section: "Modelo financiero por proyecto", seq: 23, text: "Capital propio invertido (equity) vs. monto financiado por banco" },
  { block: "Bloque 2 — Dinero", section: "Calendario de draws", seq: 24, text: "Calendario de draws ya ejecutados: fechas y montos" },
  { block: "Bloque 2 — Dinero", section: "Calendario de draws", seq: 25, text: "Calendario estimado de draws restantes: fechas y montos" },
  { block: "Bloque 2 — Dinero", section: "Calendario de draws", seq: 26, text: "Tasa de interés del loan (fija o variable)" },
  { block: "Bloque 2 — Dinero", section: "Calendario de draws", seq: 27, text: "Término del loan (meses)" },
  { block: "Bloque 2 — Dinero", section: "Calendario de draws", seq: 28, text: "Fecha de vencimiento del loan" },
  { block: "Bloque 2 — Dinero", section: "Paz y salvos / Lien waivers", seq: 29, text: "Lista completa de subcontratistas y proveedores activos por proyecto" },
  { block: "Bloque 2 — Dinero", section: "Paz y salvos / Lien waivers", seq: 30, text: "Estado de cuentas por pagar: quién está al día, quién tiene facturas pendientes" },
  { block: "Bloque 2 — Dinero", section: "Paz y salvos / Lien waivers", seq: 31, text: "¿Existe algún Notice to Owner (NTO) activo o conocido?" },
  { block: "Bloque 2 — Dinero", section: "Paz y salvos / Lien waivers", seq: 32, text: "¿Hay algún lien registrado o disputa de pago abierta?" },
  { block: "Bloque 2 — Dinero", section: "Paz y salvos / Lien waivers", seq: 33, text: "Lien waivers recopilados en draws anteriores (Conditional/Unconditional, Partial/Final)" },
  { block: "Bloque 2 — Dinero", section: "Estructura societaria", seq: 34, text: "Nombre exacto de cada LLC involucrada" },
  { block: "Bloque 2 — Dinero", section: "Estructura societaria", seq: 35, text: "EIN (Tax ID) de cada LLC" },
  { block: "Bloque 2 — Dinero", section: "Estructura societaria", seq: 36, text: "Operating Agreement de cada entidad" },
  { block: "Bloque 2 — Dinero", section: "Estructura societaria", seq: 37, text: "Nombre del Registered Agent de cada LLC" },
  { block: "Bloque 2 — Dinero", section: "Estructura societaria", seq: 38, text: "Fecha del último Annual Report presentado ante Sunbiz (Florida)" },
  { block: "Bloque 2 — Dinero", section: "Estructura societaria", seq: 39, text: "¿Hay socios adicionales en alguna de las LLCs? (Nombres y porcentajes)" },
  { block: "Bloque 2 — Dinero", section: "Estructura societaria", seq: 40, text: "Nombre y contacto del CPA del cliente" },
  { block: "Bloque 2 — Dinero", section: "Estructura societaria", seq: 41, text: "Nombre y contacto del attorney corporativo del cliente" },
  // Bloque 3
  { block: "Bloque 3 — Mercado", section: "Análisis de mercado", seq: 42, text: "¿Tiene el cliente un realtor asignado para la venta? (Nombre y contacto)" },
  { block: "Bloque 3 — Mercado", section: "Análisis de mercado", seq: 43, text: "¿Cuál es el precio de lista pensado para cada casa?" },
  { block: "Bloque 3 — Mercado", section: "Análisis de mercado", seq: 44, text: "¿Hay alguna casa ya en contrato de venta o con comprador identificado?" },
  { block: "Bloque 3 — Mercado", section: "Análisis de mercado", seq: 45, text: "¿Existe algún appraisal reciente? (ARV report por proyecto)" },
  { block: "Bloque 3 — Mercado", section: "Análisis de mercado", seq: 46, text: "¿El cliente conoce proyectos comparables activos en la misma zona?" },
  { block: "Bloque 3 — Mercado", section: "Cerrar gaps identificados", seq: 47, text: "Documentos faltantes identificados en Bloques 1 y 2" },
  { block: "Bloque 3 — Mercado", section: "Cerrar gaps identificados", seq: 48, text: "Acceso al lender portal del banco (si existe plataforma online)" },
  { block: "Bloque 3 — Mercado", section: "Cerrar gaps identificados", seq: 49, text: "Acceso al email o plataforma del GC para historial de comunicaciones" },
  { block: "Bloque 3 — Mercado", section: "Cerrar gaps identificados", seq: 50, text: "Contacto: Loan Officer del banco (nombre, email, teléfono)" },
  { block: "Bloque 3 — Mercado", section: "Cerrar gaps identificados", seq: 51, text: "Contacto: Project Manager del GC (nombre, email, teléfono)" },
  { block: "Bloque 3 — Mercado", section: "Cerrar gaps identificados", seq: 52, text: "Contacto: Title Company (nombre y contacto)" },
  { block: "Bloque 3 — Mercado", section: "Cerrar gaps identificados", seq: 53, text: "Contacto: Inspector municipal / Building Department" },
];

function statusBadge(status: string) {
  switch (status) {
    case "completed": return { cls: "bg-[#F0FDF4] text-[#166534] border-0 text-[10px] font-bold", label: "✓ Recibido" };
    case "in_progress": return { cls: "bg-[#EFF6FF] text-[#1E40AF] border-0 text-[10px] font-bold", label: "En gestión" };
    case "na": return { cls: "bg-gray-100 text-gray-400 border-0 text-[10px]", label: "N/A" };
    default: return { cls: "bg-gray-100 text-gray-500 border-0 text-[10px]", label: "Pendiente" };
  }
}

function rowBg(status: string) {
  switch (status) {
    case "completed": return "bg-[#F0FDF4]";
    case "in_progress": return "bg-[#EFF6FF]";
    case "na": return "bg-gray-50 opacity-60";
    default: return "bg-white";
  }
}

function progressColor(pct: number) {
  if (pct >= 90) return "bg-[#16A34A]";
  if (pct >= 60) return "bg-[#CA8A04]";
  return "bg-[#DC2626]";
}

const OnboardingAdmin = ({ projectId }: { projectId: string }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set(BLOCKS));
  const [importOpen, setImportOpen] = useState(false);
  const [editItem, setEditItem] = useState<OnboardingItem | null>(null);
  const [editForm, setEditForm] = useState({ status: "pending", assigned_to: "", due_date: "", notes: "", visible_to_client: false });

  const fetchItems = async () => {
    const { data } = await supabase
      .from("onboarding_items")
      .select("*")
      .eq("project_id", projectId)
      .order("sequence");
    setItems((data as OnboardingItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [projectId]);

  const countable = items.filter((i) => i.status !== "na");
  const completed = countable.filter((i) => i.status === "completed");
  const totalPct = countable.length > 0 ? Math.round((completed.length / countable.length) * 100) : 0;

  const blockStats = (block: string) => {
    const blockItems = items.filter((i) => i.block === block);
    const c = blockItems.filter((i) => i.status !== "na");
    const done = c.filter((i) => i.status === "completed");
    return { total: c.length, done: done.length, pct: c.length > 0 ? Math.round((done.length / c.length) * 100) : 0 };
  };

  const toggleBlock = (block: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      next.has(block) ? next.delete(block) : next.add(block);
      return next;
    });
  };

  const toggleCheck = async (item: OnboardingItem) => {
    if (item.status === "na") return;
    const newStatus = item.status === "completed" ? "pending" : "completed";
    const update: any = {
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      completed_by: newStatus === "completed" ? user?.id : null,
    };
    await supabase.from("onboarding_items").update(update).eq("id", item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...update } : i)));
  };

  const toggleVisibility = async (item: OnboardingItem) => {
    const newVal = !item.visible_to_client;
    await supabase.from("onboarding_items").update({ visible_to_client: newVal }).eq("id", item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, visible_to_client: newVal } : i)));
  };

  const openEdit = (item: OnboardingItem) => {
    setEditItem(item);
    setEditForm({
      status: item.status || "pending",
      assigned_to: item.assigned_to || "",
      due_date: item.due_date || "",
      notes: item.notes || "",
      visible_to_client: item.visible_to_client ?? false,
    });
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const update: any = {
      status: editForm.status,
      assigned_to: editForm.assigned_to || null,
      due_date: editForm.due_date || null,
      notes: editForm.notes || null,
      visible_to_client: editForm.visible_to_client,
      updated_at: new Date().toISOString(),
    };
    if (editForm.status === "completed" && editItem.status !== "completed") {
      update.completed_at = new Date().toISOString();
      update.completed_by = user?.id;
    }
    if (editForm.status !== "completed") {
      update.completed_at = null;
      update.completed_by = null;
    }
    await supabase.from("onboarding_items").update(update).eq("id", editItem.id);
    toast.success("Ítem actualizado");
    setEditItem(null);
    fetchItems();
  };

  const importChecklist = async () => {
    // Delete existing items for this project first
    await supabase.from("onboarding_items").delete().eq("project_id", projectId);
    const rows = BASE_CHECKLIST.map((r) => ({
      project_id: projectId,
      block: r.block,
      section: r.section,
      sequence: r.seq,
      item_text: r.text,
      status: "pending",
      visible_to_client: false,
    }));
    await supabase.from("onboarding_items").insert(rows);
    toast.success("Checklist base cargado — 53 ítems");
    setImportOpen(false);
    fetchItems();
  };

  const exportState = () => {
    const lines = items.map((i) => `${i.sequence}. [${i.status === "completed" ? "✓" : i.status === "na" ? "N/A" : " "}] ${i.item_text}`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "onboarding-checklist.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  // Group items by block then section
  const grouped: Record<string, Record<string, OnboardingItem[]>> = {};
  for (const item of items) {
    if (!grouped[item.block]) grouped[item.block] = {};
    if (!grouped[item.block][item.section]) grouped[item.block][item.section] = [];
    grouped[item.block][item.section].push(item);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#0F1B2D]">Checklist de Onboarding</h2>
          <p className="text-[11px] text-gray-400">Información requerida para activar el servicio OPR</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-[11px] bg-white border-gray-300 text-gray-600" onClick={exportState}>
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar estado
          </Button>
          <Button size="sm" className="h-8 text-[11px] bg-[#0D7377] hover:bg-[#0B6163] text-white" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Cargar checklist base
          </Button>
        </div>
      </div>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cargar checklist base</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {items.length > 0 && (
              <p className="text-[12px] text-[#EA580C]">Este proyecto ya tiene {items.length} ítems. ¿Reemplazar con el checklist estándar 360lateral?</p>
            )}
            <p className="text-[12px] text-gray-500">Se cargarán 53 ítems organizados en 3 bloques.</p>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
              <Button size="sm" className="bg-[#0D7377] hover:bg-[#0B6163] text-white" onClick={importChecklist}>
                {items.length > 0 ? "Sí, reemplazar" : "Cargar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-medium text-[#0F1B2D]">
              Expediente: {completed.length} / {countable.length} ítems completados — {totalPct}%
            </p>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progressColor(totalPct)}`} style={{ width: `${totalPct}%` }} />
          </div>
        </div>
      )}

      {/* Block summary cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BLOCKS.map((block) => {
            const stats = blockStats(block);
            const shortName = block.replace("Bloque ", "B").split(" — ");
            return (
              <div key={block} className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
                <p className="text-[11px] text-gray-400 mb-0.5">{shortName[0]}</p>
                <p className="text-[13px] font-bold text-[#0F1B2D]">{shortName[1]}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${progressColor(stats.pct)}`} style={{ width: `${stats.pct}%` }} />
                  </div>
                  <span className="text-[11px] font-medium text-gray-500">{stats.done}/{stats.total}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{stats.pct}%</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-[13px] text-gray-500 mb-3">No hay ítems de onboarding. Carga el checklist base para empezar.</p>
          <Button size="sm" className="bg-[#0D7377] hover:bg-[#0B6163] text-white" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Cargar checklist base
          </Button>
        </div>
      )}

      {/* Accordion blocks */}
      {BLOCKS.map((block) => {
        const sections = grouped[block];
        if (!sections) return null;
        const stats = blockStats(block);
        const expanded = expandedBlocks.has(block);

        return (
          <div key={block} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Block header */}
            <button
              onClick={() => toggleBlock(block)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                <span className="text-[13px] font-semibold text-[#0F1B2D] uppercase tracking-wide">{block}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-500">[{stats.done}/{stats.total} completados]</span>
                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${progressColor(stats.pct)}`} style={{ width: `${stats.pct}%` }} />
                </div>
                <span className="text-[11px] font-medium text-gray-500">{stats.pct}%</span>
              </div>
            </button>

            {expanded && (
              <div>
                {Object.entries(sections).map(([section, sectionItems]) => (
                  <div key={section}>
                    <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100">
                      <p className="text-[11px] font-semibold text-[#0D7377] uppercase tracking-wider">📍 {section}</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {sectionItems.map((item) => {
                        const badge = statusBadge(item.status || "pending");
                        const isNa = item.status === "na";
                        const isCompleted = item.status === "completed";

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 px-4 py-2 group hover:bg-gray-50/50 transition-colors ${rowBg(item.status || "pending")}`}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleCheck(item)}
                              className={cn(
                                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                isCompleted ? "bg-[#0D7377] border-[#0D7377] text-white" : "border-gray-300 hover:border-[#0D7377]",
                                isNa && "opacity-40 cursor-not-allowed"
                              )}
                              disabled={isNa}
                            >
                              {isCompleted && <span className="text-[10px] font-bold">✓</span>}
                            </button>

                            {/* Text */}
                            <span className={cn(
                              "flex-1 text-[12px] min-w-0",
                              isNa && "line-through text-gray-400",
                              isCompleted && "text-gray-500",
                              !isNa && !isCompleted && "text-[#0F1B2D]"
                            )}>
                              <span className="text-gray-400 mr-1.5">{item.sequence}.</span>
                              {item.item_text}
                            </span>

                            {/* Badge */}
                            <Badge className={badge.cls}>{badge.label}</Badge>

                            {/* Assigned */}
                            {item.assigned_to && (
                              <span className="text-[10px] text-gray-400 shrink-0">👤 {item.assigned_to}</span>
                            )}

                            {/* Due date */}
                            {item.due_date && (
                              <span className="text-[10px] text-gray-400 shrink-0">📅 {item.due_date}</span>
                            )}

                            {/* Actions (hover) */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-gray-200" title="Editar">
                                <Pencil className="h-3.5 w-3.5 text-gray-400" />
                              </button>
                              <button onClick={() => toggleVisibility(item)} className="p-1 rounded hover:bg-gray-200" title="Visibilidad cliente">
                                {item.visible_to_client ? (
                                  <Eye className="h-3.5 w-3.5 text-[#0D7377]" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5 text-gray-300" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit popover as dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-[14px]">Editar ítem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Estado</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En gestión</SelectItem>
                  <SelectItem value="completed">Recibido</SelectItem>
                  <SelectItem value="na">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Asignado a</Label>
              <Input value={editForm.assigned_to} onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })} className="h-8 text-[12px]" placeholder="Nombre del responsable" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Fecha límite</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-8 text-[12px] justify-start", !editForm.due_date && "text-gray-400")}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                    {editForm.due_date ? format(new Date(editForm.due_date), "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editForm.due_date ? new Date(editForm.due_date) : undefined}
                    onSelect={(d) => setEditForm({ ...editForm, due_date: d ? format(d, "yyyy-MM-dd") : "" })}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Notas internas</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="text-[12px] h-20" placeholder="Solo visible para equipo 360lateral" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-gray-400">¿Visible para cliente?</Label>
              <Switch checked={editForm.visible_to_client} onCheckedChange={(v) => setEditForm({ ...editForm, visible_to_client: v })} />
            </div>
            <Button onClick={saveEdit} className="w-full h-8 text-[12px] bg-[#0D7377] hover:bg-[#0B6163] text-white">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingAdmin;
