import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmt } from "@/lib/design-system";
import {
  Building2, DollarSign, TrendingUp, ChevronRight, Bell,
  Landmark, PiggyBank, Ruler, FileText, AlertTriangle,
  BarChart3, Target, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import PhotoTimeline from "@/components/portal/PhotoTimeline";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

/* ═══ ANIMATED COUNTER HOOK ═══ */
function useAnimatedCounter(target: number, duration = 1200, active = true) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, active]);
  return value;
}

/* ═══ SCROLL REVEAL HOOK ═══ */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ═══ SECTION IDS ═══ */
const SECTIONS = [
  { id: "section-hero", label: "Hero" },
  { id: "section-kpis", label: "KPIs" },
  { id: "section-photos", label: "Fotos" },
  { id: "section-draw", label: "Draw" },
  { id: "section-alerts", label: "Alertas" },
] as const;

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
const MiPortafolio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectEnriched[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  // Draw readiness docs
  const [drawDocs, setDrawDocs] = useState<{ name: string; ready: boolean }[]>([]);

  /* IntersectionObserver for nav dots */
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [loading]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
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

        if (milestonesRes.data) allMilestones = [...allMilestones, ...milestonesRes.data];

        openIssues.forEach(issue => {
          alertsList.push({ id: `issue-${issue.id}`, type: "red", text: `Issue abierto: ${issue.title || "Sin título"}`, date: issue.opened_at || "", projectCode: p.code });
        });

        const today = new Date();
        docs.forEach(doc => {
          if (doc.expiration_date) {
            const daysUntil = Math.ceil((new Date(doc.expiration_date).getTime() - today.getTime()) / 86400000);
            if (daysUntil < 0) alertsList.push({ id: `doc-exp-${doc.id}`, type: "red", text: `Documento vencido: ${doc.name}`, date: doc.expiration_date, projectCode: p.code });
            else if (daysUntil <= 30) alertsList.push({ id: `doc-warn-${doc.id}`, type: "orange", text: `Documento por vencer (${daysUntil} días): ${doc.name}`, date: doc.expiration_date, projectCode: p.code });
          }
        });

        // Draw readiness check for first project
        if (enriched.length === 0) {
          const requiredDocs = ["Lien Waiver", "Insurance Certificate", "Pay Application", "Progress Photos", "Inspection Report"];
          const docNames = docs.map(d => d.name?.toLowerCase() || "");
          setDrawDocs(requiredDocs.map(name => ({
            name,
            ready: docNames.some(dn => dn.includes(name.toLowerCase().split(" ")[0])),
          })));
        }

        const loanAmt = p.loan_amount ?? 0;
        const budgetRemaining = loanAmt - totalRealCost;
        const arv = financialsRes.data?.arv_current || null;
        const ltc = arv && arv > 0 ? Math.round((loanAmt / arv) * 10000) / 100 : null;
        const equityProjected = arv && arv > 0 ? arv - loanAmt : null;

        enriched.push({
          ...p, budgetProgressPct, issuesOpen: openIssues.length, docsApproved,
          drawsCount: draws.length, drawsApproved, reportsCount: reportsRes.data?.length || 0,
          gcName: p.gc_name, lenderName: p.lender_name, totalRealCost, budgetRemaining, ltc, arv, equityProjected,
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
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress_pct ?? 0), 0) / projects.length * 100) / 100 : 0;
  const totalIssues = projects.reduce((s, p) => s + p.issuesOpen, 0);
  const avgBudgetProgress = projects.length ? Math.round(projects.reduce((s, p) => s + p.budgetProgressPct, 0) / projects.length * 100) / 100 : 0;
  const totalRealCost = projects.reduce((s, p) => s + p.totalRealCost, 0);
  const totalBudgetRemaining = totalLoan - totalRealCost;
  const totalDrawsApproved = projects.reduce((s, p) => s + p.drawsApproved, 0);
  const totalDraws = projects.reduce((s, p) => s + p.drawsCount, 0);

  const firstProject = projects[0];
  const aggArv = firstProject?.arv ?? null;
  const aggLtc = firstProject?.ltc ?? null;
  const aggEquity = firstProject?.equityProjected ?? null;

  const today = new Date();
  const projectsWithCo = projects.filter(p => p.co_target_date);
  const nearestCo = projectsWithCo.length > 0
    ? projectsWithCo.sort((a, b) => a.co_target_date!.localeCompare(b.co_target_date!))[0] : null;
  const coDate = nearestCo?.co_target_date ? new Date(nearestCo.co_target_date) : null;
  const daysRemaining = coDate ? Math.ceil((coDate.getTime() - today.getTime()) / 86400000) : null;
  const coText = coDate ? coDate.toLocaleDateString("es", { month: "short", year: "numeric" }) : "—";
  const todayFormatted = today.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const realCostPctOfLoan = totalLoan > 0 ? Math.round(totalRealCost / totalLoan * 100) : 0;
  const drawReadinessPct = drawDocs.length > 0 ? Math.round(drawDocs.filter(d => d.ready).length / drawDocs.length * 100) : 0;

  const firstName = profileName?.split(" ")[0] || "";
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-0" style={{ background: "#F8FAFC" }}>
        {/* ═══ STICKY NAV DOTS ═══ */}
        <StickyNavDots activeSection={activeSection} />

        {/* ═══ HERO ═══ */}
        <div id="section-hero" className="mb-8">
          <HeroBanner
            firstName={firstName}
            greeting={greeting}
            projectCount={projects.length}
            coText={coText}
            daysRemaining={daysRemaining}
            avgProgress={avgProgress}
            totalLoan={totalLoan}
            lenderName={firstProject?.lenderName}
          />
        </div>

        {/* ═══ KPIs ═══ */}
        <div id="section-kpis" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-semibold text-foreground">Resumen del Portafolio</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Actualizado hoy · {todayFormatted}
            </p>
          </div>
          <KpiGrid
            avgProgress={avgProgress}
            avgBudgetProgress={avgBudgetProgress}
            daysRemaining={daysRemaining}
            coText={coText}
            totalIssues={totalIssues}
            totalLoan={totalLoan}
            totalRealCost={totalRealCost}
            realCostPctOfLoan={realCostPctOfLoan}
            totalBudgetRemaining={totalBudgetRemaining}
            aggLtc={aggLtc}
            aggArv={aggArv}
            aggEquity={aggEquity}
            totalDrawsApproved={totalDrawsApproved}
            totalDraws={totalDraws}
            lenderName={firstProject?.lenderName}
          />
        </div>

        {/* ═══ OVERALL PROGRESS ═══ */}
        <RevealSection>
          <ProgressTimeline avgProgress={avgProgress} milestones={milestones} coDate={coDate} projectStartDate={projects[0]?.created_at} />
        </RevealSection>

        {/* ═══ DIVIDER ═══ */}
        <SectionDivider label="Fotos del Proyecto" />

        {/* ═══ PHOTOS ═══ */}
        <div id="section-photos">
          <RevealSection>
            <div className="bg-white rounded-[20px] border border-border/50 p-7" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {projects.length > 0 && (
                <PhotoTimeline
                  projectIds={projects.map(p => p.id)}
                  onViewAll={(pid) => navigate(`/portal/proyecto/${pid}/fotos`)}
                />
              )}
            </div>
          </RevealSection>
        </div>

        {/* ═══ DIVIDER ═══ */}
        <SectionDivider label="Estado de Draws" />

        {/* ═══ DRAW STATUS ═══ */}
        <div id="section-draw">
          <RevealSection>
            <DrawReadinessCard pct={drawReadinessPct} docs={drawDocs} />
          </RevealSection>
        </div>

        {/* ═══ PROJECT CARDS ═══ */}
        <div className="mt-8">
          <div id="section-projects" className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-foreground">Mis Proyectos</h2>
            <span className="text-[11px] text-muted-foreground">
              {projects.length} proyecto{projects.length !== 1 ? "s" : ""} activo{projects.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-4">
            {projects.map((p, i) => (
              <RevealSection key={p.id} delay={i * 80}>
                <ProjectCard project={p} navigate={navigate} />
              </RevealSection>
            ))}
          </div>
        </div>

        {/* ═══ DIVIDER ═══ */}
        {alerts.length > 0 && <SectionDivider label="Alertas" />}

        {/* ═══ ALERTS ═══ */}
        {alerts.length > 0 && (
          <div id="section-alerts">
            <RevealSection>
              <div className="bg-white rounded-[20px] border border-border/50 p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h2 className="text-[14px] font-bold text-foreground mb-4 flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Alertas recientes
                </h2>
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <AlertRow key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
            </RevealSection>
          </div>
        )}

        {/* ═══ FOOTER SIGNATURE ═══ */}
        <div className="text-center py-8 mt-6">
          <p className="text-[11px] text-muted-foreground">Powered by relatin.co · 360lateral OPR</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            {["🔒 Secure", "📊 Real-time", "✓ Verified"].map(badge => (
              <span key={badge} className="text-[10px] text-muted-foreground/60">{badge}</span>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

/* ═══════════════════════════════════════════════
   REVEAL WRAPPER
   ═══════════════════════════════════════════════ */
const RevealSection = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className="transition-all duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   SECTION DIVIDER
   ═══════════════════════════════════════════════ */
const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-4 my-8">
    <div className="flex-1 h-px bg-border" />
    <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">{label}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

/* ═══════════════════════════════════════════════
   STICKY NAV DOTS
   ═══════════════════════════════════════════════ */
const StickyNavDots = ({ activeSection }: { activeSection: string }) => (
  <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 hidden lg:flex">
    {SECTIONS.map(({ id, label }) => (
      <Tooltip key={id}>
        <TooltipTrigger asChild>
          <button
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
            className="transition-all duration-200"
            style={{
              width: activeSection === id ? 11 : 8,
              height: activeSection === id ? 11 : 8,
              borderRadius: "50%",
              background: activeSection === id ? "#0D7377" : "rgba(13,115,119,0.3)",
              border: `1.5px solid ${activeSection === id ? "#0D7377" : "rgba(13,115,119,0.5)"}`,
              transform: activeSection === id ? "scale(1.4)" : "scale(1)",
            }}
          />
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-[#0F1B2D] text-white text-[11px] border-none">
          {label}
        </TooltipContent>
      </Tooltip>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════
   HERO BANNER
   ═══════════════════════════════════════════════ */
const HeroBanner = ({
  firstName, greeting, projectCount, coText, daysRemaining, avgProgress, totalLoan, lenderName,
}: {
  firstName: string; greeting: string; projectCount: number; coText: string;
  daysRemaining: number | null; avgProgress: number; totalLoan: number; lenderName?: string | null;
}) => {
  const { ref, visible } = useReveal();
  const animatedProgress = useAnimatedCounter(avgProgress, 1200, visible);
  const animatedLoan = useAnimatedCounter(totalLoan, 1400, visible);

  const formatShortMoney = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div
      ref={ref}
      className="relative rounded-[20px] overflow-hidden"
      style={{
        height: 260,
        background: `
          repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.025) 40px),
          repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.025) 40px),
          linear-gradient(135deg, #0F1B2D 0%, #0D4D52 60%, #0F1B2D 100%)
        `,
      }}
    >
      {/* Skyline SVG */}
      <svg className="absolute right-0 bottom-0 pointer-events-none" width="380" height="260" viewBox="0 0 380 260">
        <rect x="10" y="140" width="28" height="120" rx="2" fill="white" opacity="0.04"/>
        <rect x="42" y="100" width="40" height="160" rx="2" fill="white" opacity="0.06"/>
        <rect x="86" y="160" width="22" height="100" rx="2" fill="white" opacity="0.04"/>
        <rect x="112" y="80" width="50" height="180" rx="3" fill="white" opacity="0.07"/>
        <rect x="166" y="120" width="30" height="140" rx="2" fill="white" opacity="0.05"/>
        <rect x="200" y="60" width="60" height="200" rx="3" fill="white" opacity="0.08"/>
        <rect x="265" y="110" width="35" height="150" rx="2" fill="white" opacity="0.05"/>
        <rect x="304" y="90" width="45" height="170" rx="2" fill="white" opacity="0.06"/>
        <rect x="353" y="130" width="30" height="130" rx="2" fill="white" opacity="0.04"/>
        <rect x="208" y="80" width="6" height="5" rx="1" fill="white" opacity="0.15"/>
        <rect x="220" y="80" width="6" height="5" rx="1" fill="white" opacity="0.10"/>
        <rect x="232" y="80" width="6" height="5" rx="1" fill="white" opacity="0.20"/>
        <rect x="208" y="92" width="6" height="5" rx="1" fill="white" opacity="0.08"/>
        <rect x="220" y="92" width="6" height="5" rx="1" fill="white" opacity="0.18"/>
        <rect x="232" y="92" width="6" height="5" rx="1" fill="white" opacity="0.12"/>
        <rect x="208" y="104" width="6" height="5" rx="1" fill="white" opacity="0.15"/>
        <rect x="220" y="104" width="6" height="5" rx="1" fill="white" opacity="0.08"/>
        <path d="M0 230 Q50 222 100 230 Q150 238 200 230 Q250 222 300 230 Q350 238 380 230 L380 260 L0 260 Z" fill="#0D7377" opacity="0.2"/>
        <path d="M0 242 Q60 236 120 242 Q180 248 240 242 Q300 236 380 242 L380 260 L0 260 Z" fill="#0D7377" opacity="0.15"/>
      </svg>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(15,27,45,0.4), transparent)" }} />

      {/* Content */}
      <div className="relative z-10 px-10 pt-8 flex flex-col justify-start h-full">
        <p className="text-[13px] text-white/55 mb-1.5">{greeting}, {firstName}! 👋</p>
        <span className="inline-flex items-center gap-1 text-white/70 text-[11px] rounded-full px-3 py-1 w-fit mb-2.5" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
          📍 St. Petersburg · Pinellas County, FL
        </span>
        <h1 className="text-[32px] font-bold text-white leading-tight" style={{ letterSpacing: "-0.5px" }}>Mi Portafolio de Inversión</h1>
        <p className="text-[13px] text-white/50 mt-1.5 mb-5">Desarrollo residencial · Supervisado por 360lateral</p>

        {/* Pulsing status badge */}
        <div className="inline-flex items-center gap-1.5 rounded-[20px] px-3 py-1.5 w-fit" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[12px] text-emerald-500 font-medium">Live · On Track</span>
        </div>
      </div>

      {/* Floating KPI pills */}
      <div className="absolute bottom-6 left-10 flex gap-3 z-10">
        {[
          { label: "AV. FÍSICO", value: `${animatedProgress.toFixed(2)}%`, sub: "en construcción" },
          { label: "LOAN AMOUNT", value: formatShortMoney(animatedLoan), sub: lenderName || "—" },
          { label: "CO TARGET", value: coText, sub: daysRemaining !== null ? `${daysRemaining} días restantes` : "—" },
        ].map((pill) => (
          <div key={pill.label} className="rounded-xl px-5 py-3" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <p className="text-[9px] uppercase tracking-[0.08em] text-white/50">{pill.label}</p>
            <p className="text-[18px] font-bold text-white mt-0.5">{pill.value}</p>
            <p className="text-[10px] text-white/40">{pill.sub}</p>
          </div>
        ))}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #0D7377, #E07B39, #0D7377)", opacity: 0.7 }} />
    </div>
  );
};

/* ═══════════════════════════════════════════════
   KPI GRID
   ═══════════════════════════════════════════════ */
const KPI_TOOLTIPS: Record<string, string> = {
  "Av. Físico": "Porcentaje de obra física completada según el SOV",
  "Av. Financiero": "Avance financiero del presupuesto ejecutado",
  "CO Target": "Fecha estimada de Certificate of Occupancy",
  "Issues": "Problemas abiertos que requieren atención",
  "Loan Amount": "Monto total del préstamo de construcción",
  "Costo Real Ejecutado": "Costo ejecutado real según facturas y SOV",
  "Budget Restante": "Fondos disponibles para completar el proyecto",
  "Loan-to-Cost (LTC)": "Loan-to-Cost: proporción del financiamiento sobre el costo total",
  "ARV (Est.)": "After Repair Value: valor estimado de la propiedad al completar",
  "Equity Proyectado": "Diferencia proyectada entre ARV y monto del préstamo",
  "Costo / SF Estimado": "Costo estimado por pie cuadrado construido",
  "Draws Realizados": "Desembolsos aprobados por el prestamista",
};

const KpiGrid = ({
  avgProgress, avgBudgetProgress, daysRemaining, coText, totalIssues,
  totalLoan, totalRealCost, realCostPctOfLoan, totalBudgetRemaining, aggLtc,
  aggArv, aggEquity, totalDrawsApproved, totalDraws, lenderName,
}: {
  avgProgress: number; avgBudgetProgress: number; daysRemaining: number | null;
  coText: string; totalIssues: number; totalLoan: number; totalRealCost: number;
  realCostPctOfLoan: number; totalBudgetRemaining: number; aggLtc: number | null;
  aggArv: number | null; aggEquity: number | null; totalDrawsApproved: number;
  totalDraws: number; lenderName?: string | null;
}) => (
  <div className="space-y-4">
    {/* Row 1 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Av. Físico" value={avgProgress} format="pct" sub="en progreso" progressPct={avgProgress} barTeal icon={BarChart3} />
      <KpiCard label="Av. Financiero" value={avgBudgetProgress} format="pct" sub="ejecutado" progressPct={avgBudgetProgress} icon={TrendingUp} />
      <KpiCard label="CO Target" value={daysRemaining ?? 0} format="days" displayValue={daysRemaining !== null ? `${daysRemaining} días` : "—"} sub={coText} secondarySub={daysRemaining !== null && daysRemaining > 0 ? "On Track ✓" : undefined} secondaryColor="text-emerald-600" icon={Target} />
      <KpiCard label="Issues" value={totalIssues} format="int" sub={totalIssues > 0 ? "⚠️ atender" : "sin pendientes"} isAlert={totalIssues > 0} icon={AlertTriangle} />
    </div>
    {/* Row 2 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Loan Amount" value={totalLoan} format="money" sub={lenderName || "—"} icon={Landmark} />
      <KpiCard label="Costo Real Ejecutado" value={totalRealCost} format="money" sub={`${realCostPctOfLoan}% del loan total`} icon={DollarSign} />
      <KpiCard label="Budget Restante" value={totalBudgetRemaining} format="money" sub="por ejecutar" icon={PiggyBank} />
      <KpiCard label="Loan-to-Cost (LTC)" value={aggLtc ?? 0} format="pct" displayValue={aggLtc !== null ? `${aggLtc}%` : "—"} sub={aggLtc !== null && aggLtc >= 100 ? "fully financed" : aggLtc !== null ? "parcialmente" : "por definir"} secondarySub={aggLtc !== null && aggLtc >= 100 ? "fully financed" : undefined} secondaryColor="text-[#0D7377]" icon={Building2} />
    </div>
    {/* Row 3 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="ARV (Est.)" value={aggArv ?? 0} format="money" displayValue={aggArv ? fmt(aggArv) : "—"} sub={aggArv ? "" : "por definir"} icon={TrendingUp} />
      <KpiCard label="Equity Proyectado" value={aggEquity ?? 0} format="money" displayValue={aggEquity ? fmt(aggEquity) : "—"} sub={aggEquity ? "" : "ARV - Loan"} icon={Building2} />
      <KpiCard label="Costo / SF Estimado" value={0} format="money" displayValue="—" sub="budget/sqft" icon={Ruler} />
      <KpiCard label="Draws Realizados" value={totalDrawsApproved} format="int" sub={`de ${totalDraws} totales`} icon={FileText} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════
   KPI CARD (with tooltip + animated counter)
   ═══════════════════════════════════════════════ */
const KpiCard = ({
  label, value, format, displayValue, sub, icon: Icon, isAlert,
  progressPct, barTeal, secondarySub, secondaryColor,
}: {
  label: string; value: number; format: "pct" | "money" | "int" | "days";
  displayValue?: string; sub: string; icon?: any; isAlert?: boolean;
  progressPct?: number; barTeal?: boolean; secondarySub?: string; secondaryColor?: string;
}) => {
  const { ref, visible } = useReveal();
  const animated = useAnimatedCounter(value, 1200, visible);

  let display = displayValue;
  if (!display) {
    if (format === "pct") display = `${animated.toFixed(2)}%`;
    else if (format === "money") display = fmt(Math.round(animated));
    else if (format === "int") display = String(Math.round(animated));
    else if (format === "days") display = `${Math.round(animated)} días`;
  }

  const tooltipText = KPI_TOOLTIPS[label] || "";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={ref}
          className={`rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 p-[22px] cursor-default group ${
            isAlert
              ? "bg-[#FFF5F5] border-l-[3px] border-l-destructive border-t-border/50 border-r-border/50 border-b-border/50"
              : "bg-white border-[#F1F5F9] hover:border-accent/30"
          }`}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "all 500ms ease",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] uppercase tracking-[0.07em] text-muted-foreground font-medium">{label}</p>
            {Icon && <Icon className="h-4 w-4 text-accent/50" />}
          </div>
          <p className={`text-[30px] font-bold my-1.5 leading-none ${isAlert ? "text-destructive" : "text-foreground"}`}>{display}</p>
          {progressPct !== undefined && (
            <div className="h-1 w-full bg-[#F1F5F9] rounded-full overflow-hidden mt-2.5 mb-1">
              <div className="h-full rounded-full" style={{ width: `${Math.min(progressPct, 100)}%`, background: barTeal ? "linear-gradient(90deg, #0D7377, #10B981)" : "hsl(var(--accent))" }} />
            </div>
          )}
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
          {secondarySub && <p className={`text-[11px] font-medium mt-0.5 ${secondaryColor || "text-muted-foreground"}`}>{secondarySub}</p>}
        </div>
      </TooltipTrigger>
      {tooltipText && (
        <TooltipContent side="top" className="bg-[#0F1B2D] text-white text-[12px] border-none max-w-[200px]">
          {tooltipText}
        </TooltipContent>
      )}
    </Tooltip>
  );
};

/* ═══════════════════════════════════════════════
   PROGRESS TIMELINE
   ═══════════════════════════════════════════════ */
const ProgressTimeline = ({
  avgProgress, milestones, coDate, projectStartDate,
}: {
  avgProgress: number; milestones: Milestone[]; coDate: Date | null; projectStartDate?: string | null;
}) => {
  const startLabel = projectStartDate ? new Date(projectStartDate).toLocaleDateString("es", { month: "short", year: "numeric" }) : "Inicio";
  const endLabel = coDate ? coDate.toLocaleDateString("es", { month: "short", year: "numeric" }) : "CO Target";
  const keyMilestones = milestones.slice(0, 5);

  return (
    <div className="bg-white rounded-[20px] border border-[#F1F5F9] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-bold text-foreground">Ejecución del Proyecto</p>
        <p className="text-[12px] text-muted-foreground">{avgProgress}% completado</p>
      </div>
      <div className="relative h-[10px] w-full bg-[#F1F5F9] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(avgProgress, 100)}%`, background: "linear-gradient(90deg, #0D7377, #10B981)" }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
        <span>{startLabel}</span>
        <span className="font-medium text-foreground">{avgProgress}% ← aquí</span>
        <span>{endLabel}</span>
      </div>
      {keyMilestones.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-dashed border-border">
          {keyMilestones.map(m => (
            <span key={m.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${m.status === "completed" ? "bg-emerald-500" : m.status === "in_progress" ? "bg-accent" : "bg-muted"}`} />
              {m.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   DRAW READINESS
   ═══════════════════════════════════════════════ */
const DrawReadinessCard = ({ pct, docs }: { pct: number; docs: { name: string; ready: boolean }[] }) => {
  const circumference = 2 * Math.PI * 50;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-white rounded-[20px] border border-[#F1F5F9] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <h3 className="text-[13px] font-bold text-foreground mb-5">Next Draw Readiness</h3>
      <div className="flex items-center gap-8">
        {/* Donut */}
        <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#F1F5F9" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke="#0D7377" strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 60 60)"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[20px] font-bold text-foreground">{pct}%</span>
          </div>
        </div>
        {/* Checklist */}
        <div className="flex-1 space-y-2">
          {docs.map(doc => (
            <div key={doc.name} className="flex items-center gap-2 text-[12px]">
              {doc.ready
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                : <XCircle className="h-4 w-4 text-destructive/60 flex-shrink-0" />}
              <span className={doc.ready ? "text-foreground" : "text-muted-foreground"}>{doc.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   PROJECT CARD
   ═══════════════════════════════════════════════ */
const STATUS_DOT: Record<string, { color: string; label: string }> = {
  on_track: { color: "bg-emerald-500", label: "On Track" },
  at_risk: { color: "bg-orange-500", label: "En Riesgo" },
  attention: { color: "bg-orange-500", label: "En Riesgo" },
  delayed: { color: "bg-destructive", label: "Retrasado" },
  critical: { color: "bg-destructive", label: "Retrasado" },
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
  const coText = p.co_target_date ? new Date(p.co_target_date).toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div
      className="bg-white rounded-[20px] border border-[#F1F5F9] p-5 cursor-pointer"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "all 250ms cubic-bezier(0.4,0,0.2,1)" }}
      onClick={() => navigate(`/portal/proyecto/${p.id}`)}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(13,115,119,0.2)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "#F1F5F9"; }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${status.color}`} />
          <span className="text-[12px] font-medium text-muted-foreground">{status.label}</span>
          <span className="text-[12px] text-muted-foreground ml-2">{p.code}</span>
        </div>
        <button className="text-[12px] text-accent hover:underline font-medium flex items-center gap-0.5" onClick={(e) => { e.stopPropagation(); navigate(`/portal/proyecto/${p.id}`); }}>
          Ver proyecto <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-[13px] text-foreground font-medium">{p.address}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">GC: {p.gcName || "—"} · Prestamista: {p.lenderName || "—"}</p>

      <div className="flex gap-5 mt-4">
        <div className="w-[160px] h-[100px] rounded-lg overflow-hidden flex-shrink-0 border border-border">
          <iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(p.address)}&output=embed`} width="160" height="100" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`Map ${p.code}`} />
        </div>
        <div className="flex-1 space-y-2">
          <MetricRow label="Av. Físico" value={`${physPct}%`} pct={physPct} teal />
          <MetricRow label="Av. Financiero" value={`${budgPct}%`} pct={budgPct} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] mt-1">
            <div><span className="text-muted-foreground uppercase">Loan Amount</span> <span className="font-medium text-foreground ml-2">{fmt(p.loan_amount)}</span></div>
            <div><span className="text-muted-foreground uppercase">CO Target</span> <span className="font-medium text-foreground ml-2">{coText}</span></div>
            <div><span className="text-muted-foreground uppercase">Última visita</span> <span className="font-medium text-foreground ml-2">{lastVisitText}</span></div>
            <div><span className="text-muted-foreground uppercase">Issues</span> <span className={`font-medium ml-2 ${p.issuesOpen > 0 ? "text-destructive" : "text-foreground"}`}>{p.issuesOpen} abierto{p.issuesOpen !== 1 ? "s" : ""} {p.issuesOpen > 0 && "🔴"}</span></div>
            <div><span className="text-muted-foreground uppercase">Prestamista</span> <span className="font-medium text-foreground ml-2">{p.lenderName || "—"}</span></div>
            <div><span className="text-muted-foreground uppercase">Permiso</span> <span className="font-medium text-foreground ml-2">{p.permit_no || "—"}</span></div>
            <div><span className="text-muted-foreground uppercase">GC Fee</span> <span className="font-medium text-foreground ml-2">{p.gc_construction_fee_pct ? `${p.gc_construction_fee_pct}%` : "—"}</span></div>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-border mt-4 pt-3 flex gap-6 text-[11px] text-muted-foreground">
        <span>Documentos: {p.docsApproved} aprobados</span>
        <span>Draws: {p.drawsCount}</span>
        <span>Reportes: {p.reportsCount}</span>
      </div>
    </div>
  );
};

const MetricRow = ({ label, value, pct, teal }: { label: string; value: string; pct: number; teal?: boolean }) => (
  <div>
    <div className="flex justify-between text-[11px] mb-0.5">
      <span className="text-muted-foreground uppercase">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
    <div className="h-[5px] w-full bg-[#F1F5F9] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: teal ? "linear-gradient(90deg, #0D7377, #10B981)" : "hsl(var(--accent))" }} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════
   ALERT ROW
   ═══════════════════════════════════════════════ */
const ALERT_STYLES: Record<string, { border: string; bg: string; iconBg: string }> = {
  red: { border: "border-l-destructive", bg: "bg-red-50", iconBg: "bg-red-100" },
  orange: { border: "border-l-orange-500", bg: "bg-orange-50", iconBg: "bg-orange-100" },
  blue: { border: "border-l-blue-500", bg: "bg-blue-50", iconBg: "bg-blue-100" },
};

const AlertRow = ({ alert }: { alert: Alert }) => {
  const style = ALERT_STYLES[alert.type] || ALERT_STYLES.red;
  const relTime = alert.date ? getRelativeTime(alert.date) : "";

  return (
    <div className={`border-l-[3px] ${style.border} ${style.bg} pl-3 pr-4 py-3.5 rounded-r-xl flex items-center gap-3 hover:brightness-[0.97] transition-all`}>
      <div className={`w-8 h-8 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
        <AlertTriangle className="h-3.5 w-3.5 text-foreground/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground truncate">{alert.text}</p>
        {alert.projectCode && <p className="text-[10px] text-muted-foreground mt-0.5">{alert.projectCode}</p>}
      </div>
      {relTime && <span className="text-[11px] text-muted-foreground flex-shrink-0">{relTime}</span>}
    </div>
  );
};

function getRelativeTime(dateStr: string): string {
  const diff = Math.ceil((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff <= 0) return "hoy";
  if (diff === 1) return "hace 1 día";
  if (diff < 30) return `hace ${diff} días`;
  return new Date(dateStr).toLocaleDateString("es", { month: "short", day: "numeric" });
}

export default MiPortafolio;
