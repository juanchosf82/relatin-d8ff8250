import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmt } from "@/lib/design-system";
import { Building2, DollarSign, TrendingUp, ChevronRight, Bell, Landmark, PiggyBank, Ruler, FileText } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface ProjectEnriched extends Project {
  budgetProgressPct: number;
  issuesOpen: number;
  docsApproved: number;
  drawsCount: number;
  drawsApproved: number;
  reportsCount: number;
  gcName: string | null;
  lenderName: string | null;
  totalRealCost: number;
  budgetRemaining: number;
  ltc: number | null;
  arv: number | null;
  equityProjected: number | null;
}

interface Milestone {
  id: string;
  name: string;
  phase: string;
  sequence: number;
  status: string | null;
  baseline_start: string | null;
  baseline_end: string | null;
  actual_end: string | null;
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
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [_profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      setProfileName(profile?.full_name || null);

      const { data: projs } = await supabase.from("projects").select("*");
      const projectsList = projs || [];

      const enriched: ProjectEnriched[] = [];
      const alertsList: Alert[] = [];
      let allMilestones: Milestone[] = [];

      for (const p of projectsList) {
        const [sovRes, issuesRes, docsRes, drawsRes, reportsRes, milestonesRes, financialsRes] = await Promise.all([
          supabase.from("sov_lines").select("budget, progress_pct, real_cost").eq("project_id", p.id),
          supabase.from("issues").select("id, status, title, opened_at").eq("project_id", p.id).eq("status", "open"),
          supabase.from("project_documents").select("id, status, expiration_date, name").eq("project_id", p.id),
          supabase.from("draws").select("id, status").eq("project_id", p.id),
          supabase.from("weekly_reports").select("id").eq("project_id", p.id),
          supabase.from("milestones").select("id, name, phase, sequence, status, baseline_start, baseline_end, actual_end").eq("project_id", p.id).order("sequence"),
          supabase.from("project_financials").select("arv_current, loan_amount, equity_invested").eq("project_id", p.id).maybeSingle(),
        ]);

        const sovLines = sovRes.data || [];
        let budgetProgressPct = 0;
        let totalRealCost = 0;
        if (sovLines.length > 0) {
          totalRealCost = sovLines.reduce((a, c) => a + (c.real_cost || 0), 0);
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
        const draws = drawsRes.data || [];
        const drawsApproved = draws.filter(d => d.status === "paid" || d.status === "approved").length;

        if (milestonesRes.data) {
          allMilestones = [...allMilestones, ...milestonesRes.data];
        }

        openIssues.forEach(issue => {
          alertsList.push({
            id: `issue-${issue.id}`,
            type: "red",
            text: `Issue abierto: ${issue.title || "Sin título"}`,
            date: issue.opened_at || "",
            projectCode: p.code,
          });
        });

        const today = new Date();
        docs.forEach(doc => {
          if (doc.expiration_date) {
            const expDate = new Date(doc.expiration_date);
            const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
            if (daysUntil < 0) {
              alertsList.push({ id: `doc-exp-${doc.id}`, type: "red", text: `Documento vencido: ${doc.name}`, date: doc.expiration_date, projectCode: p.code });
            } else if (daysUntil <= 30) {
              alertsList.push({ id: `doc-warn-${doc.id}`, type: "orange", text: `Documento por vencer (${daysUntil} días): ${doc.name}`, date: doc.expiration_date, projectCode: p.code });
            }
          }
        });

        const loanAmt = p.loan_amount ?? 0;
        const budgetRemaining = loanAmt - totalRealCost;
        const arv = financialsRes.data?.arv_current || null;
        const ltc = arv && arv > 0 ? Math.round((loanAmt / arv) * 10000) / 100 : null;
        const equityProjected = arv && arv > 0 ? arv - loanAmt : null;

        enriched.push({
          ...p,
          budgetProgressPct,
          issuesOpen: openIssues.length,
          docsApproved,
          drawsCount: draws.length,
          drawsApproved,
          reportsCount: reportsRes.data?.length || 0,
          gcName: p.gc_name,
          lenderName: p.lender_name,
          totalRealCost,
          budgetRemaining,
          ltc,
          arv,
          equityProjected,
        });
      }

      alertsList.sort((a, b) => b.date.localeCompare(a.date));
      setAlerts(alertsList.slice(0, 10));
      setProjects(enriched);
      setMilestones(allMilestones);
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
  const totalRealCost = projects.reduce((s, p) => s + p.totalRealCost, 0);
  const totalBudgetRemaining = totalLoan - totalRealCost;
  const totalDrawsApproved = projects.reduce((s, p) => s + p.drawsApproved, 0);
  const totalDraws = projects.reduce((s, p) => s + p.drawsCount, 0);

  // Aggregate ARV / LTC
  const firstProject = projects[0];
  const aggArv = firstProject?.arv ?? null;
  const aggLtc = firstProject?.ltc ?? null;
  const aggEquity = firstProject?.equityProjected ?? null;

  const today = new Date();
  const projectsWithCo = projects.filter(p => p.co_target_date);
  const nearestCo = projectsWithCo.length > 0
    ? projectsWithCo.sort((a, b) => a.co_target_date!.localeCompare(b.co_target_date!))[0]
    : null;
  const coDate = nearestCo?.co_target_date ? new Date(nearestCo.co_target_date) : null;
  const daysRemaining = coDate ? Math.ceil((coDate.getTime() - today.getTime()) / 86400000) : null;

  const coText = coDate
    ? coDate.toLocaleDateString("es", { month: "short", year: "numeric" })
    : "—";

  const todayFormatted = today.toLocaleDateString("es", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const realCostPctOfLoan = totalLoan > 0 ? Math.round(totalRealCost / totalLoan * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ HERO BANNER ═══ */}
      <HeroBanner
        projectCount={projects.length}
        coText={coText}
      />

      {/* ═══ KPI SECTION HEADER ═══ */}
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-[#0F1B2D]">Resumen del Portafolio</p>
        <p className="text-[11px] text-gray-400">Actualizado hoy · {todayFormatted}</p>
      </div>

      {/* ═══ ROW 1 — Construction Progress ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Av. Físico" value={`${avgProgress}%`} sub="en progreso" progressPct={avgProgress} barColor="bg-[#0D7377]" />
        <KpiCard label="Av. Financiero" value={`${avgBudgetProgress}%`} sub="ejecutado" progressPct={avgBudgetProgress} barColor="bg-blue-500" />
        <KpiCard
          label="CO Target"
          value={daysRemaining !== null ? `${daysRemaining} días` : "—"}
          sub={coDate ? coText : "sin fecha"}
          secondarySub={daysRemaining !== null && daysRemaining > 0 ? "On Track ✓" : undefined}
          secondaryColor="text-green-600"
        />
        <KpiCard
          label="Issues"
          value={String(totalIssues)}
          sub={totalIssues > 0 ? "⚠️ atender" : "sin pendientes"}
          isAlert={totalIssues > 0}
        />
      </div>

      {/* ═══ ROW 2 — Real Estate Financials ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Loan Amount" value={fmt(totalLoan)} sub={firstProject?.lenderName || "—"} icon={Landmark} />
        <KpiCard label="Costo Real Ejecutado" value={fmt(totalRealCost)} sub={`${realCostPctOfLoan}% del loan total`} icon={DollarSign} />
        <KpiCard label="Budget Restante" value={fmt(totalBudgetRemaining)} sub="por ejecutar" icon={PiggyBank} />
        <KpiCard
          label="Loan-to-Cost (LTC)"
          value={aggLtc !== null ? `${aggLtc}%` : "—"}
          sub={aggLtc !== null && aggLtc >= 100 ? "fully financed" : aggLtc !== null ? "parcialmente" : "por definir"}
          secondarySub={aggLtc !== null && aggLtc >= 100 ? "fully financed" : undefined}
          secondaryColor="text-[#0D7377]"
        />
      </div>

      {/* ═══ ROW 3 — Investment Metrics ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="ARV (Est.)" value={aggArv ? fmt(aggArv) : "—"} sub={aggArv ? "" : "por definir"} icon={TrendingUp} />
        <KpiCard label="Equity Proyectado" value={aggEquity ? fmt(aggEquity) : "—"} sub={aggEquity ? "" : "ARV - Loan"} icon={Building2} />
        <KpiCard label="Costo / SF Estimado" value="—" sub="budget/sqft" icon={Ruler} />
        <KpiCard label="Draws Realizados" value={String(totalDrawsApproved)} sub={`de ${totalDraws} totales`} icon={FileText} />
      </div>

      {/* ═══ OVERALL PROGRESS BAR ═══ */}
      <ProgressTimeline
        avgProgress={avgProgress}
        milestones={milestones}
        coDate={coDate}
        projectStartDate={projects[0]?.created_at}
      />

      {/* ═══ PROJECT CARDS ═══ */}
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

      {/* ═══ ALERTS ═══ */}
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

/* ═══════════════════════════════════════════════
   HERO BANNER
   ═══════════════════════════════════════════════ */
const HeroBanner = ({
  projectCount, coText,
}: {
  projectCount: number; coText: string;
}) => (
  <div className="relative rounded-2xl overflow-hidden h-[200px]" style={{
    background: `
      repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.03) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.03) 40px),
      linear-gradient(135deg, #0F1B2D 0%, #0D4D52 100%)
    `,
  }}>
    {/* Skyline SVG */}
    <svg className="absolute right-0 top-0 h-full" width="320" height="200" viewBox="0 0 320 200" preserveAspectRatio="xMaxYMax meet">
      <rect x="20" y="80" width="30" height="120" fill="white" opacity="0.06" rx="2"/>
      <rect x="55" y="50" width="45" height="150" fill="white" opacity="0.08" rx="2"/>
      <rect x="105" y="100" width="25" height="100" fill="white" opacity="0.05" rx="2"/>
      <rect x="135" y="30" width="60" height="170" fill="white" opacity="0.09" rx="2"/>
      <rect x="200" y="70" width="35" height="130" fill="white" opacity="0.06" rx="2"/>
      <rect x="240" y="90" width="50" height="110" fill="white" opacity="0.07" rx="2"/>
      <rect x="295" y="110" width="30" height="90" fill="white" opacity="0.05" rx="2"/>
      <path d="M0 185 Q80 178 160 185 Q240 192 320 185 L320 200 L0 200Z" fill="rgba(13,115,119,0.25)"/>
    </svg>

    {/* Content */}
    <div className="relative z-10 p-9 flex flex-col justify-center h-full">
      <span className="inline-flex items-center gap-1 bg-white/10 text-white text-[11px] rounded-full px-3 py-1 w-fit mb-3">
        📍 St. Petersburg · Pinellas County, FL
      </span>
      <h1 className="text-[28px] font-bold text-white leading-tight">Mi Portafolio de Inversión</h1>
      <p className="text-[13px] text-white/65 mt-1">
        Desarrollo residencial · Supervisado por 360lateral
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        {[
          `🏗 ${projectCount} proyecto${projectCount !== 1 ? "s" : ""} activo${projectCount !== 1 ? "s" : ""}`,
          `📅 CO Target: ${coText}`,
          "✓ Gestionado por 360lateral",
        ].map((text, i) => (
          <span key={i} className="bg-white/[0.08] border border-white/[0.12] text-white text-[11px] rounded-full px-3 py-1">
            {text}
          </span>
        ))}
      </div>
    </div>

    {/* Bottom accent line */}
    <div className="absolute bottom-0 left-0 right-0 h-1" style={{
      background: "linear-gradient(90deg, #0D7377, #E07B39, #0D7377)",
      opacity: 0.7,
    }} />
  </div>
);

/* ═══════════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════════ */
const KpiCard = ({
  label, value, sub, icon: Icon, isAlert, progressPct, barColor, secondarySub, secondaryColor,
}: {
  label: string; value: string; sub: string; icon?: any; isAlert?: boolean;
  progressPct?: number; barColor?: string; secondarySub?: string; secondaryColor?: string;
}) => (
  <div className={`rounded-2xl border shadow-sm hover:shadow-md transition-all duration-150 p-5 ${
    isAlert ? "bg-[#FEF2F2] border-l-[3px] border-l-[#DC2626] border-t-gray-100 border-r-gray-100 border-b-gray-100" : "bg-white border-gray-200"
  }`}>
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] uppercase tracking-[0.06em] text-gray-400 font-medium">{label}</p>
      {Icon && <Icon className="h-4 w-4 text-gray-300" />}
    </div>
    <p className={`text-[26px] font-bold my-1.5 ${isAlert ? "text-[#DC2626]" : "text-[#0F1B2D]"}`}>{value}</p>
    {progressPct !== undefined && (
      <div className="h-[5px] w-full bg-gray-100 rounded-full overflow-hidden mt-1.5 mb-1">
        <div className={`h-full rounded-full ${barColor || "bg-[#0D7377]"}`} style={{ width: `${Math.min(progressPct, 100)}%` }} />
      </div>
    )}
    {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    {secondarySub && <p className={`text-[11px] font-medium mt-0.5 ${secondaryColor || "text-gray-500"}`}>{secondarySub}</p>}
  </div>
);

/* ═══════════════════════════════════════════════
   PROGRESS TIMELINE
   ═══════════════════════════════════════════════ */
const ProgressTimeline = ({
  avgProgress, milestones, coDate, projectStartDate,
}: {
  avgProgress: number; milestones: Milestone[]; coDate: Date | null; projectStartDate?: string | null;
}) => {
  const startLabel = projectStartDate
    ? new Date(projectStartDate).toLocaleDateString("es", { month: "short", year: "numeric" })
    : "Inicio";
  const endLabel = coDate
    ? coDate.toLocaleDateString("es", { month: "short", year: "numeric" })
    : "CO Target";

  // Pick up to 5 key milestones for display
  const keyMilestones = milestones.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-bold text-[#0F1B2D]">Ejecución del Proyecto</p>
        <p className="text-[12px] text-gray-400">{avgProgress}% completado</p>
      </div>
      {/* Bar */}
      <div className="relative h-[10px] w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(avgProgress, 100)}%`,
            background: "linear-gradient(90deg, #0D7377, #10B981)",
          }}
        />
      </div>
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
        <span>{startLabel}</span>
        <span className="font-medium text-[#0F1B2D]">{avgProgress}% ← aquí</span>
        <span>{endLabel}</span>
      </div>
      {/* Milestone dots */}
      {keyMilestones.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-dashed border-gray-100">
          {keyMilestones.map(m => (
            <span key={m.id} className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className={`w-2 h-2 rounded-full ${
                m.status === "completed" ? "bg-green-500" : m.status === "in_progress" ? "bg-[#0D7377]" : "bg-gray-300"
              }`} />
              {m.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   PROJECT CARD
   ═══════════════════════════════════════════════ */
const STATUS_DOT: Record<string, { color: string; label: string }> = {
  on_track: { color: "bg-green-500", label: "On Track" },
  at_risk: { color: "bg-orange-500", label: "En Riesgo" },
  attention: { color: "bg-orange-500", label: "En Riesgo" },
  delayed: { color: "bg-red-500", label: "Retrasado" },
  critical: { color: "bg-red-500", label: "Retrasado" },
};

const ProjectCard = ({ project: p, navigate }: { project: ProjectEnriched; navigate: (path: string) => void }) => {
  const status = STATUS_DOT[p.status ?? "on_track"] || STATUS_DOT.on_track;
  const physPct = p.progress_pct ?? 0;
  const budgPct = p.budgetProgressPct;

  let lastVisitText = "—";
  if (p.last_visit_date) {
    const days = Math.ceil((Date.now() - new Date(p.last_visit_date).getTime()) / 86400000);
    lastVisitText = days === 0 ? "Hoy" : days === 1 ? "Hace 1 día" : `Hace ${days} días`;
  }

  const coText = p.co_target_date
    ? new Date(p.co_target_date).toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 cursor-pointer"
      onClick={() => navigate(`/portal/proyecto/${p.id}`)}
    >
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

      <p className="text-[13px] text-[#0F1B2D] font-medium">{p.address}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">
        GC: {p.gcName || "—"} · Prestamista: {p.lenderName || "—"}
      </p>

      <div className="flex gap-5 mt-4">
        <div className="w-[160px] h-[100px] rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(p.address)}&output=embed`}
            width="160" height="100" style={{ border: 0 }} loading="lazy"
            referrerPolicy="no-referrer-when-downgrade" title={`Map ${p.code}`}
          />
        </div>

        <div className="flex-1 space-y-2">
          <MetricRow label="Av. Físico" value={`${physPct}%`} pct={physPct} barColor="bg-[#0D7377]" />
          <MetricRow label="Av. Financiero" value={`${budgPct}%`} pct={budgPct} barColor="bg-blue-500" />
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
            <div><span className="text-gray-400 uppercase">Prestamista</span> <span className="font-medium text-[#0F1B2D] ml-2">{p.lenderName || "—"}</span></div>
            <div><span className="text-gray-400 uppercase">Permiso</span> <span className="font-medium text-[#0F1B2D] ml-2">{p.permit_no || "—"}</span></div>
            <div><span className="text-gray-400 uppercase">GC Fee</span> <span className="font-medium text-[#0F1B2D] ml-2">{p.gc_construction_fee_pct ? `${p.gc_construction_fee_pct}%` : "—"}</span></div>
          </div>
        </div>
      </div>

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
    <div className="h-[5px] w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════
   ALERT ROW
   ═══════════════════════════════════════════════ */
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
        {alert.projectCode && <p className="text-[10px] text-gray-400 mt-0.5">{alert.projectCode}</p>}
      </div>
      {alert.date && <span className="text-[11px] text-gray-400 flex-shrink-0 ml-4">{alert.date}</span>}
    </div>
  );
};

export default MiPortafolio;
