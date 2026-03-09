import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, BarChart3, AlertTriangle, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import {
  PROJECT_STATUS_BADGE, badgeClass, fmt,
  progressFisicoColor, progressPresupuestoColor,
  PAGE_TITLE, SECTION_TITLE, LABEL_META,
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
} from "@/lib/design-system";

type Project = Tables<"projects">;
type WeeklyReport = Tables<"weekly_reports"> & { projects?: { code: string } | null };

interface ProjectWithBudgetProgress extends Project {
  budgetProgressPct?: number;
  milestonesTotal?: number;
  milestonesComplete?: number;
  riskCriticalHigh?: number;
  riskMedium?: number;
  riskAllControlled?: boolean;
  onboardingPct?: number;
}

const PortalDashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithBudgetProgress[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [openIssues, setOpenIssues] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [projRes, issuesRes, reportsRes] = await Promise.all([
        supabase.from("projects").select("*"),
        supabase.from("issues").select("id").eq("status", "open"),
        supabase.from("weekly_reports").select("*, projects(code)").order("report_date", { ascending: false }).limit(5),
      ]);
      const projectsList = projRes.data ?? [];
      const projectsWithBudget: ProjectWithBudgetProgress[] = [];
      for (const p of projectsList) {
        const [sovRes2, msRes, riskRes] = await Promise.all([
          supabase.from("sov_lines").select("budget, progress_pct").eq("project_id", p.id),
          supabase.from("milestones").select("id, status").eq("project_id", p.id),
          supabase.from("risks").select("level, status").eq("project_id", p.id),
        ]);
        const sovLines = sovRes2.data;
        let budgetProgressPct = 0;
        if (sovLines && sovLines.length > 0) {
          const totalBudget = sovLines.reduce((a, c) => a + (c.budget || 0), 0);
          if (totalBudget > 0) {
            budgetProgressPct = Math.round(sovLines.reduce((a, c) => a + ((c.budget || 0) / totalBudget) * (c.progress_pct || 0), 0) * 100) / 100;
          }
        }
        const ms = (msRes.data as any[]) || [];
        const msTotal = ms.length;
        const msComplete = ms.filter((m: any) => m.status === "complete").length;
        const riskData = (riskRes.data as any[]) || [];
        const openRisks = riskData.filter((r: any) => r.status === "open" || r.status === "monitoring");
        const riskCriticalHigh = openRisks.filter((r: any) => r.level === "critical" || r.level === "high").length;
        const riskMedium = openRisks.filter((r: any) => r.level === "medium").length;
        const riskAllControlled = riskData.length > 0 && riskCriticalHigh === 0 && riskMedium === 0;
        projectsWithBudget.push({ ...p, budgetProgressPct, milestonesTotal: msTotal, milestonesComplete: msComplete, riskCriticalHigh, riskMedium, riskAllControlled });
      }
      setProjects(projectsWithBudget);
      setOpenIssues(issuesRes.data?.length ?? 0);
      setReports((reportsRes.data as WeeklyReport[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const totalLoan = projects.reduce((s, p) => s + (p.loan_amount ?? 0), 0);
  const totalEac = projects.reduce((s, p) => s + (p.eac ?? 0), 0);
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress_pct ?? 0), 0) / projects.length) : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Loan Total" value={fmt(totalLoan)} />
        <KPICard icon={TrendingUp} label="Ejecutado" value={fmt(totalEac)} />
        <KPICard icon={BarChart3} label="Avance Promedio" value={`${avgProgress}%`} />
        <KPICard icon={AlertTriangle} label="Issues Activos" value={String(openIssues)} accent={openIssues > 0} />
      </div>

      {/* Project Cards */}
      <div>
        <h2 className={PAGE_TITLE}>Proyectos</h2>
        {projects.length === 0 ? (
          <p className="text-[12px] text-gray-400 mt-2">No tienes proyectos asignados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
            {projects.map((p) => {
              const status = PROJECT_STATUS_BADGE[p.status ?? "on_track"] || PROJECT_STATUS_BADGE.on_track;
              const physPct = p.progress_pct ?? 0;
              const budgPct = p.budgetProgressPct ?? 0;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/portal/proyecto/${p.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[14px] font-bold text-[#0F1B2D]">{p.code}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{p.address}</p>
                    </div>
                    <Badge className={badgeClass(status.bg, status.text)}>{status.label}</Badge>
                  </div>
                  {/* Avance Físico */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-400">Av. Físico</span>
                      <span className="font-medium text-[#0F1B2D]">{physPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progressFisicoColor}`} style={{ width: `${Math.min(physPct, 100)}%` }} />
                    </div>
                  </div>
                  {/* Avance Presupuesto */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-400">Av. Presupuesto</span>
                      <span className="font-medium text-[#0F1B2D]">{budgPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progressPresupuestoColor(budgPct)}`} style={{ width: `${Math.min(budgPct, 100)}%` }} />
                    </div>
                  </div>
                  {p.last_visit_date && <p className="text-[11px] text-gray-400 mt-1">Última visita: {p.last_visit_date}</p>}
                  {(p.milestonesTotal ?? 0) > 0 && (
                    <p className="text-[11px] text-[#0D7377] font-medium mt-1">Hitos: {p.milestonesComplete}/{p.milestonesTotal} completados</p>
                  )}
                  {(p.riskCriticalHigh ?? 0) > 0 ? (
                    <p className="text-[11px] text-[#DC2626] font-medium mt-1">🔴 {p.riskCriticalHigh} riesgo(s) crítico(s)</p>
                  ) : (p.riskMedium ?? 0) > 0 ? (
                    <p className="text-[11px] text-[#CA8A04] font-medium mt-1">🟡 {p.riskMedium} riesgo(s) en monitoreo</p>
                  ) : p.riskAllControlled ? (
                    <p className="text-[11px] text-[#16A34A] font-medium mt-1">🟢 Sin riesgos activos</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Reports */}
      {reports.length > 0 && (
        <div>
          <h2 className={PAGE_TITLE}>Reportes Recientes</h2>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-3">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className={TH_CLASS}>Semana</th>
                  <th className={TH_CLASS}>Fecha</th>
                  <th className={TH_CLASS}>Highlight</th>
                  <th className={TH_CLASS}>Descargar</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => (
                  <tr key={r.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                    <td className={`${TD_CLASS} font-semibold`}>Sem {r.week_number} — {r.projects?.code}</td>
                    <td className={TD_CLASS}>{r.report_date}</td>
                    <td className={`${TD_CLASS} text-gray-500 max-w-[300px] truncate`}>{r.highlight_text}</td>
                    <td className={TD_CLASS}>
                      {r.pdf_url && (
                        <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[#0D7377] hover:underline text-[11px]">
                          <Download className="h-3.5 w-3.5 mr-1" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#E8F4F4] text-[#0D7377]"}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-[20px] font-bold text-[#0F1B2D]">{value}</p>
    </div>
  </div>
);

export default PortalDashboard;
