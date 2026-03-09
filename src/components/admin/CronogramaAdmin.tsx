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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Download, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  badgeClass, BTN_SUCCESS, BTN_PRIMARY,
} from "@/lib/design-system";

const PHASES = [
  { value: "Pre-Construction", color: "bg-slate-100 text-slate-700" },
  { value: "Foundation", color: "bg-amber-100 text-amber-700" },
  { value: "Framing", color: "bg-orange-100 text-orange-700" },
  { value: "MEP", color: "bg-purple-100 text-purple-700" },
  { value: "Enclosure", color: "bg-blue-100 text-blue-700" },
  { value: "Finishes", color: "bg-teal-100 text-teal-700" },
  { value: "Closeout", color: "bg-green-100 text-green-700" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente", bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
  { value: "in_progress", label: "En progreso", bg: "bg-blue-100", text: "text-blue-700" },
  { value: "complete", label: "Completado ✓", bg: "bg-[#D1FAE5]", text: "text-[#065F46]" },
  { value: "delayed", label: "Atrasado", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" },
  { value: "at_risk", label: "En riesgo", bg: "bg-[#FFEDD5]", text: "text-[#9A3412]" },
];

const DEFAULT_MILESTONES = [
  { sequence: 1, phase: "Pre-Construction", name: "Permit Application Submitted" },
  { sequence: 2, phase: "Pre-Construction", name: "Permit Issued" },
  { sequence: 3, phase: "Foundation", name: "Site Prep & Excavation" },
  { sequence: 4, phase: "Foundation", name: "Foundation Pour" },
  { sequence: 5, phase: "Foundation", name: "Foundation Inspection Passed" },
  { sequence: 6, phase: "Framing", name: "Rough Framing Complete" },
  { sequence: 7, phase: "Framing", name: "Framing Inspection Passed" },
  { sequence: 8, phase: "MEP", name: "Rough MEP (Mechanical, Electrical, Plumbing)" },
  { sequence: 9, phase: "MEP", name: "MEP Rough Inspection Passed" },
  { sequence: 10, phase: "Enclosure", name: "Roof Complete" },
  { sequence: 11, phase: "Enclosure", name: "Windows & Exterior Doors" },
  { sequence: 12, phase: "Finishes", name: "Interior Finishes & Fixtures" },
  { sequence: 13, phase: "Closeout", name: "Final Inspection & CO Applied" },
  { sequence: 14, phase: "Closeout", name: "Certificate of Occupancy Issued" },
];

interface Milestone {
  id: string;
  project_id: string | null;
  name: string;
  phase: string;
  sequence: number;
  baseline_start: string | null;
  baseline_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string | null;
  is_critical_path: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Props {
  projectId: string;
  coTargetDate?: string | null;
}

const phaseColor = (phase: string) => PHASES.find(p => p.value === phase)?.color || "bg-gray-100 text-gray-600";
const statusInfo = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

const deltaDays = (baseEnd: string | null, actualEnd: string | null): { days: number; label: string; color: string } | null => {
  if (!baseEnd || !actualEnd) return null;
  const diff = Math.round((new Date(actualEnd).getTime() - new Date(baseEnd).getTime()) / 86400000);
  if (diff > 0) return { days: diff, label: `+${diff} días`, color: "text-[#991B1B]" };
  if (diff < 0) return { days: diff, label: `${diff} días`, color: "text-[#1A7A4A]" };
  return { days: 0, label: "0", color: "text-gray-400" };
};

const DatePicker = ({ value, onChange, placeholder }: { value: string | null; onChange: (v: string | null) => void; placeholder: string }) => {
  const date = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[12px] h-9", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {date ? format(date, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};

export default function CronogramaAdmin({ projectId, coTargetDate }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importWarning, setImportWarning] = useState(false);

  const [form, setForm] = useState({
    name: "", phase: "Pre-Construction", sequence: 0,
    baseline_start: null as string | null, baseline_end: null as string | null,
    actual_start: null as string | null, actual_end: null as string | null,
    status: "pending", is_critical_path: false, notes: "",
  });

  const fetchMilestones = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("sequence");
    setMilestones((data as Milestone[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchMilestones(); }, [projectId]);

  const openAdd = () => {
    setEditing(null);
    const nextSeq = milestones.length > 0 ? Math.max(...milestones.map(m => m.sequence)) + 1 : 1;
    setForm({
      name: "", phase: "Pre-Construction", sequence: nextSeq,
      baseline_start: null, baseline_end: null,
      actual_start: null, actual_end: null,
      status: "pending", is_critical_path: false, notes: "",
    });
    setFormOpen(true);
  };

  const openEdit = (m: Milestone) => {
    setEditing(m);
    setForm({
      name: m.name, phase: m.phase, sequence: m.sequence,
      baseline_start: m.baseline_start, baseline_end: m.baseline_end,
      actual_start: m.actual_start, actual_end: m.actual_end,
      status: m.status || "pending", is_critical_path: m.is_critical_path || false,
      notes: m.notes || "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    if (editing) {
      await supabase.from("milestones").update({
        name: form.name, phase: form.phase, sequence: form.sequence,
        baseline_start: form.baseline_start, baseline_end: form.baseline_end,
        actual_start: form.actual_start, actual_end: form.actual_end,
        status: form.status, is_critical_path: form.is_critical_path,
        notes: form.notes || null, updated_at: new Date().toISOString(),
      }).eq("id", editing.id);
      toast.success("Hito actualizado");
    } else {
      await supabase.from("milestones").insert([{
        project_id: projectId,
        name: form.name, phase: form.phase, sequence: form.sequence,
        baseline_start: form.baseline_start, baseline_end: form.baseline_end,
        actual_start: form.actual_start, actual_end: form.actual_end,
        status: form.status, is_critical_path: form.is_critical_path,
        notes: form.notes || null,
      }]);
      toast.success("Hito creado");
    }
    setFormOpen(false);
    fetchMilestones();
  };

  const deleteMilestone = async () => {
    if (!deleteId) return;
    await supabase.from("milestones").delete().eq("id", deleteId);
    toast.success("Hito eliminado");
    setDeleteId(null);
    fetchMilestones();
  };

  const importTemplate = async () => {
    const startSeq = milestones.length > 0 ? Math.max(...milestones.map(m => m.sequence)) + 1 : 1;
    const rows = DEFAULT_MILESTONES.map((m, i) => ({
      project_id: projectId, name: m.name, phase: m.phase,
      sequence: startSeq + i, status: "pending",
    }));
    await supabase.from("milestones").insert(rows);
    toast.success("14 hitos estándar importados");
    setImportOpen(false);
    fetchMilestones();
  };

  const completedCount = milestones.filter(m => m.status === "complete").length;
  const lastCloseout = milestones.filter(m => m.phase === "Closeout").sort((a, b) => b.sequence - a.sequence)[0];
  const projectedDate = lastCloseout?.actual_end || lastCloseout?.baseline_end || null;
  const baselineCO = coTargetDate || lastCloseout?.baseline_end || null;

  const deltaOverall = baselineCO && projectedDate ? deltaDays(baselineCO, projectedDate) : null;

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[#0F1B2D]">Cronograma — Cap. 4</h3>
        <div className="flex gap-2">
          {milestones.length === 0 && (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setImportOpen(true)}>
              <Download className="h-3.5 w-3.5 mr-1" /> Importar plantilla
            </Button>
          )}
          <Button size="sm" className={`h-7 ${BTN_SUCCESS}`} onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar hito
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {milestones.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Fecha Baseline CO" value={baselineCO || "—"} />
          <SummaryCard label="Proyección actual" value={projectedDate || "—"} />
          <SummaryCard label="Δ Días" value={deltaOverall?.label || "—"} valueColor={deltaOverall?.color} icon={deltaOverall && deltaOverall.days > 0 ? "▲" : undefined} />
          <SummaryCard label="Hitos completados" value={`${completedCount}/${milestones.length}`} />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className={`${TH_CLASS} w-10`}>#</th>
              <th className={TH_CLASS}>Hito</th>
              <th className={TH_CLASS}>Fase</th>
              <th className={TH_CLASS}>Inicio Base</th>
              <th className={TH_CLASS}>Fin Base</th>
              <th className={TH_CLASS}>Inicio Real</th>
              <th className={TH_CLASS}>Fin Real</th>
              <th className={TH_CLASS}>Δ Días</th>
              <th className={TH_CLASS}>Estado</th>
              <th className={`${TH_CLASS} w-10`}>CP</th>
              <th className={`${TH_CLASS} w-20`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, idx) => {
              const st = statusInfo(m.status || "pending");
              const delta = deltaDays(m.baseline_end, m.actual_end);
              return (
                <tr key={m.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                  <td className={`${TD_CLASS} font-mono text-gray-500`}>{m.sequence}</td>
                  <td className={`${TD_CLASS} font-medium`}>{m.name}</td>
                  <td className={TD_CLASS}><Badge className={`${phaseColor(m.phase)} border-0 text-[10px]`}>{m.phase}</Badge></td>
                  <td className={`${TD_CLASS} text-[11px]`}>{m.baseline_start || "—"}</td>
                  <td className={`${TD_CLASS} text-[11px]`}>{m.baseline_end || "—"}</td>
                  <td className={`${TD_CLASS} text-[11px]`}>{m.actual_start || "—"}</td>
                  <td className={`${TD_CLASS} text-[11px]`}>{m.actual_end || "—"}</td>
                  <td className={`${TD_CLASS} font-mono ${delta?.color || ""}`}>{delta?.label || "—"}</td>
                  <td className={TD_CLASS}><Badge className={badgeClass(st.bg, st.text)}>{st.label}</Badge></td>
                  <td className={`${TD_CLASS} text-center`}>{m.is_critical_path ? "🔴" : ""}</td>
                  <td className={TD_CLASS}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(m)} className="p-1 rounded hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-[#0D7377]" /></button>
                      <button onClick={() => setDeleteId(m.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {milestones.length === 0 && (
              <tr><td colSpan={11} className="text-center py-8 text-gray-400 text-[12px]">Sin hitos. Importa la plantilla estándar o agrega hitos manualmente.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Hito" : "Agregar Hito"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Nombre del hito</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Foundation Pour" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Fase</Label>
                <Select value={form.phase} onValueChange={v => setForm({ ...form, phase: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PHASES.map(p => <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Secuencia</Label>
                <Input type="number" value={form.sequence} onChange={e => setForm({ ...form, sequence: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Inicio baseline</Label>
                <DatePicker value={form.baseline_start} onChange={v => setForm({ ...form, baseline_start: v })} placeholder="Seleccionar" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Fin baseline</Label>
                <DatePicker value={form.baseline_end} onChange={v => setForm({ ...form, baseline_end: v })} placeholder="Seleccionar" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Inicio real</Label>
                <DatePicker value={form.actual_start} onChange={v => setForm({ ...form, actual_start: v })} placeholder="Opcional" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Fin real</Label>
                <DatePicker value={form.actual_end} onChange={v => setForm({ ...form, actual_end: v })} placeholder="Opcional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Estado</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">¿Critical path?</Label>
                <div className="flex items-center gap-2 h-9">
                  <Switch checked={form.is_critical_path} onCheckedChange={v => setForm({ ...form, is_critical_path: v })} />
                  <span className="text-[12px] text-gray-500">{form.is_critical_path ? "Sí" : "No"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Opcional..." rows={2} />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={!form.name} className={`flex-1 ${BTN_PRIMARY}`}>Guardar</Button>
              <Button variant="ghost" onClick={() => setFormOpen(false)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar hito?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMilestone} className="bg-red-600 hover:bg-red-700">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Template Confirm */}
      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar plantilla estándar</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Importar hitos estándar de construcción residencial en Florida?
              Esto cargará 14 hitos predefinidos con las fases y secuencias estándar de 360lateral.
              Puedes editar las fechas después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={importTemplate} className={BTN_PRIMARY}>Importar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ label, value, valueColor, icon }: { label: string; value: string; valueColor?: string; icon?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
      <p className="text-[10px] uppercase text-gray-400 mb-0.5">{label}</p>
      <p className={`text-[16px] font-bold text-[#0F1B2D] ${valueColor || ""}`}>
        {icon && <span className="mr-1">{icon}</span>}{value}
      </p>
    </div>
  );
}
