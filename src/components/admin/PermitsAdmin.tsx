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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, CalendarIcon,
  Clock, CheckCircle2, XCircle, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  badgeClass, BTN_SUCCESS,
} from "@/lib/design-system";

type Permit = {
  id: string; project_id: string | null; type: string; permit_number: string | null;
  issuing_authority: string | null; status: string | null; applied_date: string | null;
  issued_date: string | null; expiration_date: string | null; inspection_required: boolean | null;
  inspection_status: string | null; inspection_date: string | null; inspection_result: string | null;
  inspector_name: string | null; notes: string | null; visible_to_client: boolean | null;
  created_at: string | null; updated_at: string | null;
};

type Inspection = {
  id: string; project_id: string | null; permit_id: string | null; phase: string;
  name: string; sequence: number; status: string | null; scheduled_date: string | null;
  completed_date: string | null; result: string | null; inspector_name: string | null;
  re_inspection_required: boolean | null; re_inspection_date: string | null;
  notes: string | null; visible_to_client: boolean | null;
  created_at: string | null; updated_at: string | null;
};

const PERMIT_TYPES = [
  "Building Permit", "Electrical Permit", "Plumbing Permit",
  "Mechanical/HVAC Permit", "Roofing Permit", "Notice of Commencement (NOC)",
  "Certificate of Occupancy (CO)", "FEMA Flood Zone Compliance",
  "Pinellas County Impact Fee", "HOA Approval", "Otro",
];

const AUTHORITIES = [
  "City of St. Pete", "Pinellas County", "State of Florida", "FEMA", "HOA", "Otro",
];

const PERMIT_STATUSES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-600", label: "Por solicitar" },
  applied: { bg: "bg-blue-50", text: "text-blue-700", label: "Solicitado" },
  issued: { bg: "bg-green-50", text: "text-green-700", label: "Emitido ✓" },
  expired: { bg: "bg-red-50", text: "text-red-700", label: "Vencido !" },
  expiring_soon: { bg: "bg-orange-50", text: "text-orange-700", label: "Vence pronto" },
  closed: { bg: "bg-gray-50", text: "text-gray-400", label: "Cerrado" },
};

const INSPECTION_STATUSES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-600", label: "Pendiente" },
  scheduled: { bg: "bg-blue-50", text: "text-blue-700", label: "Programada" },
  passed: { bg: "bg-green-50", text: "text-green-700", label: "Aprobada ✓" },
  failed: { bg: "bg-red-50", text: "text-red-700", label: "Fallida ✗" },
  re_inspection: { bg: "bg-orange-50", text: "text-orange-700", label: "Re-inspección" },
};

const PHASES = ["Pre-Construction", "Foundation", "Framing", "MEP", "Enclosure", "Finishes", "Closeout"];

const FLORIDA_PERMITS = [
  { type: "Building Permit", issuing_authority: "City of St. Pete / Pinellas County", inspection_required: true },
  { type: "Electrical Permit", issuing_authority: "City of St. Pete", inspection_required: true },
  { type: "Plumbing Permit", issuing_authority: "City of St. Pete", inspection_required: true },
  { type: "Mechanical/HVAC Permit", issuing_authority: "City of St. Pete", inspection_required: true },
  { type: "Roofing Permit", issuing_authority: "City of St. Pete", inspection_required: true },
  { type: "Notice of Commencement (NOC)", issuing_authority: "Pinellas County", inspection_required: false },
  { type: "Certificate of Occupancy (CO)", issuing_authority: "City of St. Pete", inspection_required: true },
  { type: "FEMA Flood Zone Compliance", issuing_authority: "FEMA", inspection_required: false },
];

const FLORIDA_INSPECTIONS = [
  { phase: "Foundation", name: "Soil/Slab Inspection", sequence: 1 },
  { phase: "Foundation", name: "Foundation Inspection (pre-pour)", sequence: 2 },
  { phase: "Foundation", name: "Slab Pour Approval", sequence: 3 },
  { phase: "Framing", name: "Rough Framing Inspection", sequence: 4 },
  { phase: "Framing", name: "Shear Wall / Structural Inspection", sequence: 5 },
  { phase: "MEP", name: "Rough Electrical Inspection", sequence: 6 },
  { phase: "MEP", name: "Rough Plumbing Inspection", sequence: 7 },
  { phase: "MEP", name: "Rough Mechanical/HVAC Inspection", sequence: 8 },
  { phase: "MEP", name: "Insulation Inspection", sequence: 9 },
  { phase: "Enclosure", name: "Roof Sheathing Inspection", sequence: 10 },
  { phase: "Enclosure", name: "Final Roofing Inspection", sequence: 11 },
  { phase: "Enclosure", name: "Window/Door Rough Inspection", sequence: 12 },
  { phase: "Finishes", name: "Drywall Inspection", sequence: 13 },
  { phase: "Closeout", name: "Final Inspection (CO prerequisite)", sequence: 14 },
];

const emptyPermitForm = (): Partial<Permit> => ({
  type: "", permit_number: "", issuing_authority: "", status: "pending",
  applied_date: null, issued_date: null, expiration_date: null,
  inspection_required: false, inspection_status: "pending", inspector_name: "",
  notes: "", visible_to_client: true,
});

const emptyInspectionForm = (): Partial<Inspection> => ({
  phase: "Foundation", name: "", permit_id: null, sequence: 0,
  status: "pending", scheduled_date: null, completed_date: null,
  result: null, inspector_name: "", re_inspection_required: false,
  re_inspection_date: null, notes: "", visible_to_client: true,
});

const today = new Date().toISOString().split("T")[0];

function isExpired(d: string | null) { return d ? d < today : false; }
function isExpiringSoon(d: string | null) {
  if (!d) return false;
  const diff = (new Date(d).getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= 30;
}

function DateField({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-gray-400">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left text-[12px] h-9", !value && "text-muted-foreground")}>
            <CalendarIcon className="h-3 w-3 mr-2" />
            {value || "Seleccionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value ? new Date(value) : undefined}
            onSelect={(d) => { onChange(d ? format(d, "yyyy-MM-dd") : null); setOpen(false); }}
            className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function PermitsAdmin({ projectId }: { projectId: string }) {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  const [permitOpen, setPermitOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [pForm, setPForm] = useState<Partial<Permit>>(emptyPermitForm());

  const [inspOpen, setInspOpen] = useState(false);
  const [editingInsp, setEditingInsp] = useState<Inspection | null>(null);
  const [iForm, setIForm] = useState<Partial<Inspection>>(emptyInspectionForm());

  const fetch = async () => {
    setLoading(true);
    const [pRes, iRes] = await Promise.all([
      supabase.from("permits").select("*").eq("project_id", projectId).order("created_at"),
      supabase.from("inspections").select("*").eq("project_id", projectId).order("sequence"),
    ]);
    setPermits((pRes.data ?? []) as Permit[]);
    setInspections((iRes.data ?? []) as Inspection[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [projectId]);

  // Summary counts
  const expiredCount = permits.filter(p => p.status !== "closed" && isExpired(p.expiration_date)).length;
  const expiringSoonCount = permits.filter(p => p.status !== "closed" && !isExpired(p.expiration_date) && isExpiringSoon(p.expiration_date)).length;
  const pendingCount = permits.filter(p => p.status === "pending" || p.status === "applied").length;
  const issuedCount = permits.filter(p => p.status === "issued" && !isExpired(p.expiration_date)).length;
  const pendingInspections = inspections.filter(i => i.status === "pending" || i.status === "scheduled").length;

  // Permit CRUD
  const openAddPermit = () => { setEditingPermit(null); setPForm(emptyPermitForm()); setPermitOpen(true); };
  const openEditPermit = (p: Permit) => { setEditingPermit(p); setPForm({ ...p }); setPermitOpen(true); };

  const savePermit = async () => {
    if (!pForm.type) return;
    const payload = {
      project_id: projectId, type: pForm.type!, permit_number: pForm.permit_number || null,
      issuing_authority: pForm.issuing_authority || null, status: pForm.status || "pending",
      applied_date: pForm.applied_date || null, issued_date: pForm.issued_date || null,
      expiration_date: pForm.expiration_date || null, inspection_required: pForm.inspection_required ?? false,
      inspection_status: pForm.inspection_status || "pending", inspector_name: pForm.inspector_name || null,
      notes: pForm.notes || null, visible_to_client: pForm.visible_to_client ?? true,
    };
    if (editingPermit) {
      await supabase.from("permits").update(payload).eq("id", editingPermit.id);
      toast.success("Permiso actualizado");
    } else {
      await supabase.from("permits").insert([payload]);
      toast.success("Permiso agregado");
    }
    setPermitOpen(false);
    fetch();
  };

  const deletePermit = async (id: string) => {
    await supabase.from("permits").delete().eq("id", id);
    toast.success("Permiso eliminado");
    fetch();
  };

  const togglePermitVisibility = async (p: Permit) => {
    await supabase.from("permits").update({ visible_to_client: !p.visible_to_client }).eq("id", p.id);
    fetch();
  };

  // Inspection CRUD
  const openAddInsp = () => { setEditingInsp(null); setIForm(emptyInspectionForm()); setInspOpen(true); };
  const openEditInsp = (i: Inspection) => { setEditingInsp(i); setIForm({ ...i }); setInspOpen(true); };

  const saveInspection = async () => {
    if (!iForm.name || !iForm.phase) return;
    const payload = {
      project_id: projectId, phase: iForm.phase!, name: iForm.name!,
      permit_id: iForm.permit_id || null, sequence: iForm.sequence ?? 0,
      status: iForm.status || "pending", scheduled_date: iForm.scheduled_date || null,
      completed_date: iForm.completed_date || null, result: iForm.result || null,
      inspector_name: iForm.inspector_name || null, re_inspection_required: iForm.re_inspection_required ?? false,
      re_inspection_date: iForm.re_inspection_date || null, notes: iForm.notes || null,
      visible_to_client: iForm.visible_to_client ?? true,
    };
    if (editingInsp) {
      await supabase.from("inspections").update(payload).eq("id", editingInsp.id);
      toast.success("Inspección actualizada");
    } else {
      await supabase.from("inspections").insert([payload]);
      toast.success("Inspección agregada");
    }
    setInspOpen(false);
    fetch();
  };

  const quickResult = async (i: Inspection, result: "passed" | "failed") => {
    await supabase.from("inspections").update({
      status: result, result, completed_date: today,
      re_inspection_required: result === "failed",
    }).eq("id", i.id);
    toast.success(result === "passed" ? "Inspección aprobada" : "Inspección marcada como fallida");
    fetch();
  };

  // Templates
  const loadFloridaPermits = async () => {
    const existing = permits.length;
    if (existing > 0) {
      if (!confirm(`Este proyecto ya tiene ${existing} permisos. ¿Reemplazar con la plantilla Florida?`)) return;
      await supabase.from("permits").delete().eq("project_id", projectId);
    }
    const rows = FLORIDA_PERMITS.map(p => ({ ...p, project_id: projectId, status: "pending", visible_to_client: true }));
    await supabase.from("permits").insert(rows);
    toast.success("Plantilla de permisos Florida cargada — 8 permisos");
    fetch();
  };

  const loadFloridaInspections = async () => {
    const existing = inspections.length;
    if (existing > 0) {
      if (!confirm(`Este proyecto ya tiene ${existing} inspecciones. ¿Reemplazar con la secuencia Florida?`)) return;
      await supabase.from("inspections").delete().eq("project_id", projectId);
    }
    const rows = FLORIDA_INSPECTIONS.map(i => ({ ...i, project_id: projectId, status: "pending", visible_to_client: true }));
    await supabase.from("inspections").insert(rows);
    toast.success("Secuencia de inspecciones Florida cargada — 14 inspecciones");
    fetch();
  };

  const getPermitDisplayStatus = (p: Permit) => {
    if (p.status === "issued" && isExpired(p.expiration_date)) return PERMIT_STATUSES.expired;
    if (p.status === "issued" && isExpiringSoon(p.expiration_date)) return PERMIT_STATUSES.expiring_soon;
    return PERMIT_STATUSES[p.status || "pending"] || PERMIT_STATUSES.pending;
  };

  // Group inspections by phase
  const inspByPhase = PHASES.reduce<Record<string, Inspection[]>>((acc, phase) => {
    const items = inspections.filter(i => i.phase === phase);
    if (items.length) acc[phase] = items;
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  const nodeIcon = (status: string | null) => {
    switch (status) {
      case "passed": return <CheckCircle2 className="h-4 w-4 text-[#0D7377]" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "scheduled": return <Clock className="h-4 w-4 text-blue-500" />;
      case "re_inspection": return <RotateCcw className="h-4 w-4 text-orange-500" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#0F1B2D]">Permisos e Inspecciones — Cap. 8</h2>
          <p className="text-[11px] text-gray-400">Seguimiento regulatorio para proyectos residenciales en Florida</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={openAddPermit}><Plus className="h-3.5 w-3.5 mr-1" />Agregar permiso</Button>
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={loadFloridaPermits}>Cargar plantilla Florida</Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {expiredCount > 0 && <Badge className="bg-red-50 text-red-700 border-0 text-[11px]">🔴 Vencidos: {expiredCount}</Badge>}
        {expiringSoonCount > 0 && <Badge className="bg-orange-50 text-orange-700 border-0 text-[11px]">🟠 Por vencer: {expiringSoonCount}</Badge>}
        <Badge className="bg-yellow-50 text-yellow-700 border-0 text-[11px]">🟡 Pendientes: {pendingCount}</Badge>
        <Badge className="bg-green-50 text-green-700 border-0 text-[11px]">✅ Vigentes: {issuedCount}</Badge>
        <Badge className="bg-blue-50 text-blue-700 border-0 text-[11px]">🔍 Inspecciones pendientes: {pendingInspections}</Badge>
      </div>

      {/* SECTION A — PERMITS TABLE */}
      <div>
        <h3 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Permisos Activos</h3>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-[12px] border-collapse">
            <thead><tr>
              <th className={TH_CLASS}>Tipo</th>
              <th className={TH_CLASS}># Permiso</th>
              <th className={TH_CLASS}>Autoridad</th>
              <th className={TH_CLASS}>Solicitado</th>
              <th className={TH_CLASS}>Emitido</th>
              <th className={TH_CLASS}>Vencimiento</th>
              <th className={TH_CLASS}>Estado</th>
              <th className={TH_CLASS}>Insp. req.</th>
              <th className={`${TH_CLASS} w-10`}>👁</th>
              <th className={`${TH_CLASS} w-20`}>Acciones</th>
            </tr></thead>
            <tbody>
              {permits.map((p, idx) => {
                const st = getPermitDisplayStatus(p);
                const expClass = isExpired(p.expiration_date) ? "text-red-600 font-bold" : isExpiringSoon(p.expiration_date) ? "text-orange-600 font-semibold" : "";
                return (
                  <tr key={p.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                    <td className={`${TD_CLASS} font-medium`}>{p.type}</td>
                    <td className={`${TD_CLASS} font-mono text-gray-500`}>{p.permit_number || "—"}</td>
                    <td className={TD_CLASS}>{p.issuing_authority || "—"}</td>
                    <td className={TD_CLASS}>{p.applied_date || "—"}</td>
                    <td className={TD_CLASS}>{p.issued_date || "—"}</td>
                    <td className={`${TD_CLASS} ${expClass}`}>{p.expiration_date || "—"}</td>
                    <td className={TD_CLASS}><Badge className={badgeClass(st.bg, st.text)}>{st.label}</Badge></td>
                    <td className={TD_CLASS}>
                      {p.inspection_required ? (
                        <Badge className="bg-blue-50 text-blue-700 border-0 text-[10px]">
                          Sí — {(INSPECTION_STATUSES[p.inspection_status || "pending"] || INSPECTION_STATUSES.pending).label}
                        </Badge>
                      ) : <span className="text-gray-400">No</span>}
                    </td>
                    <td className={TD_CLASS}>
                      <button onClick={() => togglePermitVisibility(p)}>
                        {p.visible_to_client ? <Eye className="h-3.5 w-3.5 text-[#0D7377]" /> : <EyeOff className="h-3.5 w-3.5 text-gray-300" />}
                      </button>
                    </td>
                    <td className={TD_CLASS}>
                      <div className="flex gap-1">
                        <button onClick={() => openEditPermit(p)} className="p-1 rounded hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-gray-500" /></button>
                        <button onClick={() => deletePermit(p.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {permits.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-gray-400 text-[12px]">Sin permisos. Carga la plantilla Florida para comenzar.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permit Dialog */}
      <Dialog open={permitOpen} onOpenChange={setPermitOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPermit ? "Editar Permiso" : "Agregar Permiso"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Tipo de permiso</Label>
              <Select value={pForm.type || ""} onValueChange={v => setPForm({ ...pForm, type: v })}>
                <SelectTrigger className="text-[12px] h-9"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>{PERMIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Número de permiso</Label>
              <Input value={pForm.permit_number || ""} onChange={e => setPForm({ ...pForm, permit_number: e.target.value })} className="h-9 text-[12px]" /></div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Autoridad emisora</Label>
              <Select value={pForm.issuing_authority || ""} onValueChange={v => setPForm({ ...pForm, issuing_authority: v })}>
                <SelectTrigger className="text-[12px] h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{AUTHORITIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DateField label="Fecha de solicitud" value={pForm.applied_date || null} onChange={v => setPForm({ ...pForm, applied_date: v })} />
              <DateField label="Fecha de emisión" value={pForm.issued_date || null} onChange={v => setPForm({ ...pForm, issued_date: v })} />
            </div>
            <DateField label="Fecha de vencimiento" value={pForm.expiration_date || null} onChange={v => setPForm({ ...pForm, expiration_date: v })} />
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Estado</Label>
              <Select value={pForm.status || "pending"} onValueChange={v => setPForm({ ...pForm, status: v })}>
                <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PERMIT_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={pForm.inspection_required ?? false} onCheckedChange={v => setPForm({ ...pForm, inspection_required: v })} />
              <Label className="text-[12px]">¿Requiere inspección?</Label>
            </div>
            {pForm.inspection_required && (
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Estado de inspección</Label>
                <Select value={pForm.inspection_status || "pending"} onValueChange={v => setPForm({ ...pForm, inspection_status: v })}>
                  <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(INSPECTION_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Inspector asignado</Label>
              <Input value={pForm.inspector_name || ""} onChange={e => setPForm({ ...pForm, inspector_name: e.target.value })} className="h-9 text-[12px]" /></div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Notas</Label>
              <Textarea value={pForm.notes || ""} onChange={e => setPForm({ ...pForm, notes: e.target.value })} className="text-[12px]" rows={3} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={pForm.visible_to_client ?? true} onCheckedChange={v => setPForm({ ...pForm, visible_to_client: v })} />
              <Label className="text-[12px]">¿Visible para cliente?</Label>
            </div>
            <Button onClick={savePermit} disabled={!pForm.type} className={`w-full ${BTN_SUCCESS}`}>{editingPermit ? "Actualizar" : "Guardar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SECTION B — INSPECTIONS TIMELINE */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-[#0F1B2D]">Secuencia de Inspecciones</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={openAddInsp}><Plus className="h-3.5 w-3.5 mr-1" />Agregar inspección</Button>
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={loadFloridaInspections}>Cargar secuencia Florida</Button>
          </div>
        </div>

        {Object.keys(inspByPhase).length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-[12px]">
            Sin inspecciones. Carga la secuencia Florida para comenzar.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-6">
            {Object.entries(inspByPhase).map(([phase, items]) => (
              <div key={phase}>
                <h4 className="text-[12px] font-bold text-[#0F1B2D] uppercase tracking-wide mb-3">{phase}</h4>
                <div className="relative ml-2">
                  {/* Vertical line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />
                  <div className="space-y-4">
                    {items.map(insp => {
                      const st = INSPECTION_STATUSES[insp.status || "pending"] || INSPECTION_STATUSES.pending;
                      return (
                        <div key={insp.id} className="relative pl-8 group">
                          <div className="absolute left-0 top-0.5">{nodeIcon(insp.status)}</div>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`text-[13px] font-medium ${insp.status === "passed" ? "text-[#0D7377]" : insp.status === "failed" ? "text-red-600" : "text-[#0F1B2D]"}`}>{insp.name}</p>
                              <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                                {insp.scheduled_date && <span>Programada: {insp.scheduled_date}</span>}
                                {insp.inspector_name && <span>Inspector: {insp.inspector_name}</span>}
                                {insp.completed_date && <span>Completada: {insp.completed_date}</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={badgeClass(st.bg, st.text)}>{st.label}</Badge>
                                {insp.re_inspection_required && <Badge className="bg-orange-50 text-orange-700 border-0 text-[10px]">↩ Re-inspección {insp.re_inspection_date || ""}</Badge>}
                              </div>
                            </div>
                            <div className="hidden group-hover:flex items-center gap-1">
                              <button onClick={() => openEditInsp(insp)} className="p-1 rounded hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                              {insp.status !== "passed" && (
                                <button onClick={() => quickResult(insp, "passed")} className="p-1 rounded hover:bg-green-50 text-[10px] text-green-600 font-semibold">Aprobar</button>
                              )}
                              {insp.status !== "failed" && (
                                <button onClick={() => quickResult(insp, "failed")} className="p-1 rounded hover:bg-red-50 text-[10px] text-red-500 font-semibold">Fallar</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inspection Dialog */}
      <Dialog open={inspOpen} onOpenChange={setInspOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingInsp ? "Editar Inspección" : "Agregar Inspección"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Fase</Label>
              <Select value={iForm.phase || "Foundation"} onValueChange={v => setIForm({ ...iForm, phase: v })}>
                <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Nombre de la inspección</Label>
              <Input value={iForm.name || ""} onChange={e => setIForm({ ...iForm, name: e.target.value })} className="h-9 text-[12px]" /></div>
            {permits.length > 0 && (
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Permiso relacionado</Label>
                <Select value={iForm.permit_id || "none"} onValueChange={v => setIForm({ ...iForm, permit_id: v === "none" ? null : v })}>
                  <SelectTrigger className="text-[12px] h-9"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {permits.map(p => <SelectItem key={p.id} value={p.id}>{p.type} — {p.permit_number || "s/n"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <DateField label="Fecha programada" value={iForm.scheduled_date || null} onChange={v => setIForm({ ...iForm, scheduled_date: v })} />
              <DateField label="Fecha completada" value={iForm.completed_date || null} onChange={v => setIForm({ ...iForm, completed_date: v })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Resultado</Label>
              <Select value={iForm.result || "pending"} onValueChange={v => setIForm({ ...iForm, result: v, status: v })}>
                <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="passed">Aprobada</SelectItem>
                  <SelectItem value="failed">Fallida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Inspector</Label>
              <Input value={iForm.inspector_name || ""} onChange={e => setIForm({ ...iForm, inspector_name: e.target.value })} className="h-9 text-[12px]" /></div>
            <div className="flex items-center gap-3">
              <Switch checked={iForm.re_inspection_required ?? false} onCheckedChange={v => setIForm({ ...iForm, re_inspection_required: v })} />
              <Label className="text-[12px]">¿Re-inspección requerida?</Label>
            </div>
            {iForm.re_inspection_required && (
              <DateField label="Fecha re-inspección" value={iForm.re_inspection_date || null} onChange={v => setIForm({ ...iForm, re_inspection_date: v })} />
            )}
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Notas</Label>
              <Textarea value={iForm.notes || ""} onChange={e => setIForm({ ...iForm, notes: e.target.value })} className="text-[12px]" rows={3} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={iForm.visible_to_client ?? true} onCheckedChange={v => setIForm({ ...iForm, visible_to_client: v })} />
              <Label className="text-[12px]">¿Visible para cliente?</Label>
            </div>
            <Button onClick={saveInspection} disabled={!iForm.name || !iForm.phase} className={`w-full ${BTN_SUCCESS}`}>{editingInsp ? "Actualizar" : "Guardar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
