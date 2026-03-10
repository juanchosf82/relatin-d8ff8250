import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertTriangle, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { BTN_SUCCESS } from "@/lib/design-system";
import { PHASE_OPTIONS } from "@/lib/quality-checklists";

interface Props { projectId: string }

type Photo = {
  id: string; visit_id: string | null; project_id: string | null;
  photo_url: string; caption: string | null; phase: string | null;
  category: string | null; is_issue: boolean | null;
  visible_to_client: boolean | null; taken_at: string | null; created_at: string | null;
};

type Visit = { id: string; visit_date: string };

const VisitPhotosAdmin = ({ projectId }: Props) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [issueFilter, setIssueFilter] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadVisitId, setUploadVisitId] = useState("");
  const [uploadPhase, setUploadPhase] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [pRes, vRes] = await Promise.all([
      supabase.from("visit_photos").select("*").eq("project_id", projectId).order("taken_at", { ascending: false }),
      supabase.from("field_visits").select("id, visit_date").eq("project_id", projectId).order("visit_date", { ascending: false }),
    ]);
    setPhotos((pRes.data ?? []) as Photo[]);
    setVisits((vRes.data ?? []) as Visit[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  const filtered = photos.filter(p => {
    if (filter !== "all" && p.visit_id !== filter) return false;
    if (phaseFilter !== "all" && p.phase !== phaseFilter) return false;
    if (issueFilter && !p.is_issue) return false;
    return true;
  });

  const toggleVisibility = async (photo: Photo) => {
    await supabase.from("visit_photos").update({ visible_to_client: !photo.visible_to_client }).eq("id", photo.id);
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, visible_to_client: !p.visible_to_client } : p));
  };

  const deletePhoto = async (photo: Photo) => {
    // Delete from storage
    const path = photo.photo_url.split("/project_files/")[1];
    if (path) await supabase.storage.from("project_files").remove([path]);
    await supabase.from("visit_photos").delete().eq("id", photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    toast.success("Foto eliminada");
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    for (const file of uploadFiles) {
      const ext = file.name.split(".").pop();
      const path = `visits/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("project_files").upload(path, file);
      if (uploadErr) { toast.error(`Error subiendo ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from("project_files").getPublicUrl(path);
      await supabase.from("visit_photos").insert({
        visit_id: uploadVisitId || null,
        project_id: projectId,
        photo_url: urlData.publicUrl,
        phase: uploadPhase || null,
        caption: file.name.replace(/\.[^.]+$/, ""),
      });
    }
    toast.success(`${uploadFiles.length} foto(s) subida(s)`);
    setUploadOpen(false);
    setUploadFiles([]);
    setUploading(false);
    fetchAll();
  };

  const lightboxPhoto = lightboxIdx !== null ? filtered[lightboxIdx] : null;

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[#0F1B2D]">Registro Fotográfico</h3>
        <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={() => setUploadOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Subir fotos
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] h-8 text-[11px]"><SelectValue placeholder="Todas las visitas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las visitas</SelectItem>
            {visits.map(v => <SelectItem key={v.id} value={v.id}>{v.visit_date}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[140px] h-8 text-[11px]"><SelectValue placeholder="Todas las fases" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {PHASE_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant={issueFilter ? "default" : "outline"} className={`h-8 text-[11px] ${issueFilter ? "bg-[#DC2626] text-white" : ""}`} onClick={() => setIssueFilter(!issueFilter)}>
          <AlertTriangle className="h-3 w-3 mr-1" /> Solo issues
        </Button>
      </div>

      {/* Photo grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-[12px]">Sin fotos</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((photo, idx) => (
            <div key={photo.id} className="group relative bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="aspect-square cursor-pointer" onClick={() => setLightboxIdx(idx)}>
                <img src={photo.photo_url} alt={photo.caption || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
              </div>
              {photo.is_issue && (
                <Badge className="absolute top-2 right-2 bg-[#DC2626] text-white border-0 text-[9px]">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Issue
                </Badge>
              )}
              {!photo.visible_to_client && (
                <div className="absolute top-2 left-2 bg-black/60 rounded px-1.5 py-0.5 text-white text-[9px] flex items-center gap-0.5">
                  <EyeOff className="h-2.5 w-2.5" /> Oculto
                </div>
              )}
              <div className="p-2">
                <p className="text-[11px] text-[#0F1B2D] truncate">{photo.caption || "Sin caption"}</p>
                <div className="flex items-center justify-between mt-1">
                  {photo.phase && <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0 text-[9px]">{photo.phase}</Badge>}
                  <span className="text-[9px] text-gray-400">{photo.taken_at ? new Date(photo.taken_at).toLocaleDateString("es") : ""}</span>
                </div>
                <div className="hidden group-hover:flex gap-1 mt-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleVisibility(photo)}>
                    {photo.visible_to_client ? <Eye className="h-3 w-3 text-gray-400" /> : <EyeOff className="h-3 w-3 text-orange-400" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deletePhoto(photo)}>
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxIdx(null)}>
          <Button variant="ghost" className="absolute top-4 right-4 text-white h-10 w-10 p-0" onClick={() => setLightboxIdx(null)}><X className="h-6 w-6" /></Button>
          {lightboxIdx! > 0 && (
            <Button variant="ghost" className="absolute left-4 text-white h-10 w-10 p-0" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx! - 1); }}><ChevronLeft className="h-8 w-8" /></Button>
          )}
          {lightboxIdx! < filtered.length - 1 && (
            <Button variant="ghost" className="absolute right-4 text-white h-10 w-10 p-0" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx! + 1); }}><ChevronRight className="h-8 w-8" /></Button>
          )}
          <div className="max-w-4xl max-h-[80vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={lightboxPhoto.photo_url} alt={lightboxPhoto.caption || ""} className="max-h-[70vh] object-contain rounded" />
            <div className="mt-3 text-white text-center">
              <p className="text-[14px]">{lightboxPhoto.caption || "Sin caption"}</p>
              <div className="flex items-center gap-2 justify-center mt-1 text-[11px] text-white/60">
                {lightboxPhoto.phase && <span>{lightboxPhoto.phase}</span>}
                {lightboxPhoto.taken_at && <span>{new Date(lightboxPhoto.taken_at).toLocaleDateString("es")}</span>}
                {lightboxPhoto.is_issue && <Badge className="bg-[#DC2626] text-white border-0 text-[9px]">Issue</Badge>}
              </div>
              <a href={lightboxPhoto.photo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0D7377] mt-2 hover:underline">
                <Download className="h-3 w-3" /> Descargar
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Subir fotos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-[11px] text-gray-400">Visita asociada</Label>
              <Select value={uploadVisitId} onValueChange={setUploadVisitId}>
                <SelectTrigger><SelectValue placeholder="Sin visita asociada" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ninguna</SelectItem>
                  {visits.map(v => <SelectItem key={v.id} value={v.id}>{v.visit_date}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-[11px] text-gray-400">Fase</Label>
              <Select value={uploadPhase} onValueChange={setUploadPhase}>
                <SelectTrigger><SelectValue placeholder="Seleccionar fase" /></SelectTrigger>
                <SelectContent>{PHASE_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-gray-400">Fotos</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input type="file" multiple accept="image/*" onChange={e => setUploadFiles(Array.from(e.target.files || []))} className="hidden" id="photo-upload" />
                <label htmlFor="photo-upload" className="cursor-pointer text-[12px] text-[#0D7377] hover:underline">
                  {uploadFiles.length > 0 ? `${uploadFiles.length} archivo(s) seleccionado(s)` : "Clic para seleccionar fotos"}
                </label>
              </div>
            </div>
            <Button className={BTN_SUCCESS} onClick={handleUpload} disabled={uploadFiles.length === 0 || uploading}>
              {uploading ? "Subiendo..." : `Subir ${uploadFiles.length} foto(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisitPhotosAdmin;
