import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { PAGE_TITLE } from "@/lib/design-system";

interface Risk {
  id: string;
  category: string;
  title: string;
  description: string | null;
  probability: string;
  impact: string;
  level: string | null;
  mitigation: string | null;
  status: string | null;
}

const LEVEL_CONFIG: Record<string, { border: string; badge: string; label: string; order: number }> = {
  critical: { border: "border-l-[#DC2626]", badge: "bg-[#DC2626] text-white", label: "CRÍTICO", order: 0 },
  high: { border: "border-l-[#F97316]", badge: "bg-[#F97316] text-white", label: "ALTO", order: 1 },
  medium: { border: "border-l-[#FACC15]", badge: "bg-[#FACC15] text-[#1F2937]", label: "MEDIO", order: 2 },
  low: { border: "border-l-[#DCFCE7]", badge: "bg-[#DCFCE7] text-[#166534]", label: "BAJO", order: 3 },
};

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  open: { className: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]", label: "Abierto" },
  monitoring: { className: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]", label: "Monitoreando" },
  mitigated: { className: "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]", label: "Mitigado" },
  closed: { className: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]", label: "Cerrado" },
};

const RisksClient = ({ projectId }: { projectId: string }) => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("risks")
        .select("id, category, title, description, probability, impact, level, mitigation, status")
        .eq("project_id", projectId)
        .order("created_at");
      setRisks((data as Risk[]) ?? []);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  const criticalHigh = risks.filter((r) => (r.level === "critical" || r.level === "high") && (r.status === "open" || r.status === "monitoring")).length;
  const mediumCount = risks.filter((r) => r.level === "medium" && (r.status === "open" || r.status === "monitoring")).length;
  const controlledCount = risks.filter((r) => r.level === "low" || r.status === "mitigated" || r.status === "closed").length;

  const sorted = [...risks].sort((a, b) => {
    const oa = LEVEL_CONFIG[a.level ?? "low"]?.order ?? 9;
    const ob = LEVEL_CONFIG[b.level ?? "low"]?.order ?? 9;
    return oa - ob;
  });

  if (risks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-gray-400 text-[13px]">360lateral está monitoreando los riesgos de este proyecto.</p>
        <p className="text-gray-300 text-[12px] mt-1">Los riesgos identificados aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Semáforo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-[32px] font-bold text-[#DC2626]">{criticalHigh}</p>
          <p className="text-[11px] text-gray-400 mt-1">🔴 Riesgos Críticos/Altos</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-[32px] font-bold text-[#CA8A04]">{mediumCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">🟡 Riesgos Medios</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-[32px] font-bold text-[#16A34A]">{controlledCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">🟢 Controlados/Cerrados</p>
        </div>
      </div>

      {/* Risk cards */}
      <div className="space-y-3">
        {sorted.map((r) => {
          const lvl = LEVEL_CONFIG[r.level ?? "low"] || LEVEL_CONFIG.low;
          const st = STATUS_BADGE[r.status ?? "open"] || STATUS_BADGE.open;
          const isExpanded = expandedId === r.id;

          return (
            <Collapsible key={r.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : r.id)}>
              <div className={`bg-white rounded-lg border border-gray-200 shadow-sm border-l-4 ${lvl.border} overflow-hidden`}>
                <CollapsibleTrigger className="w-full text-left p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${lvl.badge} border-0 text-[10px] font-bold`}>{lvl.label}</Badge>
                        <Badge className="bg-[#F3F4F6] text-[#374151] border-0 text-[10px]">{r.category}</Badge>
                      </div>
                      <p className="text-[14px] font-bold text-[#0F1B2D]">{r.title}</p>
                      {r.description && <p className="text-[12px] text-gray-400 line-clamp-2">{r.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Badge className={`${st.className} text-[10px]`}>{st.label}</Badge>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    {r.description && <p className="text-[12px] text-gray-500 mt-3">{r.description}</p>}
                    {r.mitigation && (
                      <div className="mt-3 bg-[#F0FDF4] rounded-md p-3">
                        <p className="text-[11px] font-semibold text-[#166534] mb-1">✅ Plan de mitigación</p>
                        <p className="text-[12px] text-[#166534]">{r.mitigation}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default RisksClient;
