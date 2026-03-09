import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, AlertTriangle, FileText, ExternalLink, Calendar, AlertCircle, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import SOVTable from "@/components/SOVTable";
import ProjectQuickLinks from "@/components/portal/ProjectQuickLinks";
import ProjectMapEmbed from "@/components/portal/ProjectMapEmbed";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  PROJECT_STATUS_BADGE, DRAW_STATUS_BADGE,
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
      const [projRes, sovRes, cfRes, drawRes, docRes, issuesRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("sov_lines").select("*").eq("project_id", id).order("line_number"),
        supabase.from("cashflow").select("*").eq("project_id", id).order("week_order"),
        supabase.from("draws").select("*").eq("project_id", id).order("draw_number"),
        supabase.from("documents").select("*").eq("project_id", id).eq("visible_to_client", true),
        supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "open"),
      ]);
      setProject(projRes.data);
      setSovLines(sovRes.data ?? []);
      setCashflow(cfRes.data ?? []);
      setDraws(drawRes.data ?? []);
      setDocs(docRes.data ?? []);
      setIssuesCount(issuesRes.count ?? 0);
      setLoading(false);
    };
    load();
  }, [user, id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" /></div>;
  if (!project) return <p className="text-center text-gray-400 py-16">Proyecto no encontrado.</p>;

  const eacWarning = (project.eac ?? 0) > (project.loan_amount ?? 0);
  const budgetProgressSum = sovLines.reduce((s, l) => s + (l.budget_progress_pct ?? 0), 0);
  const statusBadge = PROJECT_STATUS_BADGE[project.status ?? "on_track"] || PROJECT_STATUS_BADGE.on_track;

  const docsByCategory = docs.reduce<Record<string, Document[]>>((acc, d) => {
    const cat = d.category ?? "General";
    (acc[cat] ??= []).push(d);
    return acc;
  }, {});

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

            {/* KPIs with dividers */}
            <div className="flex items-center divide-x divide-white/15">
              {[
                { l: "Av. Físico", v: `${project.progress_pct ?? 0}%` },
                { l: "Av. Presupuesto", v: `${Math.round(budgetProgressSum)}%`, c: "text-orange-400" },
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

            {/* Progress bars */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`${KPI_LABEL} mb-1`}>Avance Físico</p>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${progressFisicoColor}`} style={{ width: `${Math.min(project.progress_pct ?? 0, 100)}%` }} />
                </div>
              </div>
              <div>
                <p className={`${KPI_LABEL} mb-1`}>Avance Presupuesto</p>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${progressPresupuestoColor(budgetProgressSum)}`} style={{ width: `${Math.min(budgetProgressSum, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className={`${KPI_LABEL} mb-1.5`}>Enlaces del Proyecto</p>
              <ProjectQuickLinks projectId={project.id} />
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-4">
            <ProjectMapEmbed address={project.address} />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-400 mb-1"><Calendar className="h-3 w-3" /> Última Visita</div>
                <p className="text-[13px] font-medium">{project.last_visit_date ?? "—"}</p>
              </div>
              <div className={`rounded-lg p-3 ${issuesCount > 0 ? "bg-red-500/20" : "bg-white/10"}`}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-400 mb-1"><AlertCircle className="h-3 w-3" /> Issues</div>
                <p className={`text-[13px] font-bold ${issuesCount > 0 ? "text-red-300" : ""}`}>{issuesCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sov">
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="sov" className="text-[12px]">Avance SOV</TabsTrigger>
          {permissions.view_financials && <TabsTrigger value="financiero" className="text-[12px]">Financiero</TabsTrigger>}
          {permissions.view_draws && <TabsTrigger value="draws" className="text-[12px]">Draws</TabsTrigger>}
          <TabsTrigger value="documentos" className="text-[12px]">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="sov">
          <SOVTable projectId={project.id} canEdit={false} showUpload={false} showExport={false} />
        </TabsContent>

        <TabsContent value="financiero">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h3 className="text-[14px] font-bold text-[#0F1B2D] mb-4">Resumen Financiero</h3>
              <div className="space-y-3">
                {[
                  { l: "Loan Amount", v: fmt(project.loan_amount) },
                  { l: "Ejecutado (EAC)", v: fmt(project.eac), c: eacWarning ? "text-orange-500 font-bold" : "" },
                  { l: "Disponible", v: fmt((project.loan_amount ?? 0) - (project.eac ?? 0)) },
                  { l: "CO Target Date", v: project.co_target_date ?? "—" },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between"><span className="text-[12px] text-gray-400">{r.l}</span><span className={`text-[12px] font-medium ${r.c || ""}`}>{r.v}</span></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <h3 className="text-[14px] font-bold text-[#0F1B2D] p-5 pb-2">Cashflow</h3>
              <table className="w-full text-[12px] border-collapse">
                <thead><tr>
                  <th className={TH_CLASS}>Semana</th>
                  <th className={`${TH_CLASS} text-right`}>Ingresos</th>
                  <th className={`${TH_CLASS} text-right`}>Egresos</th>
                  <th className={`${TH_CLASS} text-right`}>Balance</th>
                </tr></thead>
                <tbody>
                  {cashflow.map((c, idx) => (
                    <tr key={c.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                      <td className={TD_CLASS}>{c.week_label}</td>
                      <td className={`${TD_CLASS} text-right text-green-600 font-mono`}>{fmt(c.inflows)}</td>
                      <td className={`${TD_CLASS} text-right text-red-500 font-mono`}>{fmt(c.outflows)}</td>
                      <td className={`${TD_CLASS} text-right font-mono flex items-center justify-end gap-1`}>
                        {(c.balance ?? 0) < 10000 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                        {fmt(c.balance)}
                      </td>
                    </tr>
                  ))}
                  {cashflow.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8 text-[12px]">Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="draws">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-[12px] border-collapse">
              <thead><tr>
                <th className={`${TH_CLASS} w-20`}>#</th>
                <th className={TH_CLASS}>Fecha</th>
                <th className={`${TH_CLASS} text-right`}>Monto Certificado</th>
                <th className={TH_CLASS}>Estado</th>
                <th className={TH_CLASS}>Certificado</th>
              </tr></thead>
              <tbody>
                {draws.map((d, idx) => {
                  const st = DRAW_STATUS_BADGE[d.status ?? "pending"] || DRAW_STATUS_BADGE.pending;
                  return (
                    <tr key={d.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                      <td className={`${TD_CLASS} font-mono`}>{d.draw_number}</td>
                      <td className={TD_CLASS}>{d.request_date}</td>
                      <td className={`${TD_CLASS} text-right font-mono`}>{fmt(d.amount_certified)}</td>
                      <td className={TD_CLASS}><Badge className={badgeClass(st.bg, st.text)}>{st.label}</Badge></td>
                      <td className={TD_CLASS}>
                        {d.status === "paid" && d.certificate_url ? (
                          <a href={d.certificate_url} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Ver</a>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
                {draws.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8 text-[12px]">Sin draws</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="documentos">
          {Object.keys(docsByCategory).length === 0 ? (
            <p className="text-gray-400 text-[12px] py-8 text-center">Sin documentos disponibles.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(docsByCategory).map(([cat, items]) => (
                <div key={cat} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                  <h3 className="text-[14px] font-bold text-[#0F1B2D] mb-3">{cat}</h3>
                  <div className="divide-y divide-gray-100">
                    {items.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /><span className="text-[12px]">{doc.name}</span></div>
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1">Ver PDF <ExternalLink className="h-3 w-3" /></a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
