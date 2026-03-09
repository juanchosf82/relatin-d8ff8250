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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Calendar, AlertCircle, ExternalLink, Plus,
  Pencil, Trash2, FileText, Upload, LogOut
} from "lucide-react";
import ProjectMapEmbed from "@/components/portal/ProjectMapEmbed";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type SovLine = Tables<"sov_lines">;
type Draw = Tables<"draws">;
type Document = Tables<"documents">;
type Issue = Tables<"issues">;
type ProjectLink = Tables<"project_links">;

const fmt = (n: number | null) =>
  n != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n) : "—";

const STATUS_OPTIONS = [
  { value: "on_track", label: "En Curso", color: "bg-green-500/20 text-green-700" },
  { value: "attention", label: "Atención", color: "bg-amber-500/20 text-amber-700" },
  { value: "critical", label: "Crítico", color: "bg-red-500/20 text-red-700" },
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

  // Link form
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ProjectLink | null>(null);
  const [linkForm, setLinkForm] = useState({ label: "", url: "", icon: "🔗", color: "0D7377" });

  // Issue form
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ level: "MEDIO", description: "" });
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  // Document upload
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("General");
  const [docUploading, setDocUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    const { error } = await supabase.from("projects").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setProject((p) => p ? { ...p, status: newStatus } : p);
    toast.success("Estado actualizado");
  };

  // Budget progress calculations
  const totalBudget = sovLines.reduce((a, c) => a + (c.budget ?? 0), 0);
  const budgetProgressSum = sovLines.reduce((a, c) => a + (c.budget_progress_pct ?? 0), 0);
  const openIssues = issues.filter((i) => i.status === "open").length;

  // ── Links CRUD ──
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
      const { error } = await supabase.from("project_links").update({ label: linkForm.label, url: linkForm.url, icon: linkForm.icon, color: linkForm.color }).eq("id", editingLink.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Enlace actualizado");
    } else {
      const { error } = await supabase.from("project_links").insert([{ project_id: id, label: linkForm.label, url: linkForm.url, icon: linkForm.icon, color: linkForm.color, sort_order: links.length }]);
      if (error) { toast.error(error.message); return; }
      toast.success("Enlace agregado");
    }
    setLinkFormOpen(false);
    fetchAll();
  };

  const deleteLink = async (linkId: string) => {
    const { error } = await supabase.from("project_links").delete().eq("id", linkId);
    if (error) { toast.error(error.message); return; }
    toast.success("Enlace eliminado");
    fetchAll();
  };

  // ── Issues CRUD ──
  const addIssue = async () => {
    if (!issueForm.description || !id) return;
    const { error } = await supabase.from("issues").insert([{ project_id: id, level: issueForm.level, description: issueForm.description }]);
    if (error) { toast.error(error.message); return; }
    toast.success("Issue creado");
    setIssueFormOpen(false);
    setIssueForm({ level: "MEDIO", description: "" });
    fetchAll();
  };

  const resolveIssue = async (issueId: string) => {
    const { error } = await supabase.from("issues").update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_note: resolveNote }).eq("id", issueId);
    if (error) { toast.error(error.message); return; }
    toast.success("Issue resuelto");
    setResolveId(null);
    setResolveNote("");
    fetchAll();
  };

  // ── Document upload ──
  const uploadDoc = async () => {
    if (!docFile || !docName || !id) return;
    setDocUploading(true);
    try {
      const ext = docFile.name.split(".").pop();
      const fileName = `${id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("project_files").upload(`documents/${fileName}`, docFile);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("project_files").getPublicUrl(`documents/${fileName}`);
      const { error } = await supabase.from("documents").insert([{ project_id: id, name: docName, category: docCategory, file_url: data.publicUrl, visible_to_client: true }]);
      if (error) throw error;
      toast.success("Documento subido");
      setDocName("");
      setDocCategory("General");
      setDocFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchAll();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setDocUploading(false);
    }
  };

  // ── Draw status change ──
  const handleDrawStatus = async (drawId: string, newStatus: string) => {
    const { error } = await supabase.from("draws").update({ status: newStatus }).eq("id", drawId);
    if (error) { toast.error(error.message); return; }
    toast.success("Estado actualizado");
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(190,80%,26%)]" />
      </div>
    );
  }

  if (!project) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><p className="text-muted-foreground">Proyecto no encontrado.</p></div>;
  }

  const statusObj = STATUS_OPTIONS.find((s) => s.value === project.status) || STATUS_OPTIONS[0];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-16 bg-[#0F1B2D] flex flex-col items-center py-4 shrink-0">
        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 mb-4" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header two columns */}
          <div className="rounded-xl bg-[hsl(220,60%,18%)] text-white p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* LEFT 60% */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-[hsl(190,95%,45%)]">{project.code}</h1>
                    <p className="text-white/70 text-sm">{project.address}</p>
                  </div>
                  <Select value={project.status || "on_track"} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[140px] h-8 text-xs bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                  <div><span className="text-white/40 text-xs">GC:</span> <span className="text-white/80">{project.gc_name || "—"}</span></div>
                  <div><span className="text-white/40 text-xs">Licencia:</span> <span className="text-white/80">{project.gc_license || "—"}</span></div>
                  <div><span className="text-white/40 text-xs">Prestamista:</span> <span className="text-white/80">{project.lender_name || "—"}</span></div>
                  <div><span className="text-white/40 text-xs">Préstamo:</span> <span className="text-white/80">{fmt(project.loan_amount)}</span></div>
                  <div><span className="text-white/40 text-xs">Permiso:</span> <span className="text-white/80">{project.permit_no || "—"}</span></div>
                  <div><span className="text-white/40 text-xs">CO Target:</span> <span className="text-white/80">{project.co_target_date || "—"}</span></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={statusObj.color}>{statusObj.label}</Badge>
                  <Badge className={project.permit_status === "active" ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-amber-300"}>
                    Permiso: {project.permit_status}
                  </Badge>
                  {(project.liens_count ?? 0) > 0 && (
                    <Badge className="bg-red-500/20 text-red-300">{project.liens_count} Liens</Badge>
                  )}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-5 gap-3">
                  <KPI label="Av. Físico" value={`${project.progress_pct ?? 0}%`} />
                  <KPI label="Av. Presupuesto" value={`${Math.round(budgetProgressSum)}%`} className="text-orange-400" />
                  <KPI label="Loan Amount" value={fmt(project.loan_amount)} />
                  <KPI label="EAC" value={fmt(project.eac)} />
                  <KPI label="CO Target" value={project.co_target_date ?? "—"} />
                </div>
              </div>

              {/* RIGHT 40% */}
              <div className="lg:col-span-2 space-y-4">
                <ProjectMapEmbed address={project.address} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-white/50 text-[10px] mb-1">
                      <Calendar className="h-3 w-3" /> Última Visita
                    </div>
                    <p className="text-sm font-medium">{project.last_visit_date ?? "—"}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${openIssues > 0 ? "bg-red-500/20" : "bg-white/10"}`}>
                    <div className="flex items-center gap-1.5 text-white/50 text-[10px] mb-1">
                      <AlertCircle className="h-3 w-3" /> Issues Abiertos
                    </div>
                    <p className={`text-sm font-bold ${openIssues > 0 ? "text-red-300" : ""}`}>{openIssues}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enlaces section */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 text-sm">Enlaces del Proyecto</h3>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddLink()}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar enlace
                </Button>
              </div>

              {links.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {links.map((link) => (
                    <div key={link.id} className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm cursor-pointer hover:shadow-sm transition-shadow"
                      style={{ borderColor: `#${link.color || "0D7377"}` }}
                    >
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                        <span className="text-base">{link.icon}</span>
                        <span className="font-medium text-slate-700">{link.label}</span>
                      </a>
                      <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                        <button onClick={() => openEditLink(link)} className="p-0.5 rounded hover:bg-slate-100">
                          <Pencil className="h-3 w-3 text-slate-400" />
                        </button>
                        <button onClick={() => deleteLink(link.id)} className="p-0.5 rounded hover:bg-red-50">
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Sin enlaces configurados. Agrega rápido:</p>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_LINKS.map((dl) => (
                      <button key={dl.label} onClick={() => openAddLink(dl)} className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50 hover:border-slate-400">
                        <span>{dl.icon}</span> {dl.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Link form dialog */}
          <Dialog open={linkFormOpen} onOpenChange={setLinkFormOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editingLink ? "Editar Enlace" : "Agregar Enlace"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {ICON_OPTIONS.map((icon) => (
                    <button key={icon} type="button" onClick={() => setLinkForm({ ...linkForm, icon })}
                      className={`text-xl p-1 rounded ${linkForm.icon === icon ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}>
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input value={linkForm.label} onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })} placeholder="Fotos de Campo" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Color</Label>
                  <div className="flex gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button key={c.value} type="button" onClick={() => setLinkForm({ ...linkForm, color: c.value })}
                        className={`w-7 h-7 rounded-full border-2 ${linkForm.color === c.value ? "border-slate-800 ring-2 ring-offset-1 ring-slate-400" : "border-transparent"}`}
                        style={{ backgroundColor: `#${c.value}` }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={saveLink} disabled={!linkForm.label || !linkForm.url} className="w-full bg-[hsl(190,80%,26%)] text-white hover:bg-[hsl(190,80%,26%)]/90">
                  {editingLink ? "Actualizar" : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Tabs */}
          <Tabs defaultValue="sov">
            <TabsList className="bg-white border">
              <TabsTrigger value="sov">Avance SOV</TabsTrigger>
              <TabsTrigger value="draws">Draws</TabsTrigger>
              <TabsTrigger value="reportes">Reportes</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="issues">Issues {openIssues > 0 && <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1.5">{openIssues}</Badge>}</TabsTrigger>
            </TabsList>

            {/* SOV Tab */}
            <TabsContent value="sov">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Partida</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="w-40">Avance</TableHead>
                        <TableHead className="text-right w-16">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sovLines.map((line) => {
                        const pct = line.progress_pct ?? 0;
                        const color = pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-[hsl(190,95%,45%)]" : "bg-gray-300";
                        return (
                          <TableRow key={line.id}>
                            <TableCell className="font-mono text-xs">{line.line_number}</TableCell>
                            <TableCell>
                              <span className="font-medium">{line.name}</span>
                              {line.subfase && <span className="text-xs text-muted-foreground ml-2">({line.subfase})</span>}
                            </TableCell>
                            <TableCell>{line.fase && <Badge variant="outline" className="text-[10px]">{line.fase}</Badge>}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(line.budget)}</TableCell>
                            <TableCell>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{pct}%</TableCell>
                          </TableRow>
                        );
                      })}
                      {sovLines.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin partidas SOV</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Draws Tab */}
            <TabsContent value="draws">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Solicitado</TableHead>
                        <TableHead className="text-right">Certificado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Archivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draws.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono">{d.draw_number}</TableCell>
                          <TableCell>{d.request_date}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(d.amount_requested)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(d.amount_certified)}</TableCell>
                          <TableCell>
                            <Select value={d.status || "pending"} onValueChange={(v) => handleDrawStatus(d.id, v)}>
                              <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="review">Revisión</SelectItem>
                                <SelectItem value="sent">Enviado</SelectItem>
                                <SelectItem value="paid">Pagado</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {d.certificate_url ? (
                              <a href={d.certificate_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(190,95%,45%)] hover:underline text-sm flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> Ver
                              </a>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {draws.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin draws</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reportes Tab - placeholder showing weekly_reports */}
            <TabsContent value="reportes">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 text-center text-muted-foreground">
                  Los reportes se gestionan desde la sección Reportes del panel admin.
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documentos Tab */}
            <TabsContent value="documentos">
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm mb-3">Subir Documento</h3>
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre</Label>
                        <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Nombre del documento" className="w-48" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Categoría</Label>
                        <Select value={docCategory} onValueChange={setDocCategory}>
                          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Contratos">Contratos</SelectItem>
                            <SelectItem value="Permisos">Permisos</SelectItem>
                            <SelectItem value="Financiero">Financiero</SelectItem>
                            <SelectItem value="Inspecciones">Inspecciones</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Archivo</Label>
                        <Input ref={fileRef} type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                      </div>
                      <Button size="sm" disabled={!docFile || !docName || docUploading} onClick={uploadDoc} className="bg-[hsl(190,80%,26%)] text-white hover:bg-[hsl(190,80%,26%)]/90">
                        <Upload className="h-3.5 w-3.5 mr-1" /> {docUploading ? "Subiendo..." : "Subir"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Visible Cliente</TableHead>
                          <TableHead>Archivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {docs.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{doc.name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{doc.category}</Badge></TableCell>
                            <TableCell className="text-xs">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "—"}</TableCell>
                            <TableCell>{doc.visible_to_client ? "✓" : "—"}</TableCell>
                            <TableCell>
                              {doc.file_url && (
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(190,95%,45%)] hover:underline text-sm flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" /> Ver
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {docs.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin documentos</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Issues Tab */}
            <TabsContent value="issues">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setIssueFormOpen(true)} className="bg-[hsl(190,80%,26%)] text-white hover:bg-[hsl(190,80%,26%)]/90">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Issue
                  </Button>
                </div>

                {/* Issue form dialog */}
                <Dialog open={issueFormOpen} onOpenChange={setIssueFormOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Nuevo Issue</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Nivel</Label>
                        <Select value={issueForm.level} onValueChange={(v) => setIssueForm({ ...issueForm, level: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CRÍTICO">🔴 CRÍTICO</SelectItem>
                            <SelectItem value="ALTO">🟠 ALTO</SelectItem>
                            <SelectItem value="MEDIO">🟡 MEDIO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descripción</Label>
                        <Textarea value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} placeholder="Describa el issue..." />
                      </div>
                      <Button onClick={addIssue} disabled={!issueForm.description} className="w-full bg-[hsl(190,80%,26%)] text-white">Crear Issue</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Nivel</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Abierto</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-28">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {issues.map((issue) => {
                          const levelColors: Record<string, string> = {
                            "CRÍTICO": "bg-red-100 text-red-700",
                            "ALTO": "bg-orange-100 text-orange-700",
                            "MEDIO": "bg-yellow-100 text-yellow-700",
                          };
                          return (
                            <TableRow key={issue.id}>
                              <TableCell><Badge className={levelColors[issue.level] || "bg-gray-100"}>{issue.level}</Badge></TableCell>
                              <TableCell>
                                <p className="text-sm">{issue.description}</p>
                                {issue.resolution_note && <p className="text-xs text-green-600 mt-1">✓ {issue.resolution_note}</p>}
                              </TableCell>
                              <TableCell className="text-xs">{issue.opened_at ? new Date(issue.opened_at).toLocaleDateString() : "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={issue.status === "open" ? "border-red-300 text-red-600" : "border-green-300 text-green-600"}>
                                  {issue.status === "open" ? "Abierto" : "Resuelto"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {issue.status === "open" && (
                                  resolveId === issue.id ? (
                                    <div className="space-y-1">
                                      <Input value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Nota de resolución" className="h-7 text-xs" />
                                      <div className="flex gap-1">
                                        <Button size="sm" className="h-6 text-[10px] bg-green-600 hover:bg-green-700 text-white" onClick={() => resolveIssue(issue.id)}>Resolver</Button>
                                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setResolveId(null)}>Cancelar</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setResolveId(issue.id)}>Resolver</Button>
                                  )
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {issues.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin issues</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

const KPI = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div>
    <p className="text-white/50 text-[10px]">{label}</p>
    <p className={`text-base font-bold ${className ?? ""}`}>{value}</p>
  </div>
);

export default AdminProjectDetail;
