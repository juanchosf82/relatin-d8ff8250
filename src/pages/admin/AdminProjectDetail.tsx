import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, AlertCircle, ExternalLink, Plus,
  Pencil, Trash2,
} from "lucide-react";
import ProjectMapEmbed from "@/components/portal/ProjectMapEmbed";
import CronogramaAdmin from "@/components/admin/CronogramaAdmin";
import RisksAdmin from "@/components/admin/RisksAdmin";
import DocumentsAdmin from "@/components/admin/DocumentsAdmin";
import OnboardingAdmin from "@/components/admin/OnboardingAdmin";
import PermitsAdmin from "@/components/admin/PermitsAdmin";
import FinancieroAdmin from "@/components/admin/FinancieroAdmin";
import { sendNotification, getClientInfoForProject } from "@/lib/notifications";
import type { Tables } from "@/integrations/supabase/types";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  PROJECT_STATUS_BADGE, DRAW_STATUS_BADGE, ISSUE_LEVEL_BADGE,
  badgeClass, fmt, progressFisicoColor, progressPresupuestoColor,
  KPI_VALUE, KPI_LABEL, PAGE_TITLE,
  BTN_SUCCESS, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER,
} from "@/lib/design-system";

type Project = Tables<"projects">;
type SovLine = Tables<"sov_lines">;
type Draw = Tables<"draws">;
type Document = Tables<"documents">;
type Issue = Tables<"issues">;
type ProjectLink = Tables<"project_links">;

const STATUS_OPTIONS = [
  { value: "on_track", label: "On Track" },
  { value: "attention", label: "Atención" },
  { value: "critical", label: "Crítico" },
];

const ICON_OPTIONS = ["📷", "📐", "📋", "🏛️", "📊", "📁", "🔗", "📍", "💰", "⚠️", "🎥", "📧"];
const COLOR_PRESETS = [
  { value: "0D7377", label: "Teal" },
  { value: "0F1B2D", label: "Navy" },
  { value: "EA580C", label: "Orange" },
  { value: "16A34A", label: "Green" },
  { value: "7C3AED", label: "Purple" },
  { value: "DC2626", label: "Red" },
];

const DEFAULT_LINKS = [
  { icon: "📷", label: "Fotos de Campo" },
  { icon: "📐", label: "Planos" },
  { icon: "📋", label: "Contrato" },
  { icon: "🏛️", label: "Permiso" },
  { icon: "📊", label: "Sheets" },
];

const AdminProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [sovLines, setSovLines] = useState<SovLine[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ProjectLink | null>(null);
  const [linkForm, setLinkForm] = useState({ label: "", url: "", icon: "🔗", color: "0D7377" });

  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ level: "MEDIO", description: "" });
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");



  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    const [projRes, sovRes, drawRes, docRes, issueRes, linkRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("sov_lines").select("*").eq("project_id", id).order("line_number"),
      supabase.from("draws").select("*").eq("project_id", id).order("draw_number"),
      supabase.from("documents").select("*").eq("project_id", id).order("uploaded_at", { ascending: false }),
      supabase.from("issues").select("*").eq("project_id", id).order("opened_at", { ascending: false }),
      supabase.from("project_links").select("*").eq("project_id", id).order("sort_order"),
    ]);
    setProject(projRes.data);
    setSovLines(sovRes.data ?? []);
    setDraws(drawRes.data ?? []);
    setDocs(docRes.data ?? []);
    setIssues(issueRes.data ?? []);
    setLinks((linkRes.data ?? []) as ProjectLink[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    await supabase.from("projects").update({ status: newStatus }).eq("id", id);
    setProject((p) => (p ? { ...p, status: newStatus } : p));
    toast.success("Estado actualizado");
  };

  const budgetProgressSum = sovLines.reduce((a, c) => a + (c.budget_progress_pct ?? 0), 0);
  const openIssues = issues.filter((i) => i.status === "open").length;

  // Links CRUD
  const openAddLink = (preset?: { icon: string; label: string }) => {
    setEditingLink(null);
    setLinkForm({ label: preset?.label || "", url: "", icon: preset?.icon || "🔗", color: "0D7377" });
    setLinkFormOpen(true);
  };
  const openEditLink = (link: ProjectLink) => {
    setEditingLink(link);
    setLinkForm({ label: link.label, url: link.url, icon: link.icon, color: link.color || "0D7377" });
    setLinkFormOpen(true);
  };
  const saveLink = async () => {
    if (!linkForm.label || !linkForm.url) return;
    if (editingLink) {
      await supabase.from("project_links").update({ label: linkForm.label, url: linkForm.url, icon: linkForm.icon, color: linkForm.color }).eq("id", editingLink.id);
      toast.success("Enlace actualizado");
    } else {
      await supabase.from("project_links").insert([{ project_id: id, label: linkForm.label, url: linkForm.url, icon: linkForm.icon, color: linkForm.color, sort_order: links.length }]);
      toast.success("Enlace agregado");
    }
    setLinkFormOpen(false);
    fetchAll();
  };
  const deleteLink = async (linkId: string) => {
    await supabase.from("project_links").delete().eq("id", linkId);
    toast.success("Enlace eliminado");
    fetchAll();
  };

  // Issues CRUD
  const addIssue = async () => {
    if (!issueForm.description || !id) return;
    await supabase.from("issues").insert([{ project_id: id, level: issueForm.level, description: issueForm.description }]);
    toast.success("Issue creado");
    setIssueFormOpen(false);

    // Send notification for critical/high issues
    if (["CRÍTICO", "ALTO", "critical", "high"].includes(issueForm.level)) {
      const clientInfo = await getClientInfoForProject(id);
      if (clientInfo) {
        sendNotification({
          type: "project_issue",
          to: clientInfo.email,
          userId: clientInfo.userId,
          projectId: id,
          subject: `⚠️ Alerta ${issueForm.level} — ${clientInfo.projectCode}`,
          data: {
            client_name: clientInfo.clientName,
            project_code: clientInfo.projectCode,
            project_address: clientInfo.projectAddress,
            level: issueForm.level,
            description: issueForm.description,
            project_id: id,
          },
        });
      }
    }

    setIssueForm({ level: "MEDIO", description: "" });
    fetchAll();
  };
  const resolveIssue = async (issueId: string) => {
    await supabase.from("issues").update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_note: resolveNote }).eq("id", issueId);
    toast.success("Issue resuelto");
    setResolveId(null);
    setResolveNote("");
    fetchAll();
  };



  const handleDrawStatus = async (drawId: string, newStatus: string) => {
    const draw = draws.find((d) => d.id === drawId);
    await supabase.from("draws").update({ status: newStatus }).eq("id", drawId);
    toast.success("Estado actualizado");
    fetchAll();

    if (["review", "sent", "paid"].includes(newStatus) && id && draw) {
      const clientInfo = await getClientInfoForProject(id);
      if (clientInfo) {
        sendNotification({
          type: "draw_status_changed",
          to: clientInfo.email,
          userId: clientInfo.userId,
          projectId: id,
          subject: `Draw #${draw.draw_number} actualizado — ${clientInfo.projectCode}`,
          data: {
            client_name: clientInfo.clientName,
            project_code: clientInfo.projectCode,
            draw_number: String(draw.draw_number),
            amount: String(draw.amount_certified || draw.amount_requested || 0),
            status: newStatus,
            project_id: id,
          },
        });
      }
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" /></div>;
  if (!project) return <div className="flex h-screen items-center justify-center bg-white"><p className="text-gray-400">Proyecto no encontrado.</p></div>;

  const statusBadge = PROJECT_STATUS_BADGE[project.status ?? "on_track"] || PROJECT_STATUS_BADGE.on_track;

  return (
    <div className="flex h-screen bg-white">
      <aside className="w-14 bg-[#0F1B2D] flex flex-col items-center py-4 shrink-0">
        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <div className="rounded-lg bg-[#0F1B2D] text-white p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-[#0D7377]">{project.code}</h1>
                    <p className="text-white/70 text-[12px]">{project.address}</p>
                  </div>
                  <Select value={project.status || "on_track"} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[130px] h-8 text-[11px] bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[12px]">
                  <div><span className={KPI_LABEL}>GC:</span> <span className="text-white/80 ml-1">{project.gc_name || "—"}</span></div>
                  <div><span className={KPI_LABEL}>Licencia:</span> <span className="text-white/80 ml-1">{project.gc_license || "—"}</span></div>
                  <div><span className={KPI_LABEL}>Prestamista:</span> <span className="text-white/80 ml-1">{project.lender_name || "—"}</span></div>
                  <div><span className={KPI_LABEL}>Préstamo:</span> <span className="text-white/80 ml-1">{fmt(project.loan_amount)}</span></div>
                  <div><span className={KPI_LABEL}>Permiso:</span> <span className="text-white/80 ml-1">{project.permit_no || "—"}</span></div>
                  <div><span className={KPI_LABEL}>CO Target:</span> <span className="text-white/80 ml-1">{project.co_target_date || "—"}</span></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={badgeClass(statusBadge.bg, statusBadge.text)}>{statusBadge.label}</Badge>
                  {(project.liens_count ?? 0) > 0 && <Badge className="bg-[#FEE2E2] text-[#991B1B] border-0 text-[11px]">{project.liens_count} Liens</Badge>}
                </div>

                {/* KPIs with dividers */}
                <div className="flex items-center divide-x divide-white/15">
                  {[
                    { l: "Av. Físico", v: `${project.progress_pct ?? 0}%` },
                    { l: "Av. Presupuesto", v: `${Math.round(budgetProgressSum)}%`, c: "text-orange-400" },
                    { l: "Loan Amount", v: fmt(project.loan_amount) },
                    { l: "EAC", v: fmt(project.eac) },
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
              </div>

              <div className="lg:col-span-2 space-y-4">
                <ProjectMapEmbed address={project.address} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-400 mb-1"><Calendar className="h-3 w-3" /> Última Visita</div>
                    <p className="text-[13px] font-medium">{project.last_visit_date ?? "—"}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${openIssues > 0 ? "bg-red-500/20" : "bg-white/10"}`}>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-400 mb-1"><AlertCircle className="h-3 w-3" /> Issues</div>
                    <p className={`text-[13px] font-bold ${openIssues > 0 ? "text-red-300" : ""}`}>{openIssues}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enlaces */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-[#0F1B2D]">Enlaces del Proyecto</h3>
              <Button size="sm" className={`h-7 ${BTN_SUCCESS}`} onClick={() => openAddLink()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar enlace
              </Button>
            </div>
            {links.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {links.map((link) => (
                  <div key={link.id} className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-[12px] cursor-pointer hover:shadow-sm transition-shadow" style={{ borderColor: `#${link.color || "0D7377"}` }}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                      <span className="text-base">{link.icon}</span>
                      <span className="font-medium text-[#0F1B2D]">{link.label}</span>
                    </a>
                    <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                      <button onClick={() => openEditLink(link)} className="p-0.5 rounded hover:bg-gray-100"><Pencil className="h-3 w-3 text-gray-400" /></button>
                      <button onClick={() => deleteLink(link.id)} className="p-0.5 rounded hover:bg-red-50"><Trash2 className="h-3 w-3 text-red-400" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-400">Sin enlaces. Agrega rápido:</p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LINKS.map((dl) => (
                    <button key={dl.label} onClick={() => openAddLink(dl)} className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-gray-300 text-[11px] text-gray-500 hover:bg-gray-50">{dl.icon} {dl.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Link form dialog */}
          <Dialog open={linkFormOpen} onOpenChange={setLinkFormOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editingLink ? "Editar Enlace" : "Agregar Enlace"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {ICON_OPTIONS.map((icon) => (
                    <button key={icon} type="button" onClick={() => setLinkForm({ ...linkForm, icon })} className={`text-xl p-1 rounded ${linkForm.icon === icon ? "bg-[#E8F4F4] ring-2 ring-[#0D7377]" : "hover:bg-gray-100"}`}>{icon}</button>
                  ))}
                </div>
                <div className="space-y-1"><Label className="text-[11px] text-gray-400">Label</Label><Input value={linkForm.label} onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })} placeholder="Fotos de Campo" /></div>
                <div className="space-y-1"><Label className="text-[11px] text-gray-400">URL</Label><Input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://..." /></div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Color</Label>
                  <div className="flex gap-2">{COLOR_PRESETS.map((c) => (
                    <button key={c.value} type="button" onClick={() => setLinkForm({ ...linkForm, color: c.value })} className={`w-7 h-7 rounded-full border-2 ${linkForm.color === c.value ? "border-gray-800 ring-2 ring-offset-1 ring-gray-400" : "border-transparent"}`} style={{ backgroundColor: `#${c.value}` }} title={c.label} />
                  ))}</div>
                </div>
                <Button onClick={saveLink} disabled={!linkForm.label || !linkForm.url} className={`w-full ${BTN_SUCCESS}`}>{editingLink ? "Actualizar" : "Guardar"}</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Tabs */}
          <Tabs defaultValue="onboarding">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="onboarding" className="text-[12px]">Onboarding</TabsTrigger>
              <TabsTrigger value="sov" className="text-[12px]">Avance SOV</TabsTrigger>
              <TabsTrigger value="cronograma" className="text-[12px]">Cronograma</TabsTrigger>
              <TabsTrigger value="riesgos" className="text-[12px]">Riesgos</TabsTrigger>
              <TabsTrigger value="draws" className="text-[12px]">Draws</TabsTrigger>
              <TabsTrigger value="reportes" className="text-[12px]">Reportes</TabsTrigger>
              <TabsTrigger value="documentos" className="text-[12px]">Documentos</TabsTrigger>
              <TabsTrigger value="permisos" className="text-[12px]">Permisos</TabsTrigger>
              <TabsTrigger value="issues" className="text-[12px]">Issues {openIssues > 0 && <Badge className="ml-1 bg-[#FEE2E2] text-[#991B1B] border-0 text-[10px] px-1.5">{openIssues}</Badge>}</TabsTrigger>
            </TabsList>

            <TabsContent value="onboarding">
              <OnboardingAdmin projectId={project.id} />
            </TabsContent>

            {/* SOV */}
            <TabsContent value="sov">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-[12px] border-collapse">
                  <thead><tr>
                    <th className={`${TH_CLASS} w-16`}>#</th>
                    <th className={TH_CLASS}>Partida</th>
                    <th className={TH_CLASS}>Fase</th>
                    <th className={`${TH_CLASS} text-right`}>Budget</th>
                    <th className={`${TH_CLASS} w-40`}>Avance</th>
                    <th className={`${TH_CLASS} text-right w-16`}>%</th>
                  </tr></thead>
                  <tbody>
                    {sovLines.map((line, idx) => {
                      const pct = line.progress_pct ?? 0;
                      return (
                        <tr key={line.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                          <td className={`${TD_CLASS} font-mono text-gray-500`}>{line.line_number}</td>
                          <td className={TD_CLASS}><span className="font-medium">{line.name}</span>{line.subfase && <span className="text-[11px] text-gray-400 ml-2">({line.subfase})</span>}</td>
                          <td className={TD_CLASS}>{line.fase && <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0 text-[10px]">{line.fase}</Badge>}</td>
                          <td className={`${TD_CLASS} text-right font-mono`}>{fmt(line.budget)}</td>
                          <td className={TD_CLASS}><div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden"><div className={`h-full rounded-full ${progressFisicoColor}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div></td>
                          <td className={`${TD_CLASS} text-right font-mono`}>{pct}%</td>
                        </tr>
                      );
                    })}
                    {sovLines.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-[12px]">Sin partidas SOV</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Cronograma */}
            <TabsContent value="cronograma">
              <CronogramaAdmin projectId={project.id} coTargetDate={project.co_target_date} />
            </TabsContent>

            {/* Riesgos */}
            <TabsContent value="riesgos">
              <RisksAdmin projectId={project.id} />
            </TabsContent>

            {/* Draws */}
            <TabsContent value="draws">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-[12px] border-collapse">
                  <thead><tr>
                    <th className={`${TH_CLASS} w-16`}>#</th>
                    <th className={TH_CLASS}>Fecha</th>
                    <th className={`${TH_CLASS} text-right`}>Solicitado</th>
                    <th className={`${TH_CLASS} text-right`}>Certificado</th>
                    <th className={TH_CLASS}>Estado</th>
                    <th className={TH_CLASS}>Archivo</th>
                  </tr></thead>
                  <tbody>
                    {draws.map((d, idx) => {
                      const st = DRAW_STATUS_BADGE[d.status ?? "pending"] || DRAW_STATUS_BADGE.pending;
                      return (
                        <tr key={d.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                          <td className={`${TD_CLASS} font-mono`}>{d.draw_number}</td>
                          <td className={TD_CLASS}>{d.request_date}</td>
                          <td className={`${TD_CLASS} text-right font-mono`}>{fmt(d.amount_requested)}</td>
                          <td className={`${TD_CLASS} text-right font-mono`}>{fmt(d.amount_certified)}</td>
                          <td className={TD_CLASS}>
                            <Select value={d.status || "pending"} onValueChange={(v) => handleDrawStatus(d.id, v)}>
                              <SelectTrigger className="w-[110px] h-7 text-[11px] border-gray-200"><Badge className={badgeClass(st.bg, st.text)}>{st.label}</Badge></SelectTrigger>
                              <SelectContent>{Object.entries(DRAW_STATUS_BADGE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className={TD_CLASS}>{d.certificate_url ? <a href={d.certificate_url} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1"><ExternalLink className="h-3 w-3" />Ver</a> : "—"}</td>
                        </tr>
                      );
                    })}
                    {draws.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-[12px]">Sin draws</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Reportes */}
            <TabsContent value="reportes">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 text-center text-gray-400 text-[12px]">
                Los reportes se gestionan desde la sección Reportes del panel admin.
              </div>
            </TabsContent>

            {/* Documentos */}
            <TabsContent value="documentos">
              <DocumentsAdmin projectId={project.id} />
            </TabsContent>

            {/* Permisos */}
            <TabsContent value="permisos">
              <PermitsAdmin projectId={project.id} />
            </TabsContent>

            {/* Issues */}
            <TabsContent value="issues">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setIssueFormOpen(true)} className={`h-8 ${BTN_SUCCESS}`}><Plus className="h-3.5 w-3.5 mr-1" />Agregar Issue</Button>
                </div>
                <Dialog open={issueFormOpen} onOpenChange={setIssueFormOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Nuevo Issue</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1"><Label className="text-[11px] text-gray-400">Nivel</Label>
                        <Select value={issueForm.level} onValueChange={(v) => setIssueForm({ ...issueForm, level: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="CRÍTICO">🔴 CRÍTICO</SelectItem><SelectItem value="ALTO">🟠 ALTO</SelectItem><SelectItem value="MEDIO">🟡 MEDIO</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-[11px] text-gray-400">Descripción</Label><Textarea value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} placeholder="Describa el issue..." /></div>
                      <Button onClick={addIssue} disabled={!issueForm.description} className={`w-full ${BTN_PRIMARY}`}>Crear Issue</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-[12px] border-collapse">
                    <thead><tr><th className={`${TH_CLASS} w-20`}>Nivel</th><th className={TH_CLASS}>Descripción</th><th className={TH_CLASS}>Abierto</th><th className={TH_CLASS}>Estado</th><th className={`${TH_CLASS} w-28`}>Acción</th></tr></thead>
                    <tbody>
                      {issues.map((issue, idx) => {
                        const lvl = ISSUE_LEVEL_BADGE[issue.level] || { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" };
                        return (
                          <tr key={issue.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                            <td className={TD_CLASS}><Badge className={badgeClass(lvl.bg, lvl.text)}>{issue.level}</Badge></td>
                            <td className={TD_CLASS}><p>{issue.description}</p>{issue.resolution_note && <p className="text-[11px] text-green-600 mt-1">✓ {issue.resolution_note}</p>}</td>
                            <td className={`${TD_CLASS} text-[11px]`}>{issue.opened_at ? new Date(issue.opened_at).toLocaleDateString() : "—"}</td>
                            <td className={TD_CLASS}><Badge className={issue.status === "open" ? badgeClass("bg-[#FEE2E2]", "text-[#991B1B]") : badgeClass("bg-[#D1FAE5]", "text-[#065F46]")}>{issue.status === "open" ? "Abierto" : "Resuelto"}</Badge></td>
                            <td className={TD_CLASS}>
                              {issue.status === "open" && (
                                resolveId === issue.id ? (
                                  <div className="space-y-1">
                                    <Input value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Nota de resolución" className="h-7 text-[11px]" />
                                    <div className="flex gap-1">
                                      <Button size="sm" className={`h-6 text-[10px] ${BTN_SUCCESS}`} onClick={() => resolveIssue(issue.id)}>Resolver</Button>
                                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setResolveId(null)}>Cancelar</Button>
                                    </div>
                                  </div>
                                ) : <Button size="sm" className={`h-7 ${BTN_SECONDARY}`} onClick={() => setResolveId(issue.id)}>Resolver</Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {issues.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-[12px]">Sin issues</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminProjectDetail;
