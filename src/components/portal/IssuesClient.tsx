import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, User, Calendar } from "lucide-react";

interface Props { projectId: string }

const SEVERITY: Record<string, { border: string; bg: string; label: string; badge: string; badgeText: string }> = {
  critical: { border: "border-l-red-900", bg: "bg-red-50", label: "Crítico", badge: "bg-red-100", badgeText: "text-red-900" },
  high:     { border: "border-l-red-500", bg: "bg-red-50", label: "Alto", badge: "bg-red-100", badgeText: "text-red-700" },
  medium:   { border: "border-l-orange-400", bg: "bg-orange-50", label: "Medio", badge: "bg-orange-100", badgeText: "text-orange-700" },
  low:      { border: "border-l-gray-300", bg: "bg-gray-50", label: "Bajo", badge: "bg-gray-100", badgeText: "text-gray-600" },
};

const STATUS: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  open:        { label: "Abierto", bg: "bg-red-100", text: "text-red-700", icon: "🔴" },
  in_progress: { label: "En progreso", bg: "bg-orange-100", text: "text-orange-700", icon: "🟠" },
  resolved:    { label: "Resuelto ✓", bg: "bg-green-100", text: "text-green-700", icon: "✅" },
  closed:      { label: "Cerrado", bg: "bg-gray-100", text: "text-gray-600", icon: "" },
};

const IssuesClient = ({ projectId }: Props) => {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("issues")
        .select("*")
        .eq("project_id", projectId)
        .order("opened_at", { ascending: false });
      setIssues(data ?? []);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  const counts = {
    open: issues.filter(i => i.status === "open").length,
    in_progress: issues.filter(i => i.status === "in_progress").length,
    resolved: issues.filter(i => i.status === "resolved" || i.status === "closed").length,
  };

  if (issues.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
        <p className="text-[14px] font-semibold text-gray-700">✓ No hay issues activos</p>
        <p className="text-[12px] text-gray-400 mt-1">Tu proyecto no tiene incidencias reportadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-[12px] font-medium text-red-700">
          🔴 Abiertos: {counts.open}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-[12px] font-medium text-orange-700">
          🟠 En progreso: {counts.in_progress}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-[12px] font-medium text-green-700">
          ✅ Resueltos: {counts.resolved}
        </div>
      </div>

      {/* Issue cards */}
      <div className="space-y-3">
        {issues.map((issue) => {
          const sev = SEVERITY[issue.severity ?? "medium"] ?? SEVERITY.medium;
          const st = STATUS[issue.status ?? "open"] ?? STATUS.open;
          return (
            <div key={issue.id} className={`rounded-lg border border-gray-200 border-l-4 ${sev.border} ${sev.bg} p-4 shadow-sm`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#0F1B2D]">{issue.title || issue.description}</p>
                  {issue.title && issue.description && issue.title !== issue.description && (
                    <p className="text-[12px] text-gray-600 mt-1">{issue.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`${sev.badge} ${sev.badgeText} border-0 text-[10px]`}>{sev.label}</Badge>
                  <Badge className={`${st.bg} ${st.text} border-0 text-[10px]`}>{st.label}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2.5 text-[11px] text-gray-500">
                {issue.assigned_to && (
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{issue.assigned_to}</span>
                )}
                {issue.due_date && (
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(issue.due_date).toLocaleDateString("es", { day: "numeric", month: "short" })}</span>
                )}
                {issue.category && (
                  <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />{issue.category}</span>
                )}
              </div>

              {issue.status === "resolved" && issue.resolution_note && (
                <div className="mt-2 p-2 bg-green-100/60 rounded text-[11px] text-green-700">
                  ✓ {issue.resolution_note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IssuesClient;
