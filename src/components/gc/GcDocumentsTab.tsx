import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import FileUploadSource from "@/components/FileUploadSource";

interface ProjectDocument {
  id: string;
  category: string;
  name: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string | null;
  expiration_date: string | null;
  is_required: boolean | null;
  approval_status: string | null;
  version: number | null;
  rejection_reason: string | null;
  assigned_to: string | null;
}

interface DocCategory {
  code: string;
  name: string;
  icon: string | null;
  sequence: number | null;
}

const APPROVAL_LABELS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-500", label: "Borrador" },
  in_review: { bg: "bg-blue-50", text: "text-blue-700", label: "En revisión" },
  approved: { bg: "bg-green-50", text: "text-green-700", label: "Aprobado ✓" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rechazado ✗" },
};

const GcDocumentsTab = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    const [docsRes, catsRes] = await Promise.all([
      supabase
        .from("project_documents")
        .select("id, category, name, description, file_url, file_name, status, expiration_date, is_required, approval_status, version, rejection_reason, assigned_to")
        .eq("project_id", projectId)
        .eq("is_current_version", true)
        .order("category")
        .order("name"),
      supabase.from("doc_categories" as any).select("code, name, icon, sequence").order("sequence"),
    ]);
    setDocuments((docsRes.data as ProjectDocument[]) ?? []);
    setCategories((catsRes.data as unknown as DocCategory[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [projectId]);

  const handleUpload = async (docId: string, file: File) => {
    const doc = documents.find(d => d.id === docId);
    const ext = file.name.split(".").pop();
    const path = `documentos/${projectId}/${doc?.category || "otros"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("project_files").upload(path, file);
    if (error) { toast.error("Error: " + error.message); return; }
    const { data } = supabase.storage.from("project_files").getPublicUrl(path);

    if (doc?.file_url) {
      await supabase.from("project_documents").update({ is_current_version: false }).eq("id", docId);
      await supabase.from("project_documents").insert([{
        project_id: projectId,
        category: doc.category,
        name: doc.name,
        file_url: data.publicUrl,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
        status: "uploaded",
        approval_status: "draft",
        uploaded_at: new Date().toISOString(),
        uploaded_by_role: "gc",
        is_required: doc.is_required,
        visible_to_gc: true,
        version: (doc.version ?? 1) + 1,
        is_current_version: true,
        parent_document_id: docId,
        expiration_date: doc.expiration_date,
      }]);
      toast.success(`Versión ${(doc.version ?? 1) + 1} subida`);
    } else {
      await supabase.from("project_documents").update({
        file_url: data.publicUrl,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
        status: "uploaded",
        uploaded_at: new Date().toISOString(),
        uploaded_by_role: "gc",
      }).eq("id", docId);
      toast.success("Archivo subido");
    }
    fetchDocs();
  };

  const submitForReview = async (docId: string) => {
    await supabase.from("project_documents").update({
      approval_status: "in_review",
      review_requested_at: new Date().toISOString(),
    }).eq("id", docId);
    toast.success("Enviado a revisión");
    fetchDocs();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E07B39]" /></div>;

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500">No hay documentos asignados a tu portal aún.</p>
      </div>
    );
  }

  const grouped = categories.reduce<Record<string, ProjectDocument[]>>((acc, cat) => {
    const items = documents.filter(d => d.category === cat.code);
    if (items.length > 0) acc[cat.code] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-gray-400 italic">Documentos asignados a tu empresa. Los documentos subidos son revisados por 360lateral antes de ser aprobados.</p>

      {categories.map(cat => {
        const items = grouped[cat.code];
        if (!items) return null;
        return (
          <div key={cat.code} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-[13px] font-bold text-[#0F1B2D] flex items-center gap-2">
                <span>{cat.icon || "📁"}</span> {cat.name}
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(doc => {
                const ab = APPROVAL_LABELS[doc.approval_status ?? "draft"];
                return (
                  <div key={doc.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {doc.approval_status === "approved" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-300 shrink-0" />
                        )}
                        <span className="text-[12px] font-medium">{doc.name}</span>
                        <Badge className="bg-gray-100 text-gray-500 border-0 text-[9px]">v{doc.version ?? 1}</Badge>
                        <Badge className={`${ab.bg} ${ab.text} border-0 text-[9px]`}>{ab.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-[#0D7377] hover:underline font-medium">
                            <Download className="h-3.5 w-3.5" /> Ver
                          </a>
                        )}
                      </div>
                    </div>

                    {doc.rejection_reason && (
                      <div className="bg-red-50 rounded p-2 text-[11px] text-red-600">
                        📝 Motivo: {doc.rejection_reason}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {(!doc.file_url || doc.approval_status === "rejected") && (
                        <FileUploadSource accept="pdf+images" compact onFileSelected={f => handleUpload(doc.id, f)} />
                      )}
                      {doc.file_url && doc.approval_status === "draft" && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => submitForReview(doc.id)}>
                          Enviar a revisión
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GcDocumentsTab;
