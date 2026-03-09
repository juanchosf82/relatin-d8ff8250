import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Lock, Eye, Download } from "lucide-react";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  BTN_SUCCESS, BTN_PRIMARY,
  badgeClass, PAGE_TITLE,
} from "@/lib/design-system";

const CATEGORIES = ["Climático", "Suministro", "Contractual", "Laboral", "Regulatorio", "Financiero", "Diseño", "Mercado", "Otro"];
const PROB_OPTIONS = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];
const IMPACT_OPTIONS = [
  { value: "high", label: "Alto" },
  { value: "medium", label: "Medio" },
  { value: "low", label: "Bajo" },
];
const STATUS_OPTIONS = [
  { value: "open", label: "Abierto" },
  { value: "monitoring", label: "Monitoreando" },
  { value: "mitigated", label: "Mitigado" },
  { value: "closed", label: "Cerrado" },
];

const LEVEL_BADGE: Record<string, { className: string; label: string }> = {
  critical: { className: "bg-[#DC2626] text-white border-0 text-[10px] font-bold", label: "CRÍTICO" },
  high: { className: "bg-[#F97316] text-white border-0 text-[10px] font-bold", label: "ALTO" },
  medium: { className: "bg-[#FACC15] text-[#1F2937] border-0 text-[10px] font-bold", label: "MEDIO" },
  low: { className: "bg-[#DCFCE7] text-[#166534] border-0 text-[10px] font-bold", label: "BAJO" },
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", label: "Abierto" },
  monitoring: { bg: "bg-[#FFFBEB]", text: "text-[#92400E]", label: "Monitoreando" },
  mitigated: { bg: "bg-[#F0FDF4]", text: "text-[#166534]", label: "Mitigado" },
  closed: { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]", label: "Cerrado" },
};

interface Risk {
  id: string;
  project_id: string | null;
  category: string;
  title: string;
  description: string | null;
  probability: string;
  impact: string;
  level: string | null;
  mitigation: string | null;
  owner: string | null;
  status: string | null;
  visible_to_client: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

const DEFAULT_RISKS = [
  { category: "Climático", title: "Retraso por condiciones climáticas (huracanes/lluvia)", probability: "high", impact: "medium", mitigation: "Incluir buffer de 15 días en cronograma para temporada de huracanes (Jun–Nov). Monitoreo semanal NHC." },
  { category: "Regulatorio", title: "Demora en emisión de permisos (City of St. Pete / Pinellas County)", probability: "medium", impact: "high", mitigation: "Aplicar permisos con 30 días de anticipación. Mantener contacto directo con el permit office." },
  { category: "Suministro", title: "Aumento de precios de materiales (lumber, concrete, steel)", probability: "medium", impact: "medium", mitigation: "Contratos a precio fijo con proveedores clave. Contingencia del 8% en presupuesto." },
  { category: "Laboral", title: "Escasez de mano de obra calificada", probability: "medium", impact: "medium", mitigation: "GC con roster de subcontratistas pre-calificados. Cláusula de reemplazo en contrato." },
  { category: "Financiero", title: "Sobrecosto por change orders no controlados", probability: "medium", impact: "high", mitigation: "Todo CO requiere aprobación de 360lateral antes de ejecutarse. Límite de CO sin aprobación adicional: $5,000." },
  { category: "Contractual", title: "Mechanic's lien de subcontratista no pagado", probability: "low", impact: "high", mitigation: "Lien waiver obligatorio en cada draw antes de pagar. Monitoreo de NTO registry de Florida." },
  { category: "Regulatorio", title: "Falla en inspección de Florida Building Code", probability: "low", impact: "high", mitigation: "Pre-inspección interna antes de cada inspección oficial. Lista de checklist por fase." },
  { category: "Diseño", title: "Change order por error u omisión en planos", probability: "medium", impact: "medium", mitigation: "Revisión de planos por 360lateral antes del inicio de obra. RFI formal para toda consulta de campo." },
  { category: "Mercado", title: "Caída del precio de venta antes del cierre", probability: "low", impact: "high", mitigation: "Monitoreo trimestral de comps. ARV conservador en modelo financiero. Plan B de alquiler definido." },
  { category: "Financiero", title: "Vencimiento del loan term antes de CO", probability: "low", impact: "high", mitigation: "Alertas a 90, 60 y 30 días del vencimiento. Gestión proactiva de extensión con el banco." },
];

const emptyForm = { category: "Climático", title: "", description: "", probability: "medium", impact: "medium", mitigation: "", owner: "", status: "open", visible_to_client: true };

const RisksAdmin = ({ projectId }: { projectId: string }) => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const fetchRisks = async () => {
    const { data } = await supabase.from("risks").select("*").eq("project_id", projectId).order("created_at");
    setRisks((data as Risk[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRisks(); }, [projectId]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (r: Risk) => {
    setEditingId(r.id);
    setForm({ category: r.category, title: r.title, description: r.description ?? "", probability: r.probability, impact: r.impact, mitigation: r.mitigation ?? "", owner: r.owner ?? "", status: r.status ?? "open", visible_to_client: r.visible_to_client ?? true });
    setFormOpen(true);
  };

  const saveRisk = async () => {
    if (!form.title || !form.category) return;
    const payload = { project_id: projectId, category: form.category, title: form.title, description: form.description || null, probability: form.probability, impact: form.impact, mitigation: form.mitigation || null, owner: form.owner || null, status: form.status, visible_to_client: form.visible_to_client };
    if (editingId) {
      await supabase.from("risks").update(payload).eq("id", editingId);
      toast.success("Riesgo actualizado");
    } else {
      await supabase.from("risks").insert([payload]);
      toast.success("Riesgo agregado");
    }
    setFormOpen(false);
    fetchRisks();
  };

  const deleteRisk = async () => {
    if (!deleteId) return;
    await supabase.from("risks").delete().eq("id", deleteId);
    toast.success("Riesgo eliminado");
    setDeleteId(null);
    fetchRisks();
  };

  const toggleVisibility = async (r: Risk) => {
    await supabase.from("risks").update({ visible_to_client: !r.visible_to_client }).eq("id", r.id);
    fetchRisks();
  };

  const importStandard = async () => {
    const rows = DEFAULT_RISKS.map((r) => ({ ...r, project_id: projectId, status: "open", visible_to_client: true }));
    await supabase.from("risks").insert(rows);
    toast.success("10 riesgos estándar importados");
    setImportOpen(false);
    fetchRisks();
  };

  const openRisks = risks.filter((r) => r.status === "open" || r.status === "monitoring");
  const criticalCount = openRisks.filter((r) => r.level === "critical").length;
  const highCount = openRisks.filter((r) => r.level === "high").length;
  const mediumCount = openRisks.filter((r) => r.level === "medium").length;
  const lowOrClosed = risks.filter((r) => r.level === "low" || r.status === "mitigated" || r.status === "closed").length;

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={PAGE_TITLE}>Matriz de Riesgos — Cap. 7</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-[11px] font-medium bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-800 gap-1.5" onClick={() => setImportOpen(true)}>
            <Download className="h-3.5 w-3.5" /> Importar riesgos estándar
          </Button>
          <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar riesgo
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF2F2] text-[12px] font-semibold text-[#991B1B]">🔴 Críticos: {criticalCount}</div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF7ED] text-[12px] font-semibold text-[#9A3412]">🟠 Altos: {highCount}</div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFBEB] text-[12px] font-semibold text-[#854D0E]">🟡 Medios: {mediumCount}</div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0FDF4] text-[12px] font-semibold text-[#166534]">🟢 Bajos / Cerrados: {lowOrClosed}</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className={TH_CLASS}>Categoría</th>
              <th className={TH_CLASS}>Riesgo</th>
              <th className={TH_CLASS}>Prob.</th>
              <th className={TH_CLASS}>Impacto</th>
              <th className={TH_CLASS}>Nivel</th>
              <th className={TH_CLASS}>Mitigación</th>
              <th className={TH_CLASS}>Owner</th>
              <th className={TH_CLASS}>Estado</th>
              <th className={TH_CLASS}>Visible</th>
              <th className={TH_CLASS}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r, idx) => {
              const lvl = LEVEL_BADGE[r.level ?? "low"] || LEVEL_BADGE.low;
              const st = STATUS_BADGE[r.status ?? "open"] || STATUS_BADGE.open;
              return (
                <tr key={r.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors ${!r.visible_to_client ? "opacity-60" : ""}`}>
                  <td className={TD_CLASS}><Badge className="bg-[#F3F4F6] text-[#374151] border-0 text-[10px]">{r.category}</Badge></td>
                  <td className={`${TD_CLASS} max-w-[200px]`}>
                    <span className="font-medium">{r.title}</span>
                    {!r.visible_to_client && <Lock className="inline h-3 w-3 ml-1 text-gray-400" />}
                  </td>
                  <td className={TD_CLASS}>{PROB_OPTIONS.find((p) => p.value === r.probability)?.label ?? r.probability}</td>
                  <td className={TD_CLASS}>{IMPACT_OPTIONS.find((p) => p.value === r.impact)?.label ?? r.impact}</td>
                  <td className={TD_CLASS}><Badge className={lvl.className}>{lvl.label}</Badge></td>
                  <td className={`${TD_CLASS} max-w-[220px] truncate text-gray-500`}>{r.mitigation || "—"}</td>
                  <td className={TD_CLASS}>{r.owner || "—"}</td>
                  <td className={TD_CLASS}><Badge className={badgeClass(st.bg, st.text)}>{st.label}</Badge></td>
                  <td className={TD_CLASS}>
                    <button onClick={() => toggleVisibility(r)} className="p-1 rounded hover:bg-gray-100">
                      {r.visible_to_client ? <Eye className="h-3.5 w-3.5 text-[#0D7377]" /> : <Lock className="h-3.5 w-3.5 text-gray-400" />}
                    </button>
                  </td>
                  <td className={TD_CLASS}>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-[#0D7377]" /></button>
                      <button onClick={() => setDeleteId(r.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {risks.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-gray-400 text-[12px]">Sin riesgos registrados</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Riesgo" : "Agregar Riesgo"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Título del riesgo</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Probabilidad</Label>
                <Select value={form.probability} onValueChange={(v) => setForm({ ...form, probability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROB_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Impacto</Label>
                <Select value={form.impact} onValueChange={(v) => setForm({ ...form, impact: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{IMPACT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Plan de mitigación</Label><Textarea value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} rows={2} /></div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Responsable / Owner</Label><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.visible_to_client} onCheckedChange={(c) => setForm({ ...form, visible_to_client: c })} />
              <Label className="text-[12px]">Visible para cliente</Label>
            </div>
            <Button onClick={saveRisk} disabled={!form.title} className={`w-full ${BTN_PRIMARY}`}>{editingId ? "Guardar cambios" : "Guardar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar riesgo?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRisk} className="bg-red-600 hover:bg-red-700">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import confirmation */}
      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar riesgos estándar</AlertDialogTitle>
            <AlertDialogDescription>
              {risks.length > 0
                ? `Este proyecto ya tiene ${risks.length} riesgo(s). ¿Agregar los 10 riesgos estándar de construcción residencial en Florida al final?`
                : "Esto cargará 10 riesgos predefinidos de construcción residencial en Florida. Puedes editarlos después."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={importStandard} className="bg-[#0F1B2D] hover:bg-[#1a2d4a]">{risks.length > 0 ? "Agregar" : "Importar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RisksAdmin;
