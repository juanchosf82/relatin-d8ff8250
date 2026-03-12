import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import FileUploadSource, { type FileUploadAccept } from "@/components/FileUploadSource";

const FILE_CATEGORIES = [
  { key: "fotos_campo", label: "Fotos de Campo", icon: "📷", accept: "images" as FileUploadAccept, folder: "fotos", multiple: true },
  { key: "planos", label: "Planos", icon: "📐", accept: "pdf+images" as FileUploadAccept, folder: "planos", multiple: true },
  { key: "contrato", label: "Contrato", icon: "📋", accept: "pdf" as FileUploadAccept, folder: "contrato", multiple: true },
  { key: "permiso", label: "Permiso", icon: "🏛", accept: "pdf" as FileUploadAccept, folder: "permiso", multiple: true },
  { key: "sheets", label: "Sheets", icon: "📊", accept: "excel" as FileUploadAccept, folder: "sheets", multiple: true },
];

interface ProjectFile {
  id: string;
  category: string;
  name: string;
  file_url: string | null;
  file_name: string | null;
  uploaded_at: string | null;
}

interface ProjectFileCardsProps {
  projectId: string;
  readOnly?: boolean;
  onFilesChanged?: (categoriesWithFiles: string[]) => void;
}

export default function ProjectFileCards({ projectId, readOnly = false, onFilesChanged }: ProjectFileCardsProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchFiles = async () => {
    const cats = FILE_CATEGORIES.map(c => c.key);
    const { data } = await supabase
      .from("project_documents")
      .select("id, category, name, file_url, file_name, uploaded_at")
      .eq("project_id", projectId)
      .in("category", cats)
      .order("uploaded_at", { ascending: false });
    const result = (data as ProjectFile[]) ?? [];
    setFiles(result);
    onFilesChanged?.(
      [...new Set(result.filter(f => f.file_url).map(f => f.category))]
    );
  };

  useEffect(() => { fetchFiles(); }, [projectId]);

  const handleUpload = async (cat: typeof FILE_CATEGORIES[number], file: File) => {
    setUploading(cat.key);
    const ext = file.name.split(".").pop();
    const path = `documentos/${projectId}/${cat.folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("project_files").upload(path, file);
    if (error) { toast.error("Error: " + error.message); setUploading(null); return; }
    const { data } = supabase.storage.from("project_files").getPublicUrl(path);
    await supabase.from("project_documents").insert([{
      project_id: projectId,
      category: cat.key,
      name: file.name,
      file_url: data.publicUrl,
      file_name: file.name,
      status: "uploaded",
      is_required: false,
      visible_to_client: true,
      uploaded_at: new Date().toISOString(),
    }]);
    toast.success(`${file.name} subido`);
    setUploading(null);
    fetchFiles();
  };

  const handleMultiUpload = async (cat: typeof FILE_CATEGORIES[number], fileList: File[]) => {
    for (const file of fileList) {
      await handleUpload(cat, file);
    }
  };

  const handleDelete = async (fileId: string) => {
    await supabase.from("project_documents").delete().eq("id", fileId);
    toast.success("Archivo eliminado");
    fetchFiles();
  };

  const catFiles = (key: string) => files.filter(f => f.category === key && f.file_url);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
      <h3 className="text-[14px] font-bold text-[#0F1B2D]">Archivos del Proyecto</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FILE_CATEGORIES.map((cat) => {
          const uploaded = catFiles(cat.key);
          return (
            <div key={cat.key} className="rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-[#0D7377] hover:bg-[#E8F4F4]/30 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-[13px] font-bold text-[#0F1B2D]">{cat.label}</span>
                {uploaded.length > 0 && (
                  <span className="ml-auto text-[10px] text-[#0D7377] font-medium bg-[#E8F4F4] px-1.5 py-0.5 rounded-full">{uploaded.length}</span>
                )}
              </div>

              {!readOnly && (
                <div className="mb-3">
                  <FileUploadSource
                    accept={cat.accept}
                    compact
                    multiple={cat.multiple}
                    disabled={uploading === cat.key}
                    onFileSelected={(f) => handleUpload(cat, f)}
                    onMultipleFiles={(fs) => handleMultiUpload(cat, fs)}
                  />
                </div>
              )}

              {uploaded.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {uploaded.map(f => (
                    <div key={f.id} className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1.5 text-[11px] group">
                      <FileText className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="truncate flex-1 text-[#0F1B2D]">{f.file_name || f.name}</span>
                      {f.uploaded_at && <span className="text-gray-400 shrink-0">{format(new Date(f.uploaded_at), "dd/MM")}</span>}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {f.file_url && (
                          <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded hover:bg-gray-200">
                            <Eye className="h-3 w-3 text-[#0D7377]" />
                          </a>
                        )}
                        {!readOnly && (
                          <button onClick={() => handleDelete(f.id)} className="p-0.5 rounded hover:bg-red-50">
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">
                  {readOnly ? "Sin archivos" : "Arrastra o selecciona archivos"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { FILE_CATEGORIES };
