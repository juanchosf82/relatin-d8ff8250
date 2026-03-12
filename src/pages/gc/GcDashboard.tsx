import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGcAuth } from "@/hooks/useGcAuth";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, AlertTriangle, FileText, ScrollText } from "lucide-react";
import { PROJECT_STATUS_BADGE, badgeClass, progressFisicoColor } from "@/lib/design-system";

interface ProjectInfo {
  id: string;
  code: string;
  address: string;
  status: string | null;
  progress_pct: number | null;
  last_visit_date: string | null;
}

const GcDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { gcProfile, gcAccess, loading: gcLoading } = useGcAuth();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [openIssues, setOpenIssues] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [pendingWaivers, setPendingWaivers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || gcLoading) return;
    if (gcAccess.length === 0) {
      setLoading(false);
      return;
    }

    const projectIds = gcAccess.map((a) => a.project_id);
    const load = async () => {
      const [projRes, issuesRes, invoicesRes, waiversRes] = await Promise.all([
        supabase.from("projects").select("id, code, address, status, progress_pct, last_visit_date").in("id", projectIds),
        supabase.from("issues").select("id").in("project_id", projectIds).eq("status", "open"),
        supabase.from("gc_invoices").select("id").in("project_id", projectIds).eq("status", "submitted"),
        supabase.from("gc_waivers" as any).select("id").in("project_id", projectIds).eq("status", "pending"),
      ]);

      setProjects(projRes.data ?? []);
      setOpenIssues(issuesRes.data?.length ?? 0);
      setPendingInvoices(invoicesRes.data?.length ?? 0);
      setPendingWaivers((waiversRes.data as any[])?.length ?? 0);
      setLoading(false);
    };
    load();
  }, [user, gcAccess, gcLoading]);

  if (loading || gcLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E07B39]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-[#0F1B2D]">
          Bienvenido, {gcProfile?.contact_name || "Contratista"}
        </h1>
        <p className="text-[12px] text-gray-500 mt-1">{gcProfile?.company_name}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} label="Mis proyectos" value={projects.length} color="#E07B39" />
        <StatCard icon={AlertTriangle} label="Issues abiertos" value={openIssues} color={openIssues > 0 ? "#DC2626" : "#16A34A"} />
        <StatCard icon={FileText} label="Invoices pendientes" value={pendingInvoices} color="#E07B39" />
        <StatCard icon={ScrollText} label="Waivers pendientes" value={pendingWaivers} color="#E07B39" />
      </div>

      {/* Projects */}
      <div>
        <h2 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Mis Proyectos</h2>
        {projects.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-[13px] text-gray-500 mb-1">No tienes proyectos asignados aún.</p>
            <p className="text-[12px] text-gray-400">Contacta a 360lateral para más información.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => {
              const status = PROJECT_STATUS_BADGE[p.status ?? "on_track"] || PROJECT_STATUS_BADGE.on_track;
              const pct = p.progress_pct ?? 0;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-[#E07B39]/30 transition-all"
                  onClick={() => navigate(`/gc/proyecto/${p.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[14px] font-bold text-[#0F1B2D]">{p.code}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{p.address}</p>
                    </div>
                    <Badge className={badgeClass(status.bg, status.text)}>{status.label}</Badge>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-400">Av. Físico</span>
                      <span className="font-medium text-[#0F1B2D]">{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progressFisicoColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                  {p.last_visit_date && <p className="text-[11px] text-gray-400">Última visita: {p.last_visit_date}</p>}
                  <p className="text-[11px] text-[#E07B39] font-medium mt-2">Ver proyecto →</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
      <Icon className="h-4 w-4" style={{ color }} />
    </div>
    <div>
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-[20px] font-bold text-[#0F1B2D]">{value}</p>
    </div>
  </div>
);

export default GcDashboard;
