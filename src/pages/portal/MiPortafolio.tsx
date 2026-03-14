import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmt } from "@/lib/design-system";
import {
  Building2, DollarSign, TrendingUp, ChevronDown, ChevronRight, Bell,
  Landmark, PiggyBank, Ruler, FileText, AlertTriangle,
  BarChart3, Target, Clock, CheckCircle2, XCircle, Camera, MapPin,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Tables } from "@/integrations/supabase/types";
import ProjectMapEmbed from "@/components/portal/ProjectMapEmbed";

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
  photos: { id: string; url: string; caption: string | null }[];
  drawDocs: { name: string; ready: boolean }[];
  drawReadinessPct: number;
  issues: { id: string; title: string | null; date: string }[];
}

interface Milestone {
  id: string; name: string; phase: string; sequence: number;
  status: string | null; baseline_start: string | null;
  baseline_end: string | null; actual_end: string | null;
}

interface Alert {
  id: string; type: "red" | "orange" | "blue";
  text: string; date: string; projectCode?: string;
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
  { id: "section-map", label: "Mapa" },
  { id: "section-projects", label: "Proyectos" },
] as const;

/* ═══ Custom Leaflet marker icon ═══ */
const createMarkerIcon = (status: string) => {
  const color = status === "on_track" ? "#10B981" : status === "at_risk" || status === "attention" ? "#F59E0B" : "#EF4444";
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [20, 45],
    popupAnchor: [0, -45],
    html: `
      <div style="position:relative;cursor:pointer;">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:${color}20;animation:map-pulse 2.5s ease-out infinite;z-index:-1;"></div>
        <div style="background:#0F1B2D;color:white;border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(15,27,45,0.3);border:2px solid white;white-space:nowrap;">
          <span style="width:7px;height:7px;border-radius:50%;background:${color};"></span>
          PIN
        </div>
        <div style="width:0;margin:0 auto;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #0F1B2D;"></div>
      </div>
    `,
  });
};

/* ═══ Map flyTo helper ═══ */
const MapFlyTo = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
};

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
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [mapTarget, setMapTarget] = useState<{ center: [number, number]; zoom: number }>({ center: [27.8, -82.65], zoom: 11 });

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
        const [sovRes, issuesRes, docsRes, drawsRes, reportsRes, milestonesRes, financialsRes, photosRes] = await Promise.all([
          supabase.from("sov_lines").select("budget, progress_pct, real_cost").eq("project_id", p.id),
          supabase.from("issues").select("id, status, title, opened_at").eq("project_id", p.id).eq("status", "open"),
          supabase.from("project_documents").select("id, status, expiration_date, name").eq("project_id", p.id),
          supabase.from("draws").select("id, status").eq("project_id", p.id),
          supabase.from("weekly_reports").select("id").eq("project_id", p.id),
          supabase.from("milestones").select("id, name, phase, sequence, status, baseline_start, baseline_end, actual_end").eq("project_id", p.id).order("sequence"),
          supabase.from("project_financials").select("arv_current, loan_amount, equity_invested").eq("project_id", p.id).maybeSingle(),
          supabase.from("visit_photos").select("id, photo_url, caption").eq("project_id", p.id).eq("visible_to_client", true).order("created_at", { ascending: false }).limit(6),
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

        const requiredDocs = ["Lien Waiver", "Insurance Certificate", "Pay Application", "Progress Photos", "Inspection Report"];
        const docNames = docs.map(d => d.name?.toLowerCase() || "");
        const drawDocsData = requiredDocs.map(name => ({
          name,
          ready: docNames.some(dn => dn.includes(name.toLowerCase().split(" ")[0])),
        }));
        const drawReadinessPct = drawDocsData.length > 0 ? Math.round(drawDocsData.filter(d => d.ready).length / drawDocsData.length * 100) : 0;

        const loanAmt = p.loan_amount ?? 0;
        const budgetRemaining = loanAmt - totalRealCost;
        const arv = financialsRes.data?.arv_current || null;
        const ltc = arv && arv > 0 ? Math.round((loanAmt / arv) * 10000) / 100 : null;
        const equityProjected = arv && arv > 0 ? arv - loanAmt : null;

        const photos = (photosRes.data || []).map(ph => ({ id: ph.id, url: ph.photo_url, caption: ph.caption }));
        const issues = openIssues.map(i => ({ id: i.id, title: i.title, date: i.opened_at || "" }));

        enriched.push({
          ...p, budgetProgressPct, issuesOpen: openIssues.length, docsApproved,
          drawsCount: draws.length, drawsApproved, reportsCount: reportsRes.data?.length || 0,
          gcName: p.gc_name, lenderName: p.lender_name, totalRealCost, budgetRemaining, ltc, arv, equityProjected,
          photos, drawDocs: drawDocsData, drawReadinessPct, issues,
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

  const firstName = profileName?.split(" ")[0] || "";
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Map sync on accordion expand
  const handleToggleProject = (projectId: string) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      setMapTarget({ center: [27.8, -82.65], zoom: 11 });
    } else {
      setExpandedProject(projectId);
      const p = projects.find(pr => pr.id === projectId);
      if (p?.latitude && p?.longitude) {
        setMapTarget({ center: [Number(p.latitude), Number(p.longitude)], zoom: 14 });
      }
    }
  };

  const projectsWithCoords = projects.filter(p => p.latitude && p.longitude);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-0" style={{ background: "#F1F5F9" }}>
        {/* ═══ STICKY NAV DOTS ═══ */}
        <StickyNavDots activeSection={activeSection} />

        {/* ═══ HERO ═══ */}
        <div id="section-hero" className="mb-9">
          <HeroBanner
            firstName={firstName}
            greeting={greeting}
            coText={coText}
            daysRemaining={daysRemaining}
            avgProgress={avgProgress}
            totalLoan={totalLoan}
            lenderName={firstProject?.lenderName}
          />
        </div>

        {/* ═══ KPIs ═══ */}
        <div id="section-kpis" className="mb-9">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[16px] font-bold" style={{ color: "#0F1B2D" }}>Resumen Financiero</p>
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

        {/* ═══ MAP ═══ */}
        <div id="section-map" className="mb-9">
          <RevealSection>
            <div
              className="relative rounded-[20px] overflow-hidden border border-[#E8EEF4]"
              style={{ height: 420, boxShadow: "0 4px 16px rgba(15,27,45,0.08)" }}
            >
              {/* Project count pill */}
              <div
                className="absolute top-4 left-4 z-[1000] flex items-center gap-2 rounded-full px-3.5 py-2"
                style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}
              >
                <MapPin className="h-3.5 w-3.5" style={{ color: "#0D7377" }} />
                <span className="text-[12px] font-medium" style={{ color: "#0F1B2D" }}>
                  📍 {projectsWithCoords.length} proyecto{projectsWithCoords.length !== 1 ? "s" : ""} activo{projectsWithCoords.length !== 1 ? "s" : ""} en Pinellas
                </span>
              </div>

              <MapContainer
                center={[27.8, -82.65]}
                zoom={11}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution=""
                />
                <MapFlyTo center={mapTarget.center} zoom={mapTarget.zoom} />
                {projectsWithCoords.map(p => (
                  <Marker
                    key={p.id}
                    position={[Number(p.latitude), Number(p.longitude)]}
                    icon={createMarkerIcon(p.status || "on_track")}
                    eventHandlers={{
                      click: () => handleToggleProject(p.id),
                    }}
                  >
                    <Popup>
                      <MapInfoWindow project={p} navigate={navigate} />
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </RevealSection>
        </div>

        {/* ═══ ACCORDION PROJECT LIST ═══ */}
        <div id="section-projects" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold" style={{ color: "#0F1B2D" }}>Mis Proyectos</h2>
            <span
              className="text-[12px] font-medium rounded-full px-2.5 py-1"
              style={{ color: "#0D7377", background: "rgba(13,115,119,0.08)" }}
            >
              {projects.length} en ejecución
            </span>
          </div>
          <div className="space-y-2">
            {projects.map((p, i) => (
              <RevealSection key={p.id} delay={i * 100}>
                <AccordionProjectRow
                  project={p}
                  isExpanded={expandedProject === p.id}
                  onToggle={() => handleToggleProject(p.id)}
                  navigate={navigate}
                />
              </RevealSection>
            ))}
          </div>
        </div>

        {/* ═══ ALERTS (slim) ═══ */}
        {alerts.length > 0 && (
          <div className="mt-8">
            <p className="text-[13px] text-muted-foreground mb-3 flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Alertas
            </p>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
            {alerts.length > 3 && (
              <button className="text-[12px] text-accent hover:underline mt-2 font-medium">+ Ver todas</button>
            )}
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <div className="text-center py-8 mt-6">
          <p className="text-[11px] text-muted-foreground">Powered by relatin.co · 360lateral OPR</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            {["🔒 Secure", "📊 Real-time", "✓ Verified"].map(badge => (
              <span key={badge} className="text-[10px] text-muted-foreground/60">{badge}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes map-pulse {
          0% { transform: translate(-50%,-50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
          100% { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
          border: none !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          min-width: 240px !important;
        }
        .leaflet-popup-tip {
          display: none !important;
        }
      `}</style>
    </TooltipProvider>
  );
};

/* ═══════════════════════════════════════════════
   MAP INFO WINDOW (popup content)
   ═══════════════════════════════════════════════ */
const MapInfoWindow = ({ project: p, navigate }: { project: ProjectEnriched; navigate: (path: string) => void }) => {
  const physPct = p.progress_pct ?? 0;
  const statusLabel = p.status === "on_track" ? "On Track" : p.status === "at_risk" || p.status === "attention" ? "En Riesgo" : "Retrasado";
  const statusColor = p.status === "on_track" ? "#10B981" : p.status === "at_risk" || p.status === "attention" ? "#F59E0B" : "#EF4444";
  const coText = p.co_target_date ? new Date(p.co_target_date).toLocaleDateString("es", { month: "short", year: "numeric" }) : "—";

  return (
    <div style={{ padding: 16, minWidth: 240 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#0F1B2D", marginBottom: 2 }}>{p.code}</p>
      <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>{p.address}</p>
      <div style={{ height: 1, background: "#F1F5F9", marginBottom: 10 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />
        <span style={{ fontSize: 11, color: statusColor, fontWeight: 500 }}>{statusLabel}</span>
      </div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
          <span style={{ color: "#9CA3AF" }}>Av. Físico</span>
          <span style={{ color: "#0F1B2D", fontWeight: 500 }}>{physPct}%</span>
        </div>
        <div style={{ height: 4, background: "#F1F5F9", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, width: `${Math.min(physPct, 100)}%`, background: "#0D7377" }} />
        </div>
      </div>
      <div style={{ fontSize: 10, display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#9CA3AF" }}>Loan</span>
          <span style={{ color: "#0F1B2D", fontWeight: 500 }}>{fmt(p.loan_amount)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#9CA3AF" }}>CO Target</span>
          <span style={{ color: "#0F1B2D", fontWeight: 500 }}>{coText}</span>
        </div>
      </div>
      <button
        onClick={() => navigate(`/portal/proyecto/${p.id}`)}
        style={{
          width: "100%", padding: "8px 0", background: "#0F1B2D", color: "white",
          borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#0D7377")}
        onMouseLeave={e => (e.currentTarget.style.background = "#0F1B2D")}
      >
        Ver proyecto completo →
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   ACCORDION PROJECT ROW
   ═══════════════════════════════════════════════ */
const STATUS_DOT: Record<string, { color: string; label: string }> = {
  on_track: { color: "#10B981", label: "On Track" },
  at_risk: { color: "#F59E0B", label: "En Riesgo" },
  attention: { color: "#F59E0B", label: "En Riesgo" },
  delayed: { color: "#EF4444", label: "Retrasado" },
  critical: { color: "#EF4444", label: "Retrasado" },
};

const AccordionProjectRow = ({
  project: p, isExpanded, onToggle, navigate,
}: {
  project: ProjectEnriched; isExpanded: boolean;
  onToggle: () => void; navigate: (path: string) => void;
}) => {
  const status = STATUS_DOT[p.status ?? "on_track"] || STATUS_DOT.on_track;
  const physPct = p.progress_pct ?? 0;
  const coText = p.co_target_date
    ? new Date(p.co_target_date).toLocaleDateString("es", { month: "short", year: "numeric" })
    : "—";
  const coDate = p.co_target_date ? new Date(p.co_target_date) : null;
  const daysRemaining = coDate ? Math.ceil((coDate.getTime() - Date.now()) / 86400000) : null;

  let lastVisitText = "—";
  if (p.last_visit_date) {
    const days = Math.ceil((Date.now() - new Date(p.last_visit_date).getTime()) / 86400000);
    lastVisitText = days === 0 ? "Hoy" : days === 1 ? "Hace 1 día" : `Hace ${days} días`;
  }

  const circumference = 2 * Math.PI * 32;
  const dashOffset = circumference - (physPct / 100) * circumference;

  const readyCount = p.drawDocs.filter(d => d.ready).length;

  return (
    <div
      className="rounded-[16px] border overflow-hidden transition-all duration-200"
      style={{
        background: "white",
        borderColor: isExpanded ? "rgba(13,115,119,0.3)" : "#E8EEF4",
        boxShadow: isExpanded ? "0 4px 16px rgba(15,27,45,0.09)" : "0 2px 8px rgba(15,27,45,0.05)",
      }}
    >
      {/* Collapsed header */}
      <div
        className="flex items-center px-5 cursor-pointer transition-colors duration-150 hover:bg-muted/30"
        style={{ height: 64 }}
        onClick={onToggle}
      >
        {/* Left group */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: status.color }}
          />
          <span
            className="text-[12px] font-bold rounded-md px-2 py-0.5 flex-shrink-0"
            style={{ color: "#0F1B2D", background: "#F8FAFC" }}
          >
            {p.code}
          </span>
          <span
            className="text-[13px] truncate"
            style={{ color: "#0F1B2D", maxWidth: 260 }}
          >
            {p.address}
          </span>
        </div>

        {/* Right group — pills + chevron */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-4">
          {[
            { label: "FÍSICO", value: `${physPct}%` },
            { label: "LOAN", value: totalLoan >= 1_000_000 ? `$${(p.loan_amount ? p.loan_amount / 1_000_000 : 0).toFixed(2)}M` : fmt(p.loan_amount) },
            { label: "CO", value: coText },
          ].map(pill => (
            <span
              key={pill.label}
              className="rounded-full px-2.5 py-1 text-center flex-shrink-0"
              style={{ background: "#F8FAFC" }}
            >
              <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{pill.label} </span>
              <span className="text-[11px] font-bold" style={{ color: "#0F1B2D" }}>{pill.value}</span>
            </span>
          ))}
        </div>

        <ChevronDown
          className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3 transition-transform duration-200"
          style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </div>

      {/* Expanded content */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isExpanded ? 500 : 0,
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="border-t border-[#F1F5F9] p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Column 1 — Location & Team */}
            <div>
              <div className="w-full h-[120px] rounded-xl overflow-hidden border border-border mb-3">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(p.address)}&output=embed`}
                  width="100%" height="120"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map ${p.code}`}
                />
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground">GC:</span>
                  <span style={{ color: "#0F1B2D" }}>{p.gcName || "—"}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground">Prestamista:</span>
                  <span style={{ color: "#0F1B2D" }}>{p.lenderName || "—"}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground">Permiso:</span>
                  <span style={{ color: "#0F1B2D" }}>{p.permit_no || "—"}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground">Última visita:</span>
                  <span style={{ color: "#0F1B2D" }}>{lastVisitText}</span>
                </div>
              </div>
            </div>

            {/* Column 2 — Financial KPIs */}
            <div className="space-y-3">
              <MiniMetric label="Loan Amount" value={fmt(p.loan_amount)} />
              <MiniMetric label="Costo Ejecutado" value={fmt(p.totalRealCost)} pct={p.budgetProgressPct} />
              <MiniMetric label="Budget Restante" value={fmt(p.budgetRemaining)} color="#16A34A" />
              <MiniMetric label="LTC" value={p.ltc !== null ? `${p.ltc}%` : "—"} />
            </div>

            {/* Column 3 — Progress & Status */}
            <div className="flex flex-col items-center">
              {/* Progress ring */}
              <div className="relative mb-2" style={{ width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke="#0D7377" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 40 40)"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[16px] font-bold" style={{ color: "#0F1B2D" }}>{physPct}%</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">Avance físico</p>

              <div className="text-center space-y-1">
                <p className="text-[11px]" style={{ color: "#0F1B2D" }}>CO Target: {coText}</p>
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                  <span className="text-[11px] font-medium" style={{ color: status.color }}>{status.label}</span>
                </div>
                {daysRemaining !== null && (
                  <p className="text-[10px] text-muted-foreground">{daysRemaining} días restantes</p>
                )}
              </div>

              {/* Timeline bar */}
              {p.created_at && coDate && (
                <div className="w-full mt-3">
                  <TimelineBar startDate={new Date(p.created_at)} endDate={coDate} />
                </div>
              )}
            </div>
          </div>

          {/* Bottom action row */}
          <div className="border-t border-[#F1F5F9] pt-3.5 mt-4 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              📄 {p.docsApproved} docs · 💰 {p.drawsCount} draws · ⚠️ {p.issuesOpen} issue{p.issuesOpen !== 1 ? "s" : ""}
            </span>
            <button
              className="text-[13px] font-semibold text-white rounded-[10px] px-5 py-2.5 transition-colors duration-200"
              style={{ background: "#0F1B2D" }}
              onClick={(e) => { e.stopPropagation(); navigate(`/portal/proyecto/${p.id}`); }}
              onMouseEnter={e => (e.currentTarget.style.background = "#0D7377")}
              onMouseLeave={e => (e.currentTarget.style.background = "#0F1B2D")}
            >
              Ver proyecto completo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ Mini Metric row for accordion ═══ */
const MiniMetric = ({ label, value, pct, color }: { label: string; value: string; pct?: number; color?: string }) => (
  <div>
    <div className="flex justify-between items-baseline text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" style={{ color: color || "#0F1B2D" }}>{value}</span>
    </div>
    {pct !== undefined && (
      <div className="h-1 w-full bg-[#F1F5F9] rounded-full overflow-hidden mt-1">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: "linear-gradient(90deg, #0D7377, #10B981)" }} />
      </div>
    )}
  </div>
);

/* ═══ Timeline Bar ═══ */
const TimelineBar = ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
  const now = Date.now();
  const total = endDate.getTime() - startDate.getTime();
  const elapsed = now - startDate.getTime();
  const pct = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;

  return (
    <div className="relative">
      <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
        <span>Inicio</span>
        <span>CO</span>
      </div>
      <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full relative overflow-visible">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #0D7377, #10B981)" }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
          style={{ left: `${pct}%`, transform: `translateX(-50%) translateY(-50%)`, background: "#0D7377", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
        />
      </div>
      <p className="text-[8px] text-muted-foreground text-center mt-1">↑ hoy</p>
    </div>
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
   STICKY NAV DOTS
   ═══════════════════════════════════════════════ */
const StickyNavDots = ({ activeSection }: { activeSection: string }) => (
  <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex-col gap-3 hidden lg:flex">
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
   HERO BANNER — aerial photo
   ═══════════════════════════════════════════════ */
const HeroBanner = ({
  firstName, greeting, coText, daysRemaining, avgProgress, totalLoan, lenderName,
}: {
  firstName: string; greeting: string; coText: string;
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
    <div ref={ref} className="relative rounded-[24px] overflow-hidden" style={{ height: 380 }}>
      <div className="absolute inset-0" style={{
        backgroundImage: "url('/images/st-pete-aerial.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center 40%",
        backgroundRepeat: "no-repeat",
      }} />
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to right, rgba(10,20,35,0.82) 0%, rgba(10,20,35,0.60) 45%, rgba(10,20,35,0.20) 100%)",
      }} />
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
        height: 120,
        background: "linear-gradient(to top, rgba(10,20,35,0.55), transparent)",
      }} />
      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "40px 48px" }}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[14px] text-white/60 mb-2">{greeting}, {firstName} 👋</p>
            <h1 className="text-[44px] font-extrabold text-white leading-none" style={{ letterSpacing: "-1.5px" }}>
              Mi Portafolio
            </h1>
            <p className="text-[44px] font-extrabold leading-none mt-1" style={{ letterSpacing: "-1.5px", color: "rgba(13,115,119,0.9)" }}>
              Inversión inmobiliaria en
            </p>
            <span className="inline-flex items-center gap-1 text-white/75 text-[12px] rounded-full px-3.5 py-1.5 mt-4" style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(4px)",
            }}>
              📍 St. Petersburg · Pinellas County, FL
            </span>
          </div>
          <div className="flex flex-col items-end" style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: "10px 16px",
            backdropFilter: "blur(8px)",
          }}>
            <span className="text-[10px] text-white/50">Supervisado por</span>
            <span className="text-[13px] text-white font-semibold flex items-center gap-1">
              360lateral <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
            </span>
          </div>
        </div>
        <div className="flex justify-between items-end">
          <div className="inline-flex items-center gap-2 rounded-full" style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.35)",
            padding: "8px 16px",
            backdropFilter: "blur(8px)",
          }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#10B981", animation: "pulse-ring 2s infinite" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#10B981" }} />
            </span>
            <span className="text-[14px] font-semibold" style={{ color: "#10B981" }}>Live · Portfolio On Track</span>
          </div>
          <div className="flex gap-3">
            {[
              { label: "AV. FÍSICO", value: `${animatedProgress.toFixed(2)}%`, sub: "en progreso" },
              { label: "LOAN", value: formatShortMoney(animatedLoan), sub: lenderName || "—" },
              { label: "CO TARGET", value: coText === "—" ? "—" : coText.replace(". ", " '").replace("de ", "").slice(0, 8), sub: daysRemaining !== null ? "On Track ✓" : "—" },
            ].map((pill) => (
              <div key={pill.label} className="text-center" style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 16,
                padding: "14px 20px",
                backdropFilter: "blur(12px)",
              }}>
                <p className="text-[9px] uppercase tracking-[0.08em] text-white/50 mb-1">{pill.label}</p>
                <p className="text-[22px] font-bold text-white leading-none">{pill.value}</p>
                <p className="text-[10px] text-white/40 mt-1">{pill.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
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
  "Loan-to-Cost (LTC)": "Proporción del financiamiento sobre el costo total",
  "ARV (Est.)": "After Repair Value: valor estimado post-obra",
  "Equity Proyectado": "Diferencia proyectada entre ARV y monto del préstamo",
  "Costo / SF Estimado": "Costo estimado por pie cuadrado construido",
  "Draws Realizados": "Desembolsos aprobados por el prestamista",
};

const KPI_ACCENT: Record<string, string> = {
  "Av. Físico": "linear-gradient(90deg, #0D7377, #10B981)",
  "Av. Financiero": "linear-gradient(90deg, #0D7377, #10B981)",
  "CO Target": "#E07B39",
  "Issues": "#EF4444",
  "Loan Amount": "linear-gradient(90deg, #0F1B2D, #0D7377)",
  "Costo Real Ejecutado": "linear-gradient(90deg, #0F1B2D, #0D7377)",
  "Budget Restante": "linear-gradient(90deg, #0F1B2D, #0D7377)",
  "Loan-to-Cost (LTC)": "linear-gradient(90deg, #0F1B2D, #0D7377)",
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
  <div className="space-y-3.5">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <KpiCard label="Av. Físico" value={avgProgress} format="pct" sub="en progreso" progressPct={avgProgress} barTeal icon={BarChart3} />
      <KpiCard label="Av. Financiero" value={avgBudgetProgress} format="pct" sub="ejecutado" progressPct={avgBudgetProgress} icon={TrendingUp} />
      <KpiCard label="CO Target" value={daysRemaining ?? 0} format="days" displayValue={daysRemaining !== null ? `${daysRemaining} días` : "—"} sub={coText} secondarySub={daysRemaining !== null && daysRemaining > 0 ? "On Track ✓" : undefined} secondaryColor="text-emerald-600" icon={Target} />
      <KpiCard label="Issues" value={totalIssues} format="int" sub={totalIssues > 0 ? "⚠️ atender" : "sin pendientes"} isAlert={totalIssues > 0} icon={AlertTriangle} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <KpiCard label="Loan Amount" value={totalLoan} format="money" sub={lenderName || "—"} icon={Landmark} />
      <KpiCard label="Costo Real Ejecutado" value={totalRealCost} format="money" sub={`${realCostPctOfLoan}% del loan total`} icon={DollarSign} />
      <KpiCard label="Budget Restante" value={totalBudgetRemaining} format="money" sub="por ejecutar" icon={PiggyBank} />
      <KpiCard label="Loan-to-Cost (LTC)" value={aggLtc ?? 0} format="pct" displayValue={aggLtc !== null ? `${aggLtc}%` : "—"} sub={aggLtc !== null && aggLtc >= 100 ? "fully financed" : "por definir"} icon={Building2} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <KpiCard label="ARV (Est.)" value={aggArv ?? 0} format="money" displayValue={aggArv ? fmt(aggArv) : "—"} sub={aggArv ? "" : "por definir"} icon={TrendingUp} />
      <KpiCard label="Equity Proyectado" value={aggEquity ?? 0} format="money" displayValue={aggEquity ? fmt(aggEquity) : "—"} sub={aggEquity ? "" : "ARV - Loan"} icon={Building2} />
      <KpiCard label="Costo / SF Estimado" value={0} format="money" displayValue="—" sub="budget/sqft" icon={Ruler} />
      <KpiCard label="Draws Realizados" value={totalDrawsApproved} format="int" sub={`de ${totalDraws} totales`} icon={FileText} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════
   KPI CARD
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
  const accentBg = KPI_ACCENT[label] || "linear-gradient(90deg, #0F1B2D, #0D7377)";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={ref}
          className={`rounded-[20px] border relative overflow-hidden p-6 cursor-default group ${
            isAlert
              ? "bg-[#FFF5F5] border-l-[3px] border-l-destructive border-t-[#E8EEF4] border-r-[#E8EEF4] border-b-[#E8EEF4]"
              : "bg-white border-[#E8EEF4] hover:border-accent/25"
          }`}
          style={{
            boxShadow: "0 2px 8px rgba(15,27,45,0.06)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "all 500ms ease, transform 220ms cubic-bezier(0.4,0,0.2,1), box-shadow 220ms cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(15,27,45,0.12)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(15,27,45,0.06)";
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentBg }} />
          <div className="flex items-center gap-2 mb-1">
            {Icon && <Icon className="h-5 w-5 text-accent/60" />}
            <p className="text-[10px] uppercase tracking-[0.07em] text-muted-foreground font-medium">{label}</p>
          </div>
          <p className={`text-[32px] font-extrabold my-1.5 leading-none ${isAlert ? "text-destructive" : ""}`} style={!isAlert ? { color: "#0F1B2D" } : undefined}>{display}</p>
          {progressPct !== undefined && (
            <div className="h-1 w-full bg-[#F1F5F9] rounded-full overflow-hidden mt-2 mb-1">
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
   ALERT ROW
   ═══════════════════════════════════════════════ */
const ALERT_STYLES: Record<string, { border: string }> = {
  red: { border: "border-l-destructive" },
  orange: { border: "border-l-orange-500" },
  blue: { border: "border-l-blue-500" },
};

const AlertRow = ({ alert }: { alert: Alert }) => {
  const style = ALERT_STYLES[alert.type] || ALERT_STYLES.red;
  const relTime = alert.date ? getRelativeTime(alert.date) : "";

  return (
    <div className={`border-l-[3px] ${style.border} pl-3 pr-4 py-2.5 flex items-center gap-3`}>
      <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] truncate" style={{ color: "#0F1B2D" }}>{alert.text}</p>
        {alert.projectCode && <p className="text-[10px] text-muted-foreground">{alert.projectCode}</p>}
      </div>
      {relTime && <span className="text-[10px] text-muted-foreground flex-shrink-0">{relTime}</span>}
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
