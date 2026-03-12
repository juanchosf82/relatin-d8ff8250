import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { sendNotification, getClientInfoForProject } from "@/lib/notifications";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  BTN_SUCCESS, BTN_PRIMARY, BTN_DANGER,
} from "@/lib/design-system";

interface Props { projectId: string }

const SEVERITY_OPTIONS = [
  { value: "low", label: "Bajo", bg: "bg-gray-100", text: "text-gray-600" },
  { value: "medium", label: "Medio", bg: "bg-orange-100", text: "text-orange-700" },
  { value: "high", label: "Alto", bg: "bg-red-100", text: "text-red-700" },
  { value: "critical", label: "Crítico", bg: "bg-red-200", text: "text-red-900" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Abierto", bg: "bg-red-100", text: "text-red-700" },
  { value: "in_progress", label: "En progreso", bg: "bg-orange-100", text: "text-orange-700" },
  { value: "resolved", label: "Resuelto", bg: "bg-green-100", text: "text-green-700" },
  { value: "closed", label: "Cerrado", bg: "bg-gray-100", text: "text-gray-600" },
];

const CATEGORY_OPTIONS = ["Construcción", "Financiero", "Regulatorio", "Seguridad", "Calidad", "Diseño", "Otro"];

const emptyForm = {
  title: "", description: "", category: "", severity: "medium",
  status: "open", level: "MEDIO", assigned_to: "", due_date: "",
  resolution_note: "", resolved_at: "", visible_to_client: true,
};

const IssuesAdmin = ({ projectId }: Props) => {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchIssues = async () => {
    const { data } = await supabase
      .from("issues")
      .select("*")
      .eq("project_id", projectId)
      .order("opened_at", { ascending: false });
    setIssues(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchIssues(); }, [projectId]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (issue: any) => {
    setEditingId(issue.id);
    setForm({
      title: issue.title || "",
      description: issue.description || "",
      category: issue.category || "",
      severity: issue.severity || "medium",
      status: issue.status || "open",
      level: issue.level || "MEDIO",
      assigned_to: issue.assigned_to || "",
      due_date: issue.due_date || "",
      resolution_note: issue.resolution_note || "",
      resolved_at: issue.resolved_at ? issue.resolved_at.split("T")[0] : "",
      visible_to_client: issue.visible_to_client ?? true,
    });
    setFormOpen(true);
  };

  const saveIssue = async () => {
    if (!form.title && !form.description) return;
    const payload: any = {
      project_id: projectId,
      title: form.title || form.description.slice(0, 80),
      description: form.description,
      category: form.category || null,
      severity: form.severity,
      status: form.status,
      level: form.level,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      resolution_note: form.resolution_note || null,
      resolved_at: form.status === "resolved" && form.resolved_at ? form.resolved_at : form.status === "resolved" ? new Date().toISOString() : null,
      visible_to_client: form.visible_to_client,
    };

    if (editingId) {
      await supabase.from("issues").update(payload).eq("id", editingId);
      toast.success("Issue actualizado");
    } else {
      await supabase.from("issues").insert([payload]);
      toast.success("Issue creado");

      if (["critical", "high"].includes(form.severity) || ["CRÍTICO", "ALTO"].includes(form.level)) {
        const clientInfo = await getClientInfoForProject(projectId);
        if (clientInfo) {
          sendNotification({
            type: "project_issue",
            to: clientInfo.email,
            userId: clientInfo.userId,
            projectId,
            subject: `⚠️ Alerta ${form.severity} — ${clientInfo.projectCode}`,
            data: {
              client_name: clientInfo.clientName,
              project_code: clientInfo.projectCode,
              project_address: clientInfo.projectAddress,
              level: form.level,
              description: form.description,
              project_id: projectId,
            },
          });
        }
      }
    }
    setFormOpen(false);
    fetchIssues();
  };

  const deleteIssue = async () => {
    if (!deleteId) return;
    await supabase.from("issues").delete().eq("id", deleteId);
    toast.success("Issue eliminado");
    setDeleteId(null);
    fetchIssues();
  };

  const quickStatus = async (issueId: string, newStatus: string) => {
    const update: any = { status: newStatus };
    if (newStatus === "resolved") update.resolved_at = new Date().toISOString();
    await supabase.from("issues").update(update).eq("id", issueId);
    toast.success("Estado actualizado");
    fetchIssues();
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelected(next);
  };
  const toggleAll = () => {
    setSelected(selected.size === issues.length ? new Set() : new Set(issues.map(i => i.id)));
  };
  const bulkDelete = async () => {
    await supabase.from("issues").delete().in("id", [...selected]);
    toast.success(`${selected.size} issue(s) eliminados`);
    setSelected(new Set());
    fetchIssues();
  };
  const bulkResolve = async () => {
    await supabase.from("issues").update({ status: "resolved", resolved_at: new Date().toISOString() }).in("id", [...selected]);
    toast.success(`${selected.size} issue(s) resueltos`);
    setSelected(new Set());
    fetchIssues();
  };
  const bulkVisibility = async (visible: boolean) => {
    await supabase.from("issues").update({ visible_to_client: visible }).in("id", [...selected]);
    toast.success(visible ? "Visibles para cliente" : "Ocultos para cliente");
    setSelected(new Set());
    fetchIssues();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  const sevStyle = (s: string) => SEVERITY_OPTIONS.find(o => o.value === s) || SEVERITY_OPTIONS[1];
  const stStyle = (s: string) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-[11px] text-gray-500">{selected.size} seleccionados</span>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={bulkResolve}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar resueltos
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => bulkVisibility(true)}>
                <Eye className="h-3 w-3 mr-1" /> Visibles
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => bulkVisibility(false)}>
                <EyeOff className="h-3 w-3 mr-1" /> Ocultar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px] text-red-600 border-red-200 hover:bg-red-50" onClick={bulkDelete}>
                <Trash2 className="h-3 w-3 mr-1" /> Eliminar
              </Button>
            </>
          )}
        </div>
        <Button size="sm" onClick={openAdd} className={`h-8 ${BTN_SUCCESS}`}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Issue
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className={`${TH_CLASS} w-8`}><Checkbox checked={selected.size === issues.length && issues.length > 0} onCheckedChange={toggleAll} /></th>
              <th className={TH_CLASS}>Título</th>
              <th className={`${TH_CLASS} w-24`}>Severidad</th>
              <th className={`${TH_CLASS} w-32`}>Estado</th>
              <th className={TH_CLASS}>Asignado</th>
              <th className={TH_CLASS}>Fecha</th>
              <th className={`${TH_CLASS} w-16`}>👁</th>
              <th className={`${TH_CLASS} w-20`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue, idx) => {
              const sev = sevStyle(issue.severity ?? "medium");
              const st = stStyle(issue.status ?? "open");
              return (
                <tr key={issue.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100`}>
                  <td className={TD_CLASS}><Checkbox checked={selected.has(issue.id)} onCheckedChange={() => toggleSelect(issue.id)} /></td>
                  <td className={TD_CLASS}>
                    <p className="font-medium">{issue.title || issue.description}</p>
                    {issue.resolution_note && <p className="text-[11px] text-green-600 mt-0.5">✓ {issue.resolution_note}</p>}
                  </td>
                  <td className={TD_CLASS}><Badge className={`${sev.bg} ${sev.text} border-0 text-[10px]`}>{sev.label}</Badge></td>
                  <td className={TD_CLASS}>
                    <Select value={issue.status || "open"} onValueChange={(v) => quickStatus(issue.id, v)}>
                      <SelectTrigger className="w-[120px] h-7 text-[11px] border-gray-200 p-1">
                        <Badge className={`${st.bg} ${st.text} border-0 text-[10px]`}>{st.label}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={`${TD_CLASS} text-[11px]`}>{issue.assigned_to || "—"}</td>
                  <td className={`${TD_CLASS} text-[11px]`}>{issue.opened_at ? new Date(issue.opened_at).toLocaleDateString("es", { day: "numeric", month: "short" }) : "—"}</td>
                  <td className={TD_CLASS}>{issue.visible_to_client ? <Eye className="h-3.5 w-3.5 text-[#0D7377]" /> : <EyeOff className="h-3.5 w-3.5 text-gray-300" />}</td>
                  <td className={TD_CLASS}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(issue)} className="p-1 rounded hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-gray-500" /></button>
                      <button onClick={() => setDeleteId(issue.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {issues.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-[12px]">Sin issues</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Issue" : "Nuevo Issue"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Título</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título del issue" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Descripción</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalle del issue..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Severidad</Label>
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERITY_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
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
                <Label className="text-[11px] text-gray-400">Asignado a</Label>
                <Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Nombre" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Fecha límite</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>

            {(form.status === "resolved" || form.status === "closed") && (
              <>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Nota de resolución</Label>
                  <Textarea value={form.resolution_note} onChange={e => setForm({ ...form, resolution_note: e.target.value })} placeholder="Cómo se resolvió..." rows={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Fecha resolución</Label>
                  <Input type="date" value={form.resolved_at} onChange={e => setForm({ ...form, resolved_at: e.target.value })} />
                </div>
              </>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Switch checked={form.visible_to_client} onCheckedChange={v => setForm({ ...form, visible_to_client: v })} />
              <Label className="text-[12px]">Visible para cliente</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={saveIssue} disabled={!form.title && !form.description} className={BTN_PRIMARY}>
              {editingId ? "Guardar cambios" : "Crear Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar este issue?</DialogTitle></DialogHeader>
          <p className="text-[12px] text-gray-500">
            "{issues.find(i => i.id === deleteId)?.title || issues.find(i => i.id === deleteId)?.description}"
          </p>
          <p className="text-[11px] text-gray-400">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button onClick={deleteIssue} className={BTN_DANGER}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IssuesAdmin;
