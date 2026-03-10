import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Camera, ClipboardCheck, Calendar, Users, AlertCircle, CloudSun, Upload, X, ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { BTN_SUCCESS, BTN_PRIMARY, BTN_DANGER, SECTION_CARD } from "@/lib/design-system";
import { PHASE_OPTIONS, WEATHER_OPTIONS, PHASE_CHECKLISTS } from "@/lib/quality-checklists";

interface Props { projectId: string }

type Visit = {
  id: string; visit_date: string; visited_by: string; phase: string | null;
  physical_progress_observed: number | null; weather_conditions: string | null;
  workers_on_site: number | null; general_summary: string | null;
  highlights: string | null; concerns: string | null; action_items: string | null;
  next_visit_date: string | null; visible_to_client: boolean | null;
  created_at: string | null; updated_at: string | null; project_id: string | null;
};

type ChecklistRow = {
  id?: string; visit_id?: string; project_id?: string; phase: string;
  category: string; item: string; result: string; notes: string;
  requires_action: boolean; sequence: number;
};

type PhotoFile = {
  file: File;
  preview: string;
  caption: string;
  isIssue: boolean;
};

const emptyForm = () => ({
  visit_date: new Date().toISOString().split("T")[0],
  visited_by: "",
  phase: "",
  weather_conditions: "",
  workers_on_site: 0,
  physical_progress_observed: 0,
  general_summary: "",
  highlights: "",
  concerns: "",
  action_items: "",
  next_visit_date: "",
  visible_to_client: true,
});

const VisitasAdmin = ({ projectId }: Props) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [qualityIssuesCount, setQualityIssuesCount] = useState(0);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [checklistCounts, setChecklistCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [photoFiles, setPhotoFiles] = useState<PhotoFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleteVisit, setDeleteVisit] = useState<Visit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [vRes, qiRes] = await Promise.all([
      supabase.from("field_visits").select("*").eq("project_id", projectId).order("visit_date", { ascending: false }),
      supabase.from("quality_issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "open"),
    ]);
    const visitsList = (vRes.data ?? []) as Visit[];
    setVisits(visitsList);
    setQualityIssuesCount(qiRes.count ?? 0);

    // Fetch photo and checklist counts per visit
    if (visitsList.length > 0) {
      const visitIds = visitsList.map(v => v.id);
      const [photoRes, clRes] = await Promise.all([
        supabase.from("visit_photos").select("visit_id").in("visit_id", visitIds),
        supabase.from("quality_checklist_items").select("visit_id").in("visit_id", visitIds),
      ]);
      const pc: Record<string, number> = {};
      (photoRes.data ?? []).forEach((p: any) => { pc[p.visit_id] = (pc[p.visit_id] || 0) + 1; });
      setPhotoCounts(pc);
      const cc: Record<string, number> = {};
      (clRes.data ?? []).forEach((c: any) => { cc[c.visit_id] = (cc[c.visit_id] || 0) + 1; });
      setChecklistCounts(cc);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setChecklist([]);
    setPhotoFiles([]);
    setFormOpen(true);
  };

  const openEdit = async (v: Visit) => {
    setEditingId(v.id);
    setForm({
      visit_date: v.visit_date,
      visited_by: v.visited_by,
      phase: v.phase || "",
      weather_conditions: v.weather_conditions || "",
      workers_on_site: v.workers_on_site ?? 0,
      physical_progress_observed: v.physical_progress_observed ?? 0,
      general_summary: v.general_summary || "",
      highlights: v.highlights || "",
      concerns: v.concerns || "",
      action_items: v.action_items || "",
      next_visit_date: v.next_visit_date || "",
      visible_to_client: v.visible_to_client ?? true,
    });
    const clRes = await supabase.from("quality_checklist_items").select("*").eq("visit_id", v.id).order("sequence");
    setChecklist((clRes.data ?? []).map((c: any) => ({
      id: c.id, visit_id: c.visit_id, project_id: c.project_id,
      phase: c.phase, category: c.category, item: c.item,
      result: c.result || "pending", notes: c.notes || "",
      requires_action: c.requires_action || false, sequence: c.sequence,
    })));
    setPhotoFiles([]);
    setFormOpen(true);
  };

  const loadChecklist = () => {
    if (!form.phase) { toast.error("Selecciona una fase primero"); return; }
    const items = PHASE_CHECKLISTS[form.phase];
    if (!items) { toast.info("No hay checklist predefinido para esta fase"); return; }
    setChecklist(items.map(i => ({ ...i, result: "pending", notes: "", requires_action: false })));
    toast.success(`${items.length} items cargados`);
  };

  const updateChecklistItem = (idx: number, field: string, value: any) => {
    setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value, requires_action: field === "result" ? value === "observation" : c.requires_action } : c));
  };

  const addFiles = (files: FileList | File[]) => {
    const newPhotos: PhotoFile[] = Array.from(files).filter(f => f.type.startsWith("image/")).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      caption: f.name.replace(/\.[^.]+$/, ""),
      isIssue: false,
    }));
    setPhotoFiles(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (idx: number) => {
    setPhotoFiles(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updatePhoto = (idx: number, field: keyof PhotoFile, value: any) => {
    setPhotoFiles(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const uploadPhotos = async (visitId: string) => {
    for (const photo of photoFiles) {
      const ext = photo.file.name.split(".").pop();
      const path = `visits/${projectId}/${visitId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("project_files").upload(path, photo.file);
      if (error) { toast.error(`Error subiendo ${photo.caption}`); continue; }
      const { data: urlData } = supabase.storage.from("project_files").getPublicUrl(path);
      await supabase.from("visit_photos").insert({
        visit_id: visitId, project_id: projectId,
        photo_url: urlData.publicUrl, caption: photo.caption || null,
        phase: form.phase || null, is_issue: photo.isIssue,
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const save = async () => {
    if (!form.visit_date || !form.visited_by) { toast.error("Fecha y visitante son requeridos"); return; }
    
    if (editingId) {
      await supabase.from("field_visits").update({
        visit_date: form.visit_date, visited_by: form.visited_by, phase: form.phase || null,
        physical_progress_observed: form.physical_progress_observed, weather_conditions: form.weather_conditions || null,
        workers_on_site: form.workers_on_site, general_summary: form.general_summary || null,
        highlights: form.highlights || null, concerns: form.concerns || null,
        action_items: form.action_items || null, next_visit_date: form.next_visit_date || null,
        visible_to_client: form.visible_to_client, updated_at: new Date().toISOString(),
      }).eq("id", editingId);

      // Delete old checklist and re-insert
      await supabase.from("quality_checklist_items").delete().eq("visit_id", editingId);
      if (checklist.length > 0) {
        await supabase.from("quality_checklist_items").insert(
          checklist.map(c => ({
            visit_id: editingId, project_id: projectId, phase: c.phase,
            category: c.category, item: c.item, result: c.result,
            notes: c.notes || null, requires_action: c.requires_action, sequence: c.sequence,
          }))
        );
      }

      // Upload new photos for edit
      if (photoFiles.length > 0) await uploadPhotos(editingId);

      toast.success("Visita actualizada");
    } else {
      const { data: newVisit } = await supabase.from("field_visits").insert({
        project_id: projectId, visit_date: form.visit_date, visited_by: form.visited_by,
        phase: form.phase || null, physical_progress_observed: form.physical_progress_observed,
        weather_conditions: form.weather_conditions || null, workers_on_site: form.workers_on_site,
        general_summary: form.general_summary || null, highlights: form.highlights || null,
        concerns: form.concerns || null, action_items: form.action_items || null,
        next_visit_date: form.next_visit_date || null, visible_to_client: form.visible_to_client,
      }).select().single();

      if (newVisit && checklist.length > 0) {
        await supabase.from("quality_checklist_items").insert(
          checklist.map(c => ({
            visit_id: newVisit.id, project_id: projectId, phase: c.phase,
            category: c.category, item: c.item, result: c.result,
            notes: c.notes || null, requires_action: c.requires_action, sequence: c.sequence,
          }))
        );

        // Auto-create quality issues for observations
        const observations = checklist.filter(c => c.result === "observation");
        if (observations.length > 0) {
          await supabase.from("quality_issues").insert(
            observations.map(c => ({
              project_id: projectId, visit_id: newVisit.id,
              title: c.item, description: c.notes || `Observación en ${c.phase}: ${c.item}`,
              phase: c.phase, category: c.category, severity: "medium", status: "open",
            }))
          );
        }
      }

      // Update project last_visit_date
      await supabase.from("projects").update({ last_visit_date: form.visit_date }).eq("id", projectId);
      toast.success("Visita registrada");
    }

    setFormOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteVisit) return;
    await supabase.from("quality_checklist_items").delete().eq("visit_id", deleteVisit.id);
    await supabase.from("visit_photos").delete().eq("visit_id", deleteVisit.id);
    await supabase.from("field_visits").delete().eq("id", deleteVisit.id);
    toast.success("Visita eliminada");
    setDeleteVisit(null);
    fetchAll();
  };

  const formatRelDate = (d: string | null) => {
    if (!d) return "—";
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Ayer";
    if (diff <= 7) return `Hace ${diff} días`;
    return new Date(d).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  };

  const lastVisit = visits[0];
  const totalVisits = visits.length;

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-[#0F1B2D]">Visitas de Campo — Cap. 5</h3>
        </div>
        <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Nueva visita
        </Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]">
          <Calendar className="h-3.5 w-3.5 text-[#0D7377]" />
          <span className="text-gray-400">Total visitas:</span>
          <span className="font-bold text-[#0F1B2D]">{totalVisits}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]">
          <Calendar className="h-3.5 w-3.5 text-[#0D7377]" />
          <span className="text-gray-400">Última visita:</span>
          <span className="font-bold text-[#0F1B2D]">{formatRelDate(lastVisit?.visit_date ?? null)}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px]">
          <Calendar className="h-3.5 w-3.5 text-[#0D7377]" />
          <span className="text-gray-400">Próxima visita:</span>
          <span className="font-bold text-[#0F1B2D]">{lastVisit?.next_visit_date || "—"}</span>
        </div>
        <div className={`flex items-center gap-1.5 border rounded-lg px-3 py-2 text-[12px] ${qualityIssuesCount > 0 ? "bg-[#FEF3C7] border-[#F59E0B]" : "bg-white border-gray-200"}`}>
          <AlertCircle className={`h-3.5 w-3.5 ${qualityIssuesCount > 0 ? "text-[#D97706]" : "text-gray-400"}`} />
          <span className="text-gray-500">Issues abiertos:</span>
          <span className="font-bold">{qualityIssuesCount}</span>
        </div>
      </div>

      {/* Visits list */}
      {visits.length === 0 ? (
        <div className={`${SECTION_CARD} text-center text-gray-400 text-[12px] py-12`}>
          Sin visitas de campo registradas. Haz clic en "Nueva visita" para comenzar.
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map(v => {
            const hasOpenIssues = (v.concerns && v.concerns.length > 0);
            const borderColor = hasOpenIssues ? "border-l-[#E07B39]" : !v.concerns ? "border-l-[#16A34A]" : "border-l-gray-300";
            return (
              <div key={v.id} className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 border-l-4 ${borderColor}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 text-[12px]">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-[#0D7377]" /> {v.visit_date}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-gray-400" /> {v.visited_by}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5 text-gray-400" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteVisit(v)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2 text-[11px]">
                  {v.phase && <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0">Fase: {v.phase}</Badge>}
                  {v.weather_conditions && <span className="flex items-center gap-1 text-gray-400"><CloudSun className="h-3 w-3" />{v.weather_conditions}</span>}
                  {v.workers_on_site != null && <span className="flex items-center gap-1 text-gray-400"><Users className="h-3 w-3" />{v.workers_on_site} obreros</span>}
                </div>
                {v.physical_progress_observed != null && (
                  <p className="text-[12px] text-[#0F1B2D] mb-2">Av. físico observado: <span className="font-bold text-[#0D7377]">{v.physical_progress_observed}%</span></p>
                )}
                {v.highlights && (
                  <div className="mb-2">
                    <p className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">Highlights</p>
                    <p className="text-[12px] text-gray-600 italic">"{v.highlights}"</p>
                  </div>
                )}
                {v.concerns && (
                  <div className="mb-2">
                    <p className="text-[10px] uppercase text-[#E07B39] font-semibold mb-0.5">Concerns</p>
                    <p className="text-[12px] text-gray-600 italic">"{v.concerns}"</p>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px] cursor-pointer">
                    <Camera className="h-3 w-3 mr-1" /> Ver fotos ({photoCounts[v.id] || 0})
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px] cursor-pointer">
                    <ClipboardCheck className="h-3 w-3 mr-1" /> Ver checklist ({checklistCounts[v.id] || 0})
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visit form modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Visita" : "Nueva Visita de Campo"}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Section 1 - General */}
            <div>
              <h4 className="text-[13px] font-bold text-[#0F1B2D] mb-3">General</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[11px] text-gray-400">Fecha de visita</Label><Input type="date" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} /></div>
                <div><Label className="text-[11px] text-gray-400">Visitado por</Label><Input value={form.visited_by} onChange={e => setForm({ ...form, visited_by: e.target.value })} placeholder="Nombre del visitante" /></div>
                <div><Label className="text-[11px] text-gray-400">Fase</Label>
                  <Select value={form.phase} onValueChange={v => setForm({ ...form, phase: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar fase" /></SelectTrigger>
                    <SelectContent>{PHASE_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[11px] text-gray-400">Condiciones climáticas</Label>
                  <Select value={form.weather_conditions} onValueChange={v => setForm({ ...form, weather_conditions: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{WEATHER_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[11px] text-gray-400">Obreros en sitio</Label><Input type="number" value={form.workers_on_site} onChange={e => setForm({ ...form, workers_on_site: Number(e.target.value) })} /></div>
                <div><Label className="text-[11px] text-gray-400">Avance físico observado %</Label><Input type="number" value={form.physical_progress_observed} onChange={e => setForm({ ...form, physical_progress_observed: Number(e.target.value) })} /></div>
              </div>
            </div>

            {/* Section 2 - Narrative */}
            <div>
              <h4 className="text-[13px] font-bold text-[#0F1B2D] mb-3">Reporte narrativo</h4>
              <div className="space-y-3">
                <div><Label className="text-[11px] text-gray-400">Resumen general</Label><Textarea value={form.general_summary} onChange={e => setForm({ ...form, general_summary: e.target.value })} rows={3} /></div>
                <div><Label className="text-[11px] text-gray-400">Highlights / Avances positivos</Label><Textarea value={form.highlights} onChange={e => setForm({ ...form, highlights: e.target.value })} rows={2} /></div>
                <div><Label className="text-[11px] text-gray-400">Concerns / Puntos de atención</Label><Textarea value={form.concerns} onChange={e => setForm({ ...form, concerns: e.target.value })} rows={2} /></div>
                <div><Label className="text-[11px] text-gray-400">Action items</Label><Textarea value={form.action_items} onChange={e => setForm({ ...form, action_items: e.target.value })} rows={2} /></div>
                <div><Label className="text-[11px] text-gray-400">Próxima visita programada</Label><Input type="date" value={form.next_visit_date} onChange={e => setForm({ ...form, next_visit_date: e.target.value })} /></div>
              </div>
            </div>

            {/* Section 3 - Checklist */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[13px] font-bold text-[#0F1B2D]">Checklist de calidad — Florida Building Code</h4>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={loadChecklist}>Cargar checklist de fase</Button>
              </div>
              {checklist.length > 0 ? (
                <div className="space-y-1">
                  {checklist.map((c, idx) => (
                    <div key={idx} className={`flex items-start gap-2 p-2 rounded text-[12px] ${c.result === "approved" ? "bg-[#D1FAE5]" : c.result === "observation" ? "bg-[#FEE2E2]" : "bg-gray-50"}`}>
                      <span className="font-mono text-gray-400 w-5 shrink-0">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="text-[#0F1B2D]">{c.item}</p>
                        <div className="flex gap-1 mt-1">
                          <Button size="sm" variant={c.result === "approved" ? "default" : "outline"} className={`h-6 text-[10px] px-2 ${c.result === "approved" ? "bg-[#16A34A] text-white" : ""}`} onClick={() => updateChecklistItem(idx, "result", "approved")}>✓ Aprobado</Button>
                          <Button size="sm" variant={c.result === "observation" ? "default" : "outline"} className={`h-6 text-[10px] px-2 ${c.result === "observation" ? "bg-[#DC2626] text-white" : ""}`} onClick={() => updateChecklistItem(idx, "result", "observation")}>✗ Observación</Button>
                          <Button size="sm" variant={c.result === "na" ? "default" : "outline"} className={`h-6 text-[10px] px-2 ${c.result === "na" ? "bg-gray-500 text-white" : ""}`} onClick={() => updateChecklistItem(idx, "result", "na")}>— N/A</Button>
                        </div>
                        {c.result === "observation" && (
                          <Input className="mt-1 h-7 text-[11px]" placeholder="Notas de observación..." value={c.notes} onChange={e => updateChecklistItem(idx, "notes", e.target.value)} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-gray-400 text-center py-4">Selecciona una fase y haz clic en "Cargar checklist de fase"</p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button className={BTN_PRIMARY} onClick={save}>Guardar visita</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteVisit} onOpenChange={() => setDeleteVisit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar visita del {deleteVisit?.visit_date}?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará la visita, su checklist y fotos asociadas. No se puede deshacer.</AlertDialogDescription>
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

export default VisitasAdmin;
