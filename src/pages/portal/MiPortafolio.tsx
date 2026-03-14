import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmt } from "@/lib/design-system";
import { AlertTriangle, Building2, DollarSign, TrendingUp, ChevronRight, Bell } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface ProjectEnriched extends Project {
  budgetProgressPct: number;
  issuesOpen: number;
  docsApproved: number;
  drawsCount: number;
  reportsCount: number;
  gcName: string | null;
  lenderName: string | null;
}

interface Alert {
  id: string;
  type: "red" | "orange" | "blue";
  text: string;
  date: string;
  projectCode?: string;
}

const MiPortafolio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectEnriched[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // Get profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      setProfileName(profile?.full_name || null);

      // Get projects
      const { data: projs } = await supabase.from("projects").select("*");
      const projectsList = projs || [];

      const enriched: ProjectEnriched[] = [];
      const alertsList: Alert[] = [];

      for (const p of projectsList) {
        const [sovRes, issuesRes, docsRes, drawsRes, reportsRes] = await Promise.all([
          supabase.from("sov_lines").select("budget, progress_pct, real_cost").eq("project_id", p.id),
          supabase.from("issues").select("id, status, title, opened_at").eq("project_id", p.id).eq("status", "open"),
          supabase.from("project_documents").select("id, status, expiration_date, name").eq("project_id", p.id),
          supabase.from("draws").select("id").eq("project_id", p.id),
          supabase.from("weekly_reports").select("id").eq("project_id", p.id),
        ]);

        // Budget progress
        const sovLines = sovRes.data || [];
        let budgetProgressPct = 0;
        if (sovLines.length > 0) {
          const withBudget = sovLines.filter(l => (l.budget || 0) > 0);
          const totalBudget = withBudget.reduce((a, c) => a + (c.budget || 0), 0);
          if (totalBudget > 0) {
            budgetProgressPct = Math.round(
              withBudget.reduce((a, c) => a + ((c.real_cost || 0) * ((c.progress_pct || 0) / 100)), 0) / totalBudget * 100 * 100
            ) / 100;
          }
        }

        const openIssues = issuesRes.data || [];
        const docs = docsRes.data || [];
        const docsApproved = docs.filter(d => d.status === "approved").length;

        // Generate alerts from issues
        openIssues.forEach(issue => {
          alertsList.push({
            id: `issue-${issue.id}`,
            type: "red",
            text: `Issue abierto: ${issue.title || "Sin título"}`,
            date: issue.opened_at || "",
            projectCode: p.code,
          });
        });

        // Check for expiring documents
        const today = new Date();
        docs.forEach(doc => {
          if (doc.expiration_date) {
            const expDate = new Date(doc.expiration_date);
            const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
            if (daysUntil < 0) {
              alertsList.push({
                id: `doc-exp-${doc.id}`,
                type: "red",
                text: `Documento vencido: ${doc.name}`,
                date: doc.expiration_date,
                projectCode: p.code,
              });
            } else if (daysUntil <= 30) {
              alertsList.push({
                id: `doc-warn-${doc.id}`,
                type: "orange",
                text: `Documento por vencer (${daysUntil} días): ${doc.name}`,
                date: doc.expiration_date,
                projectCode: p.code,
              });
            }
          }
        });

        enriched.push({
          ...p,
          budgetProgressPct,
          issuesOpen: openIssues.length,
          docsApproved,
          drawsCount: drawsRes.data?.length || 0,
          reportsCount: reportsRes.data?.length || 0,
          gcName: p.gc_name,
          lenderName: p.lender_name,
        });
      }

      // Sort alerts by date descending
      alertsList.sort((a, b) => b.date.localeCompare(a.date));
      setAlerts(alertsList.slice(0, 10));
      setProjects(enriched);
      setLoading(false);
    };
    load();
  }, [user]);

  const totalLoan = projects.reduce((s, p) => s + (p.loan_amount ?? 0), 0);
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + (p.progress_pct ?? 0), 0) / projects.length * 100) / 100
    : 0;
  const totalIssues = projects.reduce((s, p) => s + p.issuesOpen, 0);
  const avgBudgetProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.budgetProgressPct, 0) / projects.length * 100) / 100
    : 0;

  // CO target & days remaining (use nearest)
  const today = new Date();
  const projectsWithCo = projects.filter(p => p.co_target_date);
  const nearestCo = projectsWithCo.length > 0
    ? projectsWithCo.sort((a, b) => a.co_target_date!.localeCompare(b.co_target_date!))[0]
    : null;
  const coDate = nearestCo?.co_target_date ? new Date(nearestCo.co_target_date) : null;
  const daysRemaining = coDate ? Math.ceil((coDate.getTime() - today.getTime()) / 86400000) : null;

  const formatDateFull = (d: Date) =>
    d.toLocaleDateString("es", { month: "short", year: "numeric", day: "numeric" });

  const todayFormatted = today.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-[22px] font-bold text-[#0F1B2D]">Mi Portafolio</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Bienvenido, {profileName || user?.email?.split("@")[0]} · {todayFormatted}
        </p>
      </div>

      {/* ═══ TOP HALF — KPIs Globales ═══ */}

      {/* ROW 1 — 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Proyectos"
          value={String(projects.length)}
          sub={`activo${projects.length !== 1 ? "s" : ""}`}
          icon={Building2}
        />
        <MetricCard
          label="Inversión Total"
          value={fmt(totalLoan)}
          sub="loan amount"
          icon={DollarSign}
        />
        <MetricCard
          label="Av. Físico Promedio"
          value={`${avgProgress}%`}
          sub=""
          icon={TrendingUp}
          progressPct={avgProgress}
        />
        <MetricCard
          label="Issues Abiertos"
          value={String(totalIssues)}
          sub={totalIssues > 0 ? "⚠️ pendiente" : "sin pendientes"}
          icon={AlertTriangle}
          isAlert={totalIssues > 0}
        />
      </div>

      {/* ROW 2 — Progress Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-bold text-[#0F1B2D]">Avance general del portafolio</p>
          {coDate && (
            <div className="text-right">
              <span className="text-[12px] text-gray-500">
                CO Target: {formatDateFull(coDate)}
              </span>
              {daysRemaining !== null && (
                <span className="text-[12px] text-gray-400 ml-3">
                  · Días restantes: <span className="font-semibold text-[#0F1B2D]">{daysRemaining}</span>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <ProgressRow label="Físico" pct={avgProgress} gradient="from-[#0D7377] to-[#0fa3a8]" />
          <ProgressRow label="Financiero" pct={avgBudgetProgress} gradient="from-[#3B82F6] to-[#60A5FA]" />
        </div>
      </div>

      {/* ═══ BOTTOM HALF — Project Cards ═══ */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-bold text-[#0F1B2D]">Mis Proyectos</h2>
          <span className="text-[11px] text-gray-400">
            {projects.length} proyecto{projects.length !== 1 ? "s" : ""} activo{projects.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="space-y-4 mt-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} navigate={navigate} />
          ))}
        </div>
      </div>

      {/* ═══ ALERTS SECTION ═══ */}
      {alerts.length > 0 && (
        <div>
          <h2 className="text-[14px] font-bold text-[#0F1B2D] mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" /> Alertas recientes
          </h2>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══ Sub-components ═══ */

const MetricCard = ({
  label, value, sub, icon: Icon, isAlert, progressPct,
}: {
  label: string; value: string; sub: string; icon: any; isAlert?: boolean; progressPct?: number;
}) => (
  <div className={`rounded-xl border shadow-sm hover:shadow-md transition-shadow p-5 ${
    isAlert ? "bg-red-50 border-red-100" : "bg-white border-gray-100"
  }`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold">{label}</p>
      <Icon className={`h-4 w-4 ${isAlert ? "text-red-400" : "text-gray-300"}`} />
    </div>
    <p className={`text-[28px] font-bold ${isAlert ? "text-red-600" : "text-[#0F1B2D]"}`}>{value}</p>
    {progressPct !== undefined && (
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2 mb-1">
        <div className="h-full rounded-full bg-gradient-to-r from-[#0D7377] to-[#0fa3a8]" style={{ width: `${Math.min(progressPct, 100)}%` }} />
      </div>
    )}
    {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
  </div>
);

const ProgressRow = ({ label, pct, gradient }: { label: string; pct: number; gradient: string }) => (
  <div>
    <div className="flex justify-between text-[12px] mb-1">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="font-semibold text-[#0F1B2D]">{pct}%</span>
    </div>
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  on_track: { color: "bg-green-500", label: "On Track" },
  at_risk: { color: "bg-orange-500", label: "En Riesgo" },
  attention: { color: "bg-orange-500", label: "En Riesgo" },
  delayed: { color: "bg-red-500", label: "Retrasado" },
  critical: { color: "bg-red-500", label: "Retrasado" },
};

const ProjectCard = ({
  project: p,
  navigate,
}: {
  project: ProjectEnriched;
  navigate: (path: string) => void;
}) => {
  const status = STATUS_DOT[p.status ?? "on_track"] || STATUS_DOT.on_track;
  const physPct = p.progress_pct ?? 0;
  const budgPct = p.budgetProgressPct;

  // Days since last visit
  let lastVisitText = "—";
  if (p.last_visit_date) {
    const days = Math.ceil((Date.now() - new Date(p.last_visit_date).getTime()) / 86400000);
    lastVisitText = days === 0 ? "Hoy" : days === 1 ? "Hace 1 día" : `Hace ${days} días`;
  }

  // CO target
  const coText = p.co_target_date
    ? new Date(p.co_target_date).toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 cursor-pointer"
      onClick={() => navigate(`/portal/proyecto/${p.id}`)}
    >
      {/* Top row: status + code + CTA */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${status.color}`} />
          <span className="text-[12px] font-medium text-gray-600">{status.label}</span>
          <span className="text-[12px] text-gray-400 ml-2">{p.code}</span>
        </div>
        <button
          className="text-[12px] text-[#0D7377] hover:underline font-medium flex items-center gap-0.5"
          onClick={(e) => { e.stopPropagation(); navigate(`/portal/proyecto/${p.id}`); }}
        >
          Ver proyecto <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Address */}
      <p className="text-[13px] text-[#0F1B2D] font-medium">{p.address}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">
        GC: {p.gcName || "—"} · Prestamista: {p.lenderName || "—"}
      </p>

      {/* Map + Metrics */}
      <div className="flex gap-5 mt-4">
        {/* Map */}
        <div className="w-[160px] h-[100px] rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(p.address)}&output=embed`}
            width="160"
            height="100"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map ${p.code}`}
          />
        </div>

        {/* Metrics */}
        <div className="flex-1 space-y-2">
          <MetricRow label="Av. Físico" value={`${physPct}%`} pct={physPct} barColor="from-[#0D7377] to-[#0fa3a8]" />
          <MetricRow label="Av. Financiero" value={`${budgPct}%`} pct={budgPct} barColor="from-[#3B82F6] to-[#60A5FA]" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] mt-1">
            <div><span className="text-gray-400 uppercase">Loan Amount</span> <span className="font-medium text-[#0F1B2D] ml-2">{fmt(p.loan_amount)}</span></div>
            <div><span className="text-gray-400 uppercase">CO Target</span> <span className="font-medium text-[#0F1B2D] ml-2">{coText}</span></div>
            <div><span className="text-gray-400 uppercase">Última visita</span> <span className="font-medium text-[#0F1B2D] ml-2">{lastVisitText}</span></div>
            <div>
              <span className="text-gray-400 uppercase">Issues</span>
              <span className={`font-medium ml-2 ${p.issuesOpen > 0 ? "text-red-600" : "text-[#0F1B2D]"}`}>
                {p.issuesOpen} abierto{p.issuesOpen !== 1 ? "s" : ""} {p.issuesOpen > 0 && "🔴"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-dashed border-gray-100 mt-4 pt-3 flex gap-6 text-[11px] text-gray-500">
        <span>Documentos: {p.docsApproved} aprobados</span>
        <span>Draws: {p.drawsCount}</span>
        <span>Reportes: {p.reportsCount}</span>
      </div>
    </div>
  );
};

const MetricRow = ({ label, value, pct, barColor }: { label: string; value: string; pct: number; barColor: string }) => (
  <div>
    <div className="flex justify-between text-[11px] mb-0.5">
      <span className="text-gray-400 uppercase">{label}</span>
      <span className="font-medium text-[#0F1B2D]">{value}</span>
    </div>
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

const ALERT_STYLES: Record<string, { border: string; bg: string }> = {
  red: { border: "border-l-red-500", bg: "bg-red-50" },
  orange: { border: "border-l-orange-500", bg: "bg-orange-50" },
  blue: { border: "border-l-blue-500", bg: "bg-blue-50" },
};

const AlertRow = ({ alert }: { alert: Alert }) => {
  const style = ALERT_STYLES[alert.type] || ALERT_STYLES.red;
  return (
    <div className={`border-l-[3px] ${style.border} ${style.bg} pl-3 py-2 rounded-r-lg flex items-center justify-between`}>
      <div>
        <p className="text-[13px] text-[#0F1B2D]">{alert.text}</p>
        {alert.projectCode && (
          <p className="text-[10px] text-gray-400 mt-0.5">{alert.projectCode}</p>
        )}
      </div>
      {alert.date && (
        <span className="text-[11px] text-gray-400 flex-shrink-0 ml-4">{alert.date}</span>
      )}
    </div>
  );
};

export default MiPortafolio;
