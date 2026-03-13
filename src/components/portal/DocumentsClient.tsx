import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";
import { Download, AlertTriangle, CheckCircle2, Clock, FileText, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { DISCIPLINES } from "@/lib/pinellas-documents";
import { cn } from "@/lib/utils";

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
  uploaded_at: string | null;
  pinellas_reference: string | null;
  priority: string | null;
  sequence: number | null;
}

const APPROVAL_BADGE: Record<string, { icon: typeof CheckCircle2; label: string; cls: string }> = {
  approved: { icon: CheckCircle2, label: "✓ Verificado", cls: "bg-green-50 text-green-700 border-0" },
  in_review: { icon: Eye, label: "En revisión", cls: "bg-blue-50 text-blue-700 border-0" },
  draft: { icon: Clock, label: "Pendiente", cls: "bg-gray-100 text-gray-500 border-0" },
};

const DocumentsClient = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("project_documents")
        .select("id, tab, discipline, category, name, description, file_url, file_name, status, expiration_date, is_required, approval_status, version, approved_at, uploaded_at, pinellas_reference, priority, sequence")
        .eq("project_id", projectId)
        .eq("is_current_version", true)
        .eq("visible_to_client", true)
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center max-w-md mx-auto">
        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-4" />
        <h3 className="text-[15px] font-bold text-[#0F1B2D] mb-2">Documentos en preparación</h3>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          360lateral está organizando el expediente documental de tu proyecto.
          Los documentos aparecerán aquí una vez sean verificados y aprobados.
        </p>
        <p className="text-[11px] text-gray-400 mt-4">
          ¿Tienes preguntas? Contacta a tu gerente de proyecto.
        </p>
      </div>
    );
  }

  // Group by discipline
  const disciplines = [...new Set(documents.map(d => d.discipline).filter(Boolean))] as string[];

  // Sort disciplines by DISCIPLINES order
  const disciplineOrder = Object.keys(DISCIPLINES);
  disciplines.sort((a, b) => {
    const ia = disciplineOrder.indexOf(a);
    const ib = disciplineOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  // Insurance expiration warning
  const expiringInsurance = documents.filter(d =>
    d.discipline === "Insurance" && d.expiration_date &&
    differenceInDays(new Date(d.expiration_date), new Date()) >= 0 &&
    differenceInDays(new Date(d.expiration_date), new Date()) <= 60
  );

  // Latest update date
  const latestDate = documents.reduce((latest, d) => {
    const date = d.approved_at || d.uploaded_at;
    if (!date) return latest;
    return !latest || new Date(date) > new Date(latest) ? date : latest;
  }, null as string | null);

  const toggleSection = (disc: string) => {
    setOpenSections(prev => ({ ...prev, [disc]: prev[disc] === false ? true : false }));
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-gray-400 italic">
        Documentos gestionados y verificados por 360lateral
        {latestDate && ` · Actualizado ${format(new Date(latestDate), "dd/MM/yyyy")}`}
      </p>

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
        const isOpen = openSections[disc] !== false; // default open

        return (
          <div key={disc} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggleSection(disc)}
              className="w-full px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-[13px] font-bold text-[#0F1B2D] flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                <span>{meta?.icon || "📁"}</span> {meta?.label || disc}
              </h3>
              <span className="text-[10px] text-gray-400 font-medium">{items.length} docs</span>
            </button>

            {/* Items */}
            {isOpen && (
              <div className="divide-y divide-gray-50">
                {items.map(doc => {
                  const badge = APPROVAL_BADGE[doc.approval_status ?? "draft"] || APPROVAL_BADGE.draft;
                  const StatusIcon = badge.icon;
                  return (
                    <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StatusIcon className={cn("h-4 w-4 shrink-0",
                          doc.approval_status === "approved" ? "text-green-600" :
                          doc.approval_status === "in_review" ? "text-blue-500" : "text-gray-300"
                        )} />
                        <div className="min-w-0">
                          <span className="text-[12px] font-medium text-[#0F1B2D]">{doc.name}</span>
                          <Badge className={cn("ml-2 text-[9px]", badge.cls)}>{badge.label}</Badge>
                          {doc.pinellas_reference && (
                            <p className="text-[10px] text-[#0D7377] italic">📍 {doc.pinellas_reference}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {(doc.approved_at || doc.uploaded_at) && (
                          <span className="text-[11px] text-gray-400">
                            {format(new Date((doc.approved_at || doc.uploaded_at)!), "dd/MM/yyyy")}
                          </span>
                        )}
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-[#0D7377] hover:underline font-medium">
                            <Download className="h-3.5 w-3.5" /> Descargar
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DocumentsClient;
