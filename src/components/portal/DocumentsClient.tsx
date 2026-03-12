import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";
import { Download, AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";

const CATEGORY_ORDER = ["Contratos", "Permisos", "Seguros", "Planos & Diseño", "Contratistas", "Financiero", "Fotos & Videos", "Sheets & Planos", "Otros"];
const CATEGORY_ICONS: Record<string, string> = {
  "Contratos": "📋", "Permisos": "🏛️", "Seguros": "🛡️",
  "Planos & Diseño": "📐", "Contratistas": "👷", "Financiero": "🏦",
  "Fotos & Videos": "📷", "Sheets & Planos": "📊", "Otros": "📁",
};

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
}

const DocumentsClient = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("project_documents")
        .select("id, category, name, description, file_url, file_name, status, expiration_date, is_required")
        .eq("project_id", projectId)
        .order("category")
        .order("name");
      setDocuments((data as ProjectDocument[]) ?? []);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500">Los documentos del proyecto aparecerán aquí<br />a medida que sean cargados por 360lateral.</p>
      </div>
    );
  }

  const requiredDocs = documents.filter((d) => d.is_required);
  const uploadedRequired = requiredDocs.filter((d) => d.status === "uploaded");
  const compliancePct = requiredDocs.length > 0 ? Math.round((uploadedRequired.length / requiredDocs.length) * 100) : 0;

  // Insurance expiration warning
  const insuranceDocs = documents.filter((d) => d.category === "Seguros" && d.expiration_date);
  const expiringInsurance = insuranceDocs.filter((d) => {
    const days = differenceInDays(new Date(d.expiration_date!), new Date());
    return days >= 0 && days <= 60;
  });

  const grouped = CATEGORY_ORDER.reduce<Record<string, ProjectDocument[]>>((acc, cat) => {
    const items = documents.filter((d) => d.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Score card */}
      {requiredDocs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-[13px] font-medium text-[#0F1B2D] mb-2">
            Expediente del proyecto: {compliancePct}% completo
          </p>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#0D7377] transition-all" style={{ width: `${compliancePct}%` }} />
          </div>
        </div>
      )}

      {/* Insurance expiration callout */}
      {expiringInsurance.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-[#EA580C] shadow-sm p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-[#EA580C] mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-[#0F1B2D]">⚠️ Seguros por renovar</p>
              <p className="text-[12px] text-gray-500 mb-2">Los siguientes seguros vencen próximamente:</p>
              <ul className="space-y-1">
                {expiringInsurance.map((d) => (
                  <li key={d.id} className="text-[12px] text-[#EA580C]">
                    • {d.name} — vence {format(new Date(d.expiration_date!), "dd/MM/yyyy")}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-gray-400 mt-2">360lateral está coordinando la renovación.</p>
            </div>
          </div>
        </div>
      )}

      {/* Documents by category */}
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items) return null;
        return (
          <div key={cat} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-[13px] font-bold text-[#0F1B2D] flex items-center gap-2">
                <span>{CATEGORY_ICONS[cat] || "📁"}</span> {cat}
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((doc) => {
                const isExpired = doc.expiration_date && differenceInDays(new Date(doc.expiration_date), new Date()) < 0;
                const isUploaded = doc.status === "uploaded";

                return (
                  <div key={doc.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isExpired ? (
                        <AlertTriangle className="h-4 w-4 text-[#DC2626] shrink-0" />
                      ) : isUploaded ? (
                        <CheckCircle2 className="h-4 w-4 text-[#166534] shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-300 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className={`text-[12px] ${isExpired ? "text-[#DC2626] font-medium" : isUploaded ? "" : "text-gray-400"}`}>{doc.name}</span>
                        {isExpired && <Badge className="ml-2 bg-[#FEF2F2] text-[#DC2626] border-0 text-[9px]">⚠️ Vencido</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-gray-400">
                        {doc.expiration_date ? `Vence: ${format(new Date(doc.expiration_date), "dd/MM/yyyy")}` : "—"}
                      </span>
                      {doc.file_url ? (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-[#0D7377] hover:underline font-medium">
                          <Download className="h-3.5 w-3.5" /> Descargar
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-300 w-20" />
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

export default DocumentsClient;
