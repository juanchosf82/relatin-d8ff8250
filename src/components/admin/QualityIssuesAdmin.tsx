import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE, BTN_SUCCESS, BTN_PRIMARY, BTN_DANGER } from "@/lib/design-system";
import { PHASE_OPTIONS, QUALITY_ISSUE_CATEGORIES, SEVERITY_OPTIONS, QUALITY_STATUS_OPTIONS } from "@/lib/quality-checklists";

interface Props { projectId: string }

type QualityIssue = {
  id: string; project_id: string | null; visit_id: string | null;
  title: string; description: string | null; phase: string | null;
  category: string | null; severity: string | null; status: string | null;
  assigned_to: string | null; due_date: string | null;
  resolution: string | null; resolved_at: string | null;
  visible_to_client: boolean | null; created_at: string | null; updated_at: string | null;
};

const emptyForm = () => ({
  title: "", description: "", phase: "", category: "", severity: "medium",
  assigned_to: "", due_date: "", status: "open", resolution: "", visible_to_client: true,
});

const QualityIssuesAdmin = ({ projectId }: Props) => {
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteIssue, setDeleteIssue] = useState<QualityIssue | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase.from("quality_issues").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    setIssues((data ?? []) as QualityIssue[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setFormOpen(true); };

  const openEdit = (issue: QualityIssue) => {
    setEditingId(issue.id);
    setForm({
      title: issue.title, description: issue.description || "",
      phase: issue.phase || "", category: issue.category || "",
      severity: issue.severity || "medium", assigned_to: issue.assigned_to || "",
      due_date: issue.due_date || "", status: issue.status || "open",
      resolution: issue.resolution || "", visible_to_client: issue.visible_to_client ?? true,
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title) { toast.error("Título requerido"); return; }
    const payload = {
      project_id: projectId, title: form.title, description: form.description || null,
      phase: form.phase || null, category: form.category || null,
      severity: form.severity, status: form.status,
      assigned_to: form.assigned_to || null, due_date: form.due_date || null,
      resolution: form.resolution || null, visible_to_client: form.visible_to_client,
      resolved_at: form.status === "resolved" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      await supabase.from("quality_issues").update(payload).eq("id", editingId);
      toast.success("Issue actualizado");
    } else {
      await supabase.from("quality_issues").insert(payload);
      toast.success("Issue creado");
    }
    setFormOpen(false);
    fetchAll();
  };

  const markResolved = async (issue: QualityIssue) => {
    await supabase.from("quality_issues").update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", issue.id);
    toast.success("Issue resuelto");
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteIssue) return;
    await supabase.from("quality_issues").delete().eq("id", deleteIssue.id);
    toast.success("Issue eliminado");
    setDeleteIssue(null);
    fetchAll();
  };

  const getSeverityBadge = (s: string | null) => {
    const opt = SEVERITY_OPTIONS.find(o => o.value === s);
    return opt ? { label: opt.label, cls: opt.color } : { label: s || "—", cls: "bg-gray-100 text-gray-600" };
  };
  const getStatusBadge = (s: string | null) => {
    const opt = QUALITY_STATUS_OPTIONS.find(o => o.value === s);
    return opt ? { label: opt.label, cls: opt.color } : { label: s || "—", cls: "bg-gray-100 text-gray-600" };
  };

  const openIssues = issues.filter(i => i.status === "open");
  const critCount = openIssues.filter(i => i.severity === "critical").length;
  const medCount = openIssues.filter(i => i.severity === "medium").length;
  const resolvedCount = issues.filter(i => i.status === "resolved").length;
  const overdueCount = openIssues.filter(i => i.due_date && new Date(i.due_date) < new Date()).length;

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[#0F1B2D]">Issues de Calidad</h3>
        <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo issue
        </Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-[#FEE2E2] border border-[#FECACA] rounded-lg px-3 py-2 text-[12px]">
          <span className="text-[#991B1B] font-bold">🔴 Críticos: {critCount}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-3 py-2 text-[12px]">
          <span className="text-[#92400E] font-bold">🟠 Medios: {medCount}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#D1FAE5] border border-[#A7F3D0] rounded-lg px-3 py-2 text-[12px]">
          <span className="text-[#065F46] font-bold">✅ Resueltos: {resolvedCount}</span>
        </div>
        <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] ${overdueCount > 0 ? "bg-[#FEE2E2] border border-[#FECACA]" : "bg-gray-50 border border-gray-200"}`}>
          <span className={overdueCount > 0 ? "text-[#991B1B] font-bold" : "text-gray-500"}>📅 Vencidos: {overdueCount}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className={TH_CLASS}>Issue</th>
              <th className={TH_CLASS}>Fase</th>
              <th className={TH_CLASS}>Severidad</th>
              <th className={TH_CLASS}>Asignado</th>
              <th className={TH_CLASS}>Fecha límite</th>
              <th className={TH_CLASS}>Estado</th>
              <th className={TH_CLASS}>Visible</th>
              <th className={`${TH_CLASS} w-28`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue, idx) => {
              const sev = getSeverityBadge(issue.severity);
              const st = getStatusBadge(issue.status);
              const isOverdue = issue.due_date && new Date(issue.due_date) < new Date() && issue.status === "open";
              return (
                <tr key={issue.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                  <td className={TD_CLASS}>
                    <p className="font-medium text-[#0F1B2D]">{issue.title}</p>
                    {issue.description && <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{issue.description}</p>}
                  </td>
                  <td className={TD_CLASS}>{issue.phase && <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0 text-[10px]">{issue.phase}</Badge>}</td>
                  <td className={TD_CLASS}><Badge className={`${sev.cls} border-0 text-[10px]`}>{sev.label}</Badge></td>
                  <td className={TD_CLASS}>{issue.assigned_to || "—"}</td>
                  <td className={`${TD_CLASS} ${isOverdue ? "text-[#DC2626] font-bold" : ""}`}>{issue.due_date || "—"}</td>
                  <td className={TD_CLASS}><Badge className={`${st.cls} border-0 text-[10px]`}>{st.label}</Badge></td>
                  <td className={TD_CLASS}>{issue.visible_to_client ? "✓" : "—"}</td>
                  <td className={TD_CLASS}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(issue)}><Pencil className="h-3.5 w-3.5 text-gray-400" /></Button>
                      {issue.status === "open" && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => markResolved(issue)}><Check className="h-3.5 w-3.5 text-[#16A34A]" /></Button>}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteIssue(issue)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {issues.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-[12px]">Sin issues de calidad</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Issue" : "Nuevo Issue de Calidad"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-[11px] text-gray-400">Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label className="text-[11px] text-gray-400">Descripción</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px] text-gray-400">Fase</Label>
                <Select value={form.phase} onValueChange={v => setForm({ ...form, phase: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{PHASE_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-[11px] text-gray-400">Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{QUALITY_ISSUE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-[11px] text-gray-400">Severidad</Label>
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERITY_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-[11px] text-gray-400">Estado</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{QUALITY_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px] text-gray-400">Asignado a</Label><Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} /></div>
              <div><Label className="text-[11px] text-gray-400">Fecha límite</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            {(form.status === "resolved" || form.status === "closed") && (
              <div><Label className="text-[11px] text-gray-400">Resolución</Label><Textarea value={form.resolution} onChange={e => setForm({ ...form, resolution: e.target.value })} rows={2} /></div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.visible_to_client} onCheckedChange={v => setForm({ ...form, visible_to_client: v })} />
              <Label className="text-[11px] text-gray-400">¿Visible para cliente?</Label>
            </div>
            <Button className={`w-full ${BTN_PRIMARY}`} onClick={save} disabled={!form.title}>{editingId ? "Actualizar" : "Crear Issue"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteIssue} onOpenChange={() => setDeleteIssue(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar issue "{deleteIssue?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className={BTN_DANGER} onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QualityIssuesAdmin;
