import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload } from "lucide-react";
import FileUploadSource from "@/components/FileUploadSource";

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  phase: string | null;
  category: string | null;
  is_issue: boolean | null;
  created_at: string;
}

const PHASES = ["Pre-construcción", "Demolición", "Cimentación", "Estructura", "Obra gris", "Acabados", "Entrega"];
const CATEGORIES = ["Progress", "Issue", "Material", "Other"];

const GcPhotosTab = ({ projectId }: { projectId: string }) => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [phase, setPhase] = useState("");
  const [category, setCategory] = useState("Progress");
  const [isIssue, setIsIssue] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from("visit_photos")
      .select("id, photo_url, caption, phase, category, is_issue, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setPhotos(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPhotos(); }, [projectId]);

  const handleFileSelected = async (file: File) => {
    if (!user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `project_files/gc_photos/${projectId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("project_files")
      .upload(path, file);

    if (uploadError) {
      toast.error("Error subiendo archivo: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("project_files").getPublicUrl(path);

    const { error } = await supabase.from("visit_photos").insert({
      project_id: projectId,
      photo_url: urlData.publicUrl,
      caption: caption || null,
      phase: phase || null,
      category: category || null,
      is_issue: isIssue,
      visible_to_client: false,
    });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("✓ Foto subida");
      setCaption("");
      setPhase("");
      setCategory("Progress");
      setIsIssue(false);
      fetchPhotos();
    }
    setUploading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E07B39]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-gray-400">Las fotos son revisadas por 360lateral antes de ser visibles para el cliente.</p>
        <Button onClick={() => setShowUpload(!showUpload)} size="sm" className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
          <Camera className="h-3.5 w-3.5 mr-1" /> Subir Fotos
        </Button>
      </div>

      {showUpload && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-gray-500">Caption</Label>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} className="text-[12px] h-8" placeholder="Descripción de la foto" />
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Fase</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger className="text-[12px] h-8"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-[12px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={isIssue} onCheckedChange={setIsIssue} className="data-[state=checked]:bg-[#DC2626]" />
              <span className="text-[11px] text-gray-600">¿Es un issue?</span>
            </div>
          </div>
          <FileUploadSource
            onFileSelected={handleFileSelected}
            accept="image/*,video/mp4"
            projectId={projectId}
            storagePath={`project_files/gc_photos/${projectId}/`}
          />
          {uploading && <p className="text-[11px] text-[#E07B39]">Subiendo...</p>}
        </div>
      )}

      {/* Photo Gallery */}
      {photos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-[13px]">No hay fotos aún</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
              <img
                src={photo.photo_url}
                alt={photo.caption || "Foto"}
                className="w-full h-32 object-cover"
              />
              {photo.is_issue && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">ISSUE</span>
              )}
              <div className="p-2">
                <p className="text-[11px] text-[#0F1B2D] font-medium truncate">{photo.caption || "Sin descripción"}</p>
                {photo.phase && <p className="text-[10px] text-gray-400">{photo.phase}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GcPhotosTab;
