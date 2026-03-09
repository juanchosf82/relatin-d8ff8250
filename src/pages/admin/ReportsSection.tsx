import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { FileDown, UploadCloud, Pencil, Eye, Trash2 } from "lucide-react";
import {
  PAGE_TITLE, PAGE_SUBTITLE, TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  BTN_SUCCESS, BTN_PRIMARY, BTN_DANGER,
} from "@/lib/design-system";
import { sendNotification, getClientInfoForProject } from "@/lib/notifications";

interface Report {
  id: string;
  project_id: string;
  week_number: number | null;
  report_date: string | null;
  highlight_text: string | null;
  pdf_url: string | null;
  published_at: string | null;
  closing_balance: number | null;
}

const ReportsSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [reports, setReports] = useState<Report[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Create form
  const [formData, setFormData] = useState({ week_number: "", report_date: "", highlight_text: "" });

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editReport, setEditReport] = useState<Report | null>(null);
  const [editForm, setEditForm] = useState({ week_number: "", report_date: "", highlight_text: "", published: true });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { supabase.from("projects").select("id, code, address").then(({ data }) => { if (data) setProjects(data); }); }, []);

  const fetchReports = useCallback(() => {
    if (selectedProjectId) {
      supabase.from("weekly_reports").select("*").eq("project_id", selectedProjectId)
        .order("published_at", { ascending: true, nullsFirst: true })
        .order("week_number", { ascending: false })
        .then(({ data }) => { if (data) setReports(data as Report[]); });
    } else { setReports([]); }
  }, [selectedProjectId]);

  useEffect(() => { fetchReports(); setSelected(new Set()); }, [fetchReports]);

  const getProjectCode = (pid: string) => projects.find(p => p.id === pid)?.code || "";

  // ─── CREATE ───
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !file) return toast.error("Seleccione un proyecto y un archivo PDF");
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedProjectId}-week${formData.week_number}-${Date.now()}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from("project_files").upload(`reports/${fileName}`, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("project_files").getPublicUrl(`reports/${fileName}`);
      const weekNum = parseInt(formData.week_number);
      const { error } = await supabase.from("weekly_reports").insert([{
        project_id: selectedProjectId, week_number: weekNum,
        report_date: formData.report_date, highlight_text: formData.highlight_text,
        pdf_url: data.publicUrl, published_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      toast.success("Reporte publicado");

      const clientInfo = await getClientInfoForProject(selectedProjectId);
      if (clientInfo) {
        sendNotification({
          type: "report_published", to: clientInfo.email, userId: clientInfo.userId,
          projectId: selectedProjectId, subject: `Nuevo reporte — ${clientInfo.projectCode}`,
          data: { client_name: clientInfo.clientName, project_code: clientInfo.projectCode, project_address: clientInfo.projectAddress, week_number: String(weekNum), highlight_text: formData.highlight_text, project_id: selectedProjectId },
        });
      }
      setFormData({ week_number: "", report_date: "", highlight_text: "" });
      setFile(null);
      const fileInput = document.getElementById("report-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      fetchReports();
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setUploading(false); }
  };

  // ─── EDIT ───
  const openEdit = (r: Report) => {
    setEditReport(r);
    setEditForm({
      week_number: String(r.week_number ?? ""),
      report_date: r.report_date ?? "",
      highlight_text: r.highlight_text ?? "",
      published: r.published_at != null,
    });
    setEditFile(null);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editReport) return;
    setSaving(true);
    try {
      let newPdfUrl = editReport.pdf_url;

      // Replace PDF if new file uploaded
      if (editFile) {
        // Delete old file from storage
        if (editReport.pdf_url) {
          const oldPath = editReport.pdf_url.split("/project_files/")[1];
          if (oldPath) await supabase.storage.from("project_files").remove([decodeURIComponent(oldPath)]);
        }
        const fileExt = editFile.name.split(".").pop();
        const fileName = `${editReport.project_id}-week${editForm.week_number}-${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from("project_files").upload(`reports/${fileName}`, editFile);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("project_files").getPublicUrl(`reports/${fileName}`);
        newPdfUrl = data.publicUrl;
      }

      const wasPublished = editReport.published_at != null;
      const nowPublished = editForm.published;
      const newPublishedAt = nowPublished ? (wasPublished ? editReport.published_at : new Date().toISOString()) : null;

      const { error } = await supabase.from("weekly_reports").update({
        week_number: parseInt(editForm.week_number),
        report_date: editForm.report_date,
        highlight_text: editForm.highlight_text,
        published_at: newPublishedAt,
        pdf_url: newPdfUrl,
      }).eq("id", editReport.id);
      if (error) throw error;

      toast.success("Reporte actualizado");

      // Notify if changed from draft → published
      if (!wasPublished && nowPublished) {
        const clientInfo = await getClientInfoForProject(editReport.project_id);
        if (clientInfo) {
          sendNotification({
            type: "report_published", to: clientInfo.email, userId: clientInfo.userId,
            projectId: editReport.project_id, subject: `Nuevo reporte — ${clientInfo.projectCode}`,
            data: { client_name: clientInfo.clientName, project_code: clientInfo.projectCode, project_address: clientInfo.projectAddress, week_number: editForm.week_number, highlight_text: editForm.highlight_text, project_id: editReport.project_id },
          });
        }
      }

      setEditOpen(false);
      fetchReports();
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setSaving(false); }
  };

  // ─── DELETE ───
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.pdf_url) {
        const path = deleteTarget.pdf_url.split("/project_files/")[1];
        if (path) await supabase.storage.from("project_files").remove([decodeURIComponent(path)]);
      }
      const { error } = await supabase.from("weekly_reports").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("✓ Reporte eliminado");
      setDeleteTarget(null);
      setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
      fetchReports();
    } catch (err: any) { toast.error("Error: " + err.message); }
  };

  // ─── BULK ───
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === reports.length) setSelected(new Set());
    else setSelected(new Set(reports.map(r => r.id)));
  };

  const bulkPublish = async () => {
    setBulkLoading(true);
    try {
      const drafts = reports.filter(r => selected.has(r.id) && !r.published_at);
      for (const r of drafts) {
        await supabase.from("weekly_reports").update({ published_at: new Date().toISOString() }).eq("id", r.id);
        const clientInfo = await getClientInfoForProject(r.project_id);
        if (clientInfo) {
          sendNotification({
            type: "report_published", to: clientInfo.email, userId: clientInfo.userId,
            projectId: r.project_id, subject: `Nuevo reporte — ${clientInfo.projectCode}`,
            data: { client_name: clientInfo.clientName, project_code: clientInfo.projectCode, project_address: clientInfo.projectAddress, week_number: String(r.week_number), highlight_text: r.highlight_text || "", project_id: r.project_id },
          });
        }
      }
      toast.success(`${drafts.length} reportes publicados`);
      setSelected(new Set());
      fetchReports();
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setBulkLoading(false); }
  };

  const bulkDelete = async () => {
    setBulkLoading(true);
    try {
      const toDelete = reports.filter(r => selected.has(r.id));
      for (const r of toDelete) {
        if (r.pdf_url) {
          const path = r.pdf_url.split("/project_files/")[1];
          if (path) await supabase.storage.from("project_files").remove([decodeURIComponent(path)]);
        }
        await supabase.from("weekly_reports").delete().eq("id", r.id);
      }
      toast.success(`${toDelete.length} reportes eliminados`);
      setSelected(new Set());
      fetchReports();
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setBulkLoading(false); }
  };

  const pdfFileName = (url: string | null) => {
    if (!url) return null;
    try { return decodeURIComponent(url.split("/").pop() || ""); } catch { return url.split("/").pop(); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className={PAGE_TITLE}>Reportes Semanales</h2>
        <p className={PAGE_SUBTITLE}>Publicación de reportes para clientes</p>
      </div>

      <div className="w-full max-w-md">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
          <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.address}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {selectedProjectId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload form */}
          <div className="md:col-span-1 bg-white p-5 rounded-lg border border-gray-200 shadow-sm h-fit">
            <h3 className="text-[14px] font-bold text-[#0F1B2D] mb-4">Subir Nuevo Reporte</h3>
            <form onSubmit={handleUploadReport} className="space-y-4">
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Semana Nº</Label><Input type="number" required value={formData.week_number} onChange={(e) => setFormData({ ...formData, week_number: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Fecha del Reporte</Label><Input type="date" required value={formData.report_date} onChange={(e) => setFormData({ ...formData, report_date: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Highlights</Label><Textarea required value={formData.highlight_text} onChange={(e) => setFormData({ ...formData, highlight_text: e.target.value })} placeholder="Resumen de la semana..." /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Archivo PDF</Label><Input id="report-file" type="file" accept=".pdf" required onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
              <Button type="submit" disabled={uploading} className={`w-full ${BTN_SUCCESS}`}>
                {uploading ? "Subiendo..." : <><UploadCloud className="w-4 h-4 mr-2" /> Publicar Reporte</>}
              </Button>
            </form>
          </div>

          {/* Reports table */}
          <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className="flex items-center gap-3 px-3 py-2 bg-[#F0FAFA] border-b border-gray-200">
                <span className="text-[12px] font-semibold text-[#0F1B2D]">{selected.size} seleccionados</span>
                <Button size="sm" className={BTN_SUCCESS} disabled={bulkLoading} onClick={bulkPublish}>Publicar todos</Button>
                <Button size="sm" className={BTN_DANGER} disabled={bulkLoading} onClick={bulkDelete}>Eliminar seleccionados</Button>
              </div>
            )}

            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className={TH_CLASS + " w-8"}>
                    <Checkbox checked={reports.length > 0 && selected.size === reports.length} onCheckedChange={toggleAll} className="border-white data-[state=checked]:bg-[#0D7377] data-[state=checked]:border-[#0D7377]" />
                  </th>
                  <th className={TH_CLASS}>Semana</th>
                  <th className={TH_CLASS}>Fecha</th>
                  <th className={TH_CLASS}>Highlight</th>
                  <th className={TH_CLASS}>Estado</th>
                  <th className={TH_CLASS}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => {
                  const isDraft = !r.published_at;
                  return (
                    <tr key={r.id} className={`${isDraft ? "bg-gray-50" : TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                      <td className={TD_CLASS}>
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                      </td>
                      <td className={`${TD_CLASS} font-semibold`}>Semana {r.week_number}</td>
                      <td className={TD_CLASS}>{r.report_date}</td>
                      <td className={`${TD_CLASS} max-w-[200px] truncate`}>{r.highlight_text}</td>
                      <td className={TD_CLASS}>
                        {isDraft
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-600">Borrador</span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D1FAE5] text-[#065F46]">Publicado ✓</span>
                        }
                      </td>
                      <td className={TD_CLASS}>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7 border-[#0D7377] text-[#0D7377] hover:bg-[#E8F4F4]" onClick={() => openEdit(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {r.pdf_url && (
                            <Button variant="outline" size="icon" className="h-7 w-7 border-gray-300 text-gray-500 hover:bg-gray-50" asChild>
                              <a href={r.pdf_url} target="_blank" rel="noreferrer"><Eye className="w-3.5 h-3.5" /></a>
                            </Button>
                          )}
                          <Button variant="outline" size="icon" className="h-7 w-7 border-red-300 text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(r)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {reports.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-[12px]">No hay reportes publicados</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── EDIT DIALOG ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[14px] font-bold text-[#0F1B2D]">Editar Reporte — Semana {editReport?.week_number}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label className="text-[11px] text-gray-400">Semana Nº</Label><Input type="number" value={editForm.week_number} onChange={e => setEditForm({ ...editForm, week_number: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-[11px] text-gray-400">Fecha del Reporte</Label><Input type="date" value={editForm.report_date} onChange={e => setEditForm({ ...editForm, report_date: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-[11px] text-gray-400">Highlights</Label><Textarea value={editForm.highlight_text} onChange={e => setEditForm({ ...editForm, highlight_text: e.target.value })} /></div>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-gray-400">Estado</Label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">{editForm.published ? "Publicado" : "Borrador"}</span>
                <Switch checked={editForm.published} onCheckedChange={v => setEditForm({ ...editForm, published: v })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-gray-400">PDF actual</Label>
              {editReport?.pdf_url ? (
                <p className="text-[11px] text-[#0D7377] truncate">{pdfFileName(editReport.pdf_url)}</p>
              ) : <p className="text-[11px] text-gray-400">Sin archivo</p>}
              <Label className="text-[11px] text-gray-400">Reemplazar PDF</Label>
              <Input type="file" accept=".pdf" onChange={e => setEditFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button className={BTN_SUCCESS} disabled={saving} onClick={handleSaveEdit}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reporte Semana {deleteTarget?.week_number}?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReportsSection;
