import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, AlertCircle } from "lucide-react";
import SOVTable from "@/components/SOVTable";
import GCFeeAnalysis from "@/components/GCFeeAnalysis";
import ProjectQuickLinks from "@/components/portal/ProjectQuickLinks";
import ProjectMapEmbed from "@/components/portal/ProjectMapEmbed";
import CronogramaClient from "@/components/portal/CronogramaClient";
import RisksClient from "@/components/portal/RisksClient";
import DocumentsClient from "@/components/portal/DocumentsClient";
import OnboardingClient from "@/components/portal/OnboardingClient";
import PermitsClient from "@/components/portal/PermitsClient";
import FinancieroClient from "@/components/portal/FinancieroClient";
import CalidadClient from "@/components/portal/CalidadClient";
import IssuesClient from "@/components/portal/IssuesClient";
import DrawsClientView from "@/components/portal/DrawsClientView";
import InvoicesClient from "@/components/portal/InvoicesClient";
import ReconciliationClient from "@/components/portal/ReconciliationClient";
import ProjectTabs from "@/components/ProjectTabs";
import type { SuperTab } from "@/components/ProjectTabs";
import type { Tables } from "@/integrations/supabase/types";
import {
  PROJECT_STATUS_BADGE,
  badgeClass, fmt, progressFisicoColor, progressPresupuestoColor,
  KPI_VALUE, KPI_LABEL,
} from "@/lib/design-system";

type Project = Tables<"projects">;
type SovLine = Tables<"sov_lines">;
type CashflowRow = Tables<"cashflow">;
type Draw = Tables<"draws">;
type Document = Tables<"documents">;

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { permissions } = useProjectPermissions(id);
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [sovLines, setSovLines] = useState<SovLine[]>([]);
  const [cashflow, setCashflow] = useState<CashflowRow[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [issuesCount, setIssuesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      setLoading(true);
      const [projRes, sovRes, cfRes, drawRes, docRes, issuesRes, lastVisitRes, qIssuesRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("sov_lines").select("*").eq("project_id", id).order("line_number"),
        supabase.from("cashflow").select("*").eq("project_id", id).order("week_order"),
        supabase.from("draws").select("*").eq("project_id", id).order("draw_number"),
        supabase.from("documents").select("*").eq("project_id", id).eq("visible_to_client", true),
        supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "open"),
        supabase.from("field_visits").select("visit_date").eq("project_id", id).order("visit_date", { ascending: false }).limit(1),
        supabase.from("quality_issues").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "open"),
      ]);
      setProject(projRes.data);
      setSovLines(sovRes.data ?? []);
      setCashflow(cfRes.data ?? []);
      setDraws(drawRes.data ?? []);
      setDocs(docRes.data ?? []);
      const totalIssues = (issuesRes.count ?? 0) + (qIssuesRes.count ?? 0);
      setIssuesCount(totalIssues);
      if (projRes.data && lastVisitRes.data?.[0]?.visit_date) {
        setProject({ ...projRes.data, last_visit_date: lastVisitRes.data[0].visit_date });
      }
      setLoading(false);
    };
    load();
  }, [user, id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" /></div>;
  if (!project) return <p className="text-center text-gray-400 py-16">Proyecto no encontrado.</p>;

  const eacWarning = (project.eac ?? 0) > (project.loan_amount ?? 0);
  const linesWithBudget = sovLines.filter(l => (l.budget ?? 0) > 0);
  const totalBudget = linesWithBudget.reduce((s, l) => s + (l.budget ?? 0), 0);
  const avanceFisico = totalBudget > 0
    ? Math.round(linesWithBudget.reduce((s, l) => s + ((l.progress_pct ?? 0) * (l.budget ?? 0)), 0) / totalBudget * 100) / 100
    : (project.progress_pct ?? 0);
  const avancePresupuesto = totalBudget > 0
    ? Math.round(linesWithBudget.reduce((s, l) => s + ((l.real_cost ?? 0) * ((l.progress_pct ?? 0) / 100)), 0) / totalBudget * 100 * 100) / 100
    : 0;
  const statusBadge = PROJECT_STATUS_BADGE[project.status ?? "on_track"] || PROJECT_STATUS_BADGE.on_track;

  const formatVisitDate = (d: string | null | undefined) => {
    if (!d) return "Sin visitas registradas";
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    if (diffDays <= 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  };

  const superTabs: SuperTab[] = [
    {
      key: "docs",
      icon: "📁",
      label: "Documentación",
      subTabs: [
        { key: "onboarding", label: "Onboarding", content: <OnboardingClient projectId={project.id} /> },
        { key: "documentos", label: "Documentos", content: <DocumentsClient projectId={project.id} /> },
      ],
    },
    {
      key: "control",
      icon: "🏗️",
      label: "Control de Proyecto",
      subTabs: [
        {
          key: "sov",
          label: "Avance SOV",
          content: (
            <>
              <SOVTable projectId={project.id} canEdit={false} showUpload={false} showExport={false} gcFeePct={(project as any).gc_construction_fee_pct ?? 0} />
              <GCFeeAnalysis sovLines={sovLines} feePct={(project as any).gc_construction_fee_pct ?? 0} />
            </>
          ),
        },
        { key: "cronograma", label: "Cronograma", content: <CronogramaClient projectId={project.id} /> },
        { key: "riesgos", label: "Riesgos", content: <RisksClient projectId={project.id} /> },
        { key: "permisos", label: "Permisos", content: <PermitsClient projectId={project.id} /> },
        { key: "calidad", label: "Calidad", content: <CalidadClient projectId={project.id} /> },
      ],
    },
    {
      key: "financiero",
      icon: "💰",
      label: "Financiero",
      subTabs: [
        { key: "modelo", label: "Financiero", content: <FinancieroClient projectId={project.id} />, hidden: !permissions.view_financials },
        { key: "draws", label: "Draws", content: <DrawsClientView projectId={project.id} draws={draws} />, hidden: !permissions.view_draws },
        { key: "invoices", label: "Invoices", content: <InvoicesClient projectId={project.id} /> },
        { key: "reconciliacion", label: "Reconciliación", content: <ReconciliationClient projectId={project.id} /> },
      ],
    },
    {
      key: "issues",
      icon: "⚠️",
      label: "Issues",
      badge: issuesCount > 0 ? { color: "red" as const, label: String(issuesCount) } : undefined,
      content: <IssuesClient projectId={project.id} />,
    },
  ];

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate("/portal")} className="text-gray-400 text-[12px]">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>

      {/* Header */}
      <div className="rounded-lg bg-[#0F1B2D] text-white p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#0D7377]">{project.code}</h1>
                <p className="text-white/70 text-[12px]">{project.address}</p>
                {project.gc_name && <p className="text-white/50 text-[11px] mt-1">GC: {project.gc_name}</p>}
              </div>
              <Badge className={badgeClass(statusBadge.bg, statusBadge.text)}>{statusBadge.label}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {(project.liens_count ?? 0) > 0 && <Badge className="bg-[#FEE2E2] text-[#991B1B] border-0 text-[11px]">{project.liens_count} Liens</Badge>}
            </div>

            <div className="flex items-center divide-x divide-white/15">
              {[
                { l: "Av. Físico", v: `${avanceFisico}%` },
                { l: "Av. Presupuesto", v: `${Math.round(avancePresupuesto)}%`, c: "text-orange-400" },
                { l: "Loan Amount", v: fmt(project.loan_amount) },
                { l: "EAC", v: fmt(project.eac), c: eacWarning ? "text-orange-400" : "" },
                { l: "CO Target", v: project.co_target_date ?? "—" },
              ].map((kpi, i) => (
                <div key={i} className="px-4 first:pl-0">
                  <p className={KPI_LABEL}>{kpi.l}</p>
                  <p className={`${KPI_VALUE} ${kpi.c || ""}`}>{kpi.v}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`${KPI_LABEL} mb-1`}>Avance Físico</p>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${progressFisicoColor}`} style={{ width: `${Math.min(avanceFisico, 100)}%` }} />
                </div>
              </div>
              <div>
                <p className={`${KPI_LABEL} mb-1`}>Avance Presupuesto</p>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${progressPresupuestoColor(avancePresupuesto)}`} style={{ width: `${Math.min(avancePresupuesto, 100)}%` }} />
                </div>
              </div>
            </div>

            <div>
              <p className={`${KPI_LABEL} mb-1.5`}>Enlaces del Proyecto</p>
              <ProjectQuickLinks projectId={project.id} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <ProjectMapEmbed address={project.address} />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-400 mb-1"><Calendar className="h-3 w-3" /> Última Visita</div>
                <p className="text-[13px] font-medium">{formatVisitDate(project.last_visit_date)}</p>
              </div>
              <div className={`rounded-lg p-3 ${issuesCount > 0 ? "bg-red-500/20" : "bg-white/10"}`}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-400 mb-1"><AlertCircle className="h-3 w-3" /> Issues</div>
                <p className={`text-[13px] font-bold ${issuesCount > 0 ? "text-red-300" : ""}`}>{issuesCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Super-Tabs */}
      <ProjectTabs
        defaultSuperTab="control"
        defaultSubTab="sov"
        tabs={superTabs}
      />
    </div>
  );
};

export default ProjectDetail;
