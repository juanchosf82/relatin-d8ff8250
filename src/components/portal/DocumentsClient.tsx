import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";
import { Download, AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { DISCIPLINES } from "@/lib/pinellas-documents";

interface ProjectDocument {
  id: string;
  tab: string;
  discipline: string | null;
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
  approved_at: string | null;
  pinellas_reference: string | null;
  priority: string | null;
  sequence: number | null;
}

const DocumentsClient = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("project_documents")
        .select("id, tab, discipline, category, name, description, file_url, file_name, status, expiration_date, is_required, approval_status, version, approved_at, pinellas_reference, priority, sequence")
        .eq("project_id", projectId)
        .eq("is_current_version", true)
        .eq("visible_to_client", true)
        .eq("approval_status", "approved")
        .order("sequence")
        .order("name");
      setDocuments((data as unknown as ProjectDocument[]) ?? []);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500">Los documentos del proyecto aparecerán aquí<br />a medida que sean verificados por 360lateral.</p>
      </div>
    );
  }

  // Group by discipline
  const disciplines = [...new Set(documents.map(d => d.discipline).filter(Boolean))] as string[];

  // Insurance expiration warning
  const expiringInsurance = documents.filter(d =>
    d.discipline === "Insurance" && d.expiration_date &&
    differenceInDays(new Date(d.expiration_date), new Date()) >= 0 &&
    differenceInDays(new Date(d.expiration_date), new Date()) <= 60
  );

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-gray-400 italic">Documentos verificados por 360lateral</p>

      {expiringInsurance.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-orange-400 shadow-sm p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-[#0F1B2D]">⚠️ Seguros por renovar</p>
              <ul className="space-y-1 mt-1">
                {expiringInsurance.map(d => (
                  <li key={d.id} className="text-[12px] text-orange-600">
                    • {d.name} — vence {format(new Date(d.expiration_date!), "dd/MM/yyyy")}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {disciplines.map(disc => {
        const items = documents.filter(d => d.discipline === disc).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        const meta = DISCIPLINES[disc];
        return (
          <div key={disc} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-[13px] font-bold text-[#0F1B2D] flex items-center gap-2">
                <span>{meta?.icon || "📁"}</span> {meta?.label || disc}
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[12px] font-medium">{doc.name}</span>
                      <Badge className="ml-2 bg-gray-100 text-gray-500 border-0 text-[9px]">v{doc.version ?? 1}</Badge>
                      {doc.pinellas_reference && (
                        <p className="text-[10px] text-[#0D7377] italic">📍 {doc.pinellas_reference}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {doc.approved_at && <span className="text-[11px] text-gray-400">{format(new Date(doc.approved_at), "dd/MM/yyyy")}</span>}
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-[#0D7377] hover:underline font-medium">
                        <Download className="h-3.5 w-3.5" /> Descargar
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentsClient;
