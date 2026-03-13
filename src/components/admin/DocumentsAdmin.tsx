import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Paperclip, CalendarIcon, CheckCircle2, ShieldAlert, FileCheck, FileText, Search, MoreHorizontal, Upload, Eye } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import FileUploadSource from "@/components/FileUploadSource";

// ══════════════════════════════════════
// TYPES & CONSTANTS
// ══════════════════════════════════════

interface DocCategory {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  sequence: number | null;
  is_required_check: boolean | null;
  color: string | null;
}

interface DocTemplate {
  id: string;
  category_code: string;
  name: string;
  description: string | null;
  is_mandatory: boolean | null;
  expiration_required: boolean | null;
  expiration_alert_days: number | null;
  responsible_role: string | null;
  sequence: number | null;
}

interface ProjectDocument {
  id: string;
  project_id: string | null;
  category: string;
  subcategory: string | null;
  name: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size_kb: number | null;
  status: string | null;
  expiration_date: string | null;
  is_required: boolean | null;
  visible_to_client: boolean | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: string | null;
  action_notes: string | null;
  last_chased_at: string | null;
  chase_count: number | null;
  version: number | null;
  approval_status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  visible_to_gc: boolean | null;
  parent_document_id: string | null;
  is_current_version: boolean | null;
  uploaded_by_role: string | null;
  review_requested_at: string | null;
  review_requested_by: string | null;
}

const APPROVAL_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Borrador" },
  in_review: { bg: "bg-blue-50", text: "text-blue-600", label: "En revisión" },
  approved: { bg: "bg-green-50", text: "text-green-700", label: "Aprobado ✓" },
  rejected: { bg: "bg-red-50", text: "text-red-600", label: "Rechazado ✗" },
};

const DRAW_REQUIRED_DOCS = [
  "Building Permit",
  "Builder's Risk Insurance",
  "General Liability — GC",
  "GC License (State)",
  "GC Certificate of Insurance",
];

const SUBCHAPTERS: Record<string, { key: string; label: string }[]> = {
  contratos: [
    { key: "principales", label: "Contratos Principales" },
    { key: "subcontratistas", label: "Contratos Subcontratistas" },
  ],
  permisos: [
    { key: "construccion", label: "Permisos de Construcción" },
    { key: "certificados", label: "Certificados y Aprobaciones" },
  ],
  seguros: [
    { key: "construccion", label: "Seguros de Construcción" },
    { key: "responsabilidad", label: "Seguros de Responsabilidad" },
  ],
  financiero: [
    { key: "prestamo", label: "Documentos de Préstamo" },
    { key: "titulo", label: "Título y Cierre" },
  ],
  tecnico: [
    { key: "planos", label: "Planos Aprobados" },
    { key: "ingenieria", label: "Ingeniería y Estudios" },
  ],
  municipal: [
    { key: "zonificacion", label: "Zonificación y Aprobaciones" },
    { key: "utilities", label: "Utilities y Conexiones" },
  ],
  contratistas: [
    { key: "gc", label: "Documentos GC" },
    { key: "sub", label: "Subcontratistas" },
  ],
  waivers: [
    { key: "draw", label: "Waivers por Draw" },
    { key: "final", label: "Waiver Final" },
  ],
  cierre: [
    { key: "cierre", label: "Documentos de Cierre" },
    { key: "post", label: "Post-Construcción" },
  ],
};

type ViewMode = "lista" | "checklist" | "estado";

const emptyForm = {
  category: "contratos",
  subcategory: "",
  name: "",
  description: "",
  status: "pending",
  approval_status: "draft",
  expiration_date: null as Date | null,
  is_required: true,
  visible_to_client: false,
  visible_to_gc: false,
  notes: "",
  assigned_to: "",
  due_date: null as Date | null,
  priority: "normal",
  action_notes: "",
};

// ══════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════

function getDocStatusDot(doc: ProjectDocument): { color: string; label: string } {
  if (doc.approval_status === "approved") {
    if (doc.expiration_date) {
      const days = differenceInDays(new Date(doc.expiration_date), new Date());
      if (days < 0) return { color: "bg-red-500", label: "Vencido" };
      if (days <= 30) return { color: "bg-amber-400", label: "Vence pronto" };
    }
    return { color: "bg-green-500", label: "Aprobado" };
  }
  if (doc.approval_status === "in_review") return { color: "bg-blue-500", label: "En revisión" };
  if (doc.approval_status === "rejected") return { color: "bg-red-500", label: "Rechazado" };
  if (doc.file_url) return { color: "bg-amber-400", label: "Borrador con archivo" };
  return { color: "bg-gray-300", label: "Pendiente" };
}

function getExpirationBarColor(days: number): string {
  if (days < 30) return "bg-red-400";
  if (days <= 60) return "bg-amber-400";
  return "bg-green-500";
}

function assignSubchapter(doc: ProjectDocument): string {
  if (doc.subcategory) return doc.subcategory;
  const subs = SUBCHAPTERS[doc.category];
  if (!subs) return "";
  return subs[0].key;
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════

const DocumentsAdmin = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [openSubchapters, setOpenSubchapters] = useState<Record<string, boolean>>({});
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAll = async () => {
    const [docsRes, catsRes, tmplRes] = await Promise.all([
      supabase.from("project_documents").select("*").eq("project_id", projectId).eq("is_current_version", true).order("category").order("name"),
      supabase.from("doc_categories" as any).select("*").order("sequence"),
      supabase.from("doc_required_templates" as any).select("*").order("sequence"),
    ]);
    setDocuments((docsRes.data as unknown as ProjectDocument[]) ?? []);
    setCategories((catsRes.data as unknown as DocCategory[]) ?? []);
    setTemplates((tmplRes.data as unknown as DocTemplate[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  const currentDocs = documents.filter(d => d.is_current_version !== false);
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return currentDocs;
    const q = searchQuery.toLowerCase();
    return currentDocs.filter(d => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || (d.description?.toLowerCase().includes(q)));
  }, [currentDocs, searchQuery]);

  const requiredDocs = currentDocs.filter(d => d.is_required);
  const approvedRequired = requiredDocs.filter(d => d.approval_status === "approved");
  const compliancePct = requiredDocs.length > 0 ? Math.round((approvedRequired.length / requiredDocs.length) * 100) : 0;

  const approvedCount = currentDocs.filter(d => d.approval_status === "approved").length;
  const inReviewCount = currentDocs.filter(d => d.approval_status === "in_review").length;
  const pendingCount = currentDocs.filter(d => !d.file_url || d.approval_status === "draft").length;
  const expiredCount = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) < 0).length;
  const expiringSoonCount = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) >= 0 && differenceInDays(new Date(d.expiration_date), new Date()) <= 30).length;
  const alertCount = expiredCount + expiringSoonCount;

  const drawChecks = DRAW_REQUIRED_DOCS.map(name => {
    const doc = currentDocs.find(d => d.name.includes(name));
    const isApproved = doc?.approval_status === "approved";
    const isExpired = doc?.expiration_date ? differenceInDays(new Date(doc.expiration_date), new Date()) < 0 : false;
    return { name, doc, pass: isApproved && !isExpired };
  });
  const drawReady = drawChecks.every(c => c.pass);
  const drawMissing = drawChecks.filter(c => !c.pass).length;

  const groupedByCat = categories.reduce<Record<string, ProjectDocument[]>>((acc, cat) => {
    acc[cat.code] = filteredDocs.filter(d => d.category === cat.code);
    return acc;
  }, {});

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setUploadFile(null); setFormOpen(true); };
  const openAddForCategory = (catCode: string, subKey?: string) => {
    setEditingId(null);
    setForm({ ...emptyForm, category: catCode, subcategory: subKey || "" });
    setUploadFile(null);
    setFormOpen(true);
  };

  const openEdit = (d: ProjectDocument) => {
    setEditingId(d.id);
    setForm({
      category: d.category,
      subcategory: d.subcategory ?? "",
      name: d.name,
      description: d.description ?? "",
      status: d.status ?? "pending",
      approval_status: d.approval_status ?? "draft",
      expiration_date: d.expiration_date ? new Date(d.expiration_date) : null,
      is_required: d.is_required ?? true,
      visible_to_client: d.visible_to_client ?? false,
      visible_to_gc: d.visible_to_gc ?? false,
      notes: d.notes ?? "",
      assigned_to: d.assigned_to ?? "",
      due_date: d.due_date ? new Date(d.due_date) : null,
      priority: d.priority ?? "normal",
      action_notes: d.action_notes ?? "",
    });
    setUploadFile(null);
    setFormOpen(true);
  };

  const saveDoc = async () => {
    if (!form.name || !form.category) return;
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSizeKb: number | null = null;

    if (uploadFile) {
      setUploading(true);
      const ext = uploadFile.name.split(".").pop();
      const path = `documentos/${projectId}/${form.category}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("project_files").upload(path, uploadFile);
      if (error) { toast.error("Error subiendo archivo: " + error.message); setUploading(false); return; }
      const { data } = supabase.storage.from("project_files").getPublicUrl(path);
      fileUrl = data.publicUrl;
      fileName = uploadFile.name;
      fileSizeKb = Math.round(uploadFile.size / 1024);
      setUploading(false);
    }

    const payload: any = {
      project_id: projectId,
      category: form.category,
      subcategory: form.subcategory || null,
      name: form.name,
      description: form.description || null,
      status: uploadFile ? "uploaded" : form.status,
      approval_status: form.approval_status,
      expiration_date: form.expiration_date ? format(form.expiration_date, "yyyy-MM-dd") : null,
      is_required: form.is_required,
      visible_to_client: form.visible_to_client,
      visible_to_gc: form.visible_to_gc,
      notes: form.notes || null,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date ? format(form.due_date, "yyyy-MM-dd") : null,
      priority: form.priority,
      action_notes: form.action_notes || null,
    };

    if (fileUrl) {
      payload.file_url = fileUrl;
      payload.file_name = fileName;
      payload.file_size_kb = fileSizeKb;
      payload.uploaded_at = new Date().toISOString();
    }

    if (editingId) {
      const existingDoc = currentDocs.find(d => d.id === editingId);
      if (uploadFile && existingDoc?.file_url) {
        await supabase.from("project_documents").update({ is_current_version: false }).eq("id", editingId);
        payload.version = (existingDoc.version ?? 1) + 1;
        payload.is_current_version = true;
        payload.parent_document_id = existingDoc.parent_document_id || editingId;
        await supabase.from("project_documents").insert([payload]);
        toast.success(`Versión ${payload.version} creada`);
      } else {
        await supabase.from("project_documents").update(payload).eq("id", editingId);
        toast.success("Documento actualizado");
      }
    } else {
      payload.version = 1;
      payload.is_current_version = true;
      await supabase.from("project_documents").insert([payload]);
      toast.success("Documento agregado");
    }
    setFormOpen(false);
    setUploadFile(null);
    fetchAll();
  };

  const deleteDoc = async () => {
    if (!deleteId) return;
    await supabase.from("project_documents").delete().eq("id", deleteId);
    toast.success("Documento eliminado");
    setDeleteId(null);
    fetchAll();
  };

  const handleQuickUpload = async (docId: string, file: File) => {
    const doc = currentDocs.find(d => d.id === docId);
    const catPath = doc?.category || "otros";
    const ext = file.name.split(".").pop();
    const path = `documentos/${projectId}/${catPath}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("project_files").upload(path, file);
    if (error) { toast.error("Error: " + error.message); return; }
    const { data } = supabase.storage.from("project_files").getPublicUrl(path);

    if (doc?.file_url) {
      await supabase.from("project_documents").update({ is_current_version: false }).eq("id", docId);
      await supabase.from("project_documents").insert([{
        project_id: projectId,
        category: doc.category,
        name: doc.name,
        file_url: data.publicUrl,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
        status: "uploaded",
        approval_status: "draft",
        uploaded_at: new Date().toISOString(),
        is_required: doc.is_required,
        visible_to_client: doc.visible_to_client,
        visible_to_gc: doc.visible_to_gc,
        version: (doc.version ?? 1) + 1,
        is_current_version: true,
        parent_document_id: doc.parent_document_id || docId,
        expiration_date: doc.expiration_date,
        assigned_to: doc.assigned_to,
        subcategory: doc.subcategory,
      }]);
      toast.success(`Versión ${(doc.version ?? 1) + 1} creada`);
    } else {
      await supabase.from("project_documents").update({
        file_url: data.publicUrl,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
        status: "uploaded",
        uploaded_at: new Date().toISOString(),
      }).eq("id", docId);
      toast.success("Archivo cargado");
    }
    fetchAll();
  };

  const approveDoc = async (docId: string) => {
    await supabase.from("project_documents").update({
      approval_status: "approved",
      approved_at: new Date().toISOString(),
    }).eq("id", docId);
    toast.success("Documento aprobado ✓");
    fetchAll();
  };

  const rejectDoc = async () => {
    if (!rejectDocId || !rejectionReason) return;
    await supabase.from("project_documents").update({
      approval_status: "rejected",
      rejection_reason: rejectionReason,
    }).eq("id", rejectDocId);
    toast.success("Documento rechazado");
    setRejectDocId(null);
    setRejectionReason("");
    fetchAll();
  };

  const submitForReview = async (docId: string) => {
    await supabase.from("project_documents").update({
      approval_status: "in_review",
      review_requested_at: new Date().toISOString(),
    }).eq("id", docId);
    toast.success("Enviado a revisión");
    fetchAll();
  };

  const importChecklist = async () => {
    const { data: existing } = await supabase
      .from("project_documents")
      .select("category, name")
      .eq("project_id", projectId);
    const existingSet = new Set((existing ?? []).map(d => `${d.category}::${d.name}`));

    const newRows = templates
      .filter(t => !existingSet.has(`${t.category_code}::${t.name}`))
      .map(t => ({
        project_id: projectId,
        category: t.category_code,
        name: t.name,
        status: "pending",
        approval_status: "draft",
        is_required: t.is_mandatory ?? true,
        visible_to_client: false,
        visible_to_gc: false,
        version: 1,
        is_current_version: true,
      }));

    if (newRows.length === 0) {
      toast.info("Todos los documentos del checklist ya existen.");
      setImportOpen(false);
      return;
    }
    await supabase.from("project_documents").insert(newRows);
    toast.success(`✓ ${newRows.length} documentos creados`);
    setImportOpen(false);
    fetchAll();
  };

  const toggleChapter = (cat: string) => setOpenChapters(prev => ({ ...prev, [cat]: !prev[cat] }));
  const toggleSubchapter = (key: string) => setOpenSubchapters(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleVisibility = async (docId: string, field: "visible_to_gc" | "visible_to_client", current: boolean) => {
    await supabase.from("project_documents").update({ [field]: !current }).eq("id", docId);
    fetchAll();
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-white">

        {/* ═══ HEADER ═══ */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "#E5E7EB" }}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-bold tracking-tight" style={{ color: "#0F1B2D" }}>
              Documentación & Contratos
              <span className="text-gray-400 font-normal ml-2 text-[13px]">— Cap. 1</span>
            </h2>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: "#0F1B2D" }}>
              {compliancePct}% completado
            </span>
            <div className="flex-1 h-[6px] bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${compliancePct}%`, background: "linear-gradient(90deg, #0D7377, #1A7A4A)" }}
              />
            </div>
            <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">
              {approvedRequired.length}/{requiredDocs.length} documentos
            </span>
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700", label: `${approvedCount} aprobados` },
              { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-600", label: `${inReviewCount} en revisión` },
              { dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700", label: `${pendingCount} pendientes` },
              ...(alertCount > 0 ? [{ dot: "bg-red-500", bg: "bg-red-50", text: "text-red-600", label: `${alertCount} alerta` }] : []),
            ].map((p, i) => (
              <span key={i} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium", p.bg, p.text)}>
                <span className={cn("w-[6px] h-[6px] rounded-full", p.dot)} />
                {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* ═══ TOOLBAR ═══ */}
        <div className="px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <input
              type="text"
              placeholder="Buscar documento..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-[12px] bg-transparent border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0D7377] focus:border-[#0D7377] placeholder:text-gray-300"
            />
          </div>

          <div className="flex items-center gap-4">
            {/* View tabs — underline style */}
            <div className="flex items-center gap-0" style={{ borderBottom: "1px solid #F3F4F6" }}>
              {([
                { key: "lista" as ViewMode, icon: "📋", label: "Lista" },
                { key: "checklist" as ViewMode, icon: "✅", label: "Checklist" },
                { key: "estado" as ViewMode, icon: "📊", label: "Estado" },
              ]).map(v => (
                <button
                  key={v.key}
                  onClick={() => setViewMode(v.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 pb-2 pt-1 text-[12px] font-medium transition-all border-b-2 -mb-px",
                    viewMode === v.key
                      ? "border-[#0F1B2D] text-[#0F1B2D]"
                      : "border-transparent text-gray-400 hover:text-gray-700"
                  )}
                >
                  <span className="text-[11px]">{v.icon}</span> {v.label}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] font-medium text-gray-500 border-gray-200 rounded-md"
              onClick={() => setImportOpen(true)}
            >
              ↓ Plantilla base
            </Button>
            <Button
              size="sm"
              className="h-7 text-[10px] font-medium bg-[#0D7377] hover:bg-[#0A5C5F] text-white rounded-md"
              onClick={openAdd}
            >
              <Plus className="h-3 w-3 mr-0.5" /> Agregar
            </Button>
          </div>
        </div>

        {/* ═══ DRAW READINESS BANNER ═══ */}
        {viewMode === "lista" && (
          <div className={cn(
            "mx-5 mt-4 px-4 py-2.5 rounded-lg border text-[12px] flex items-center justify-between",
            drawReady
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-orange-50 border-orange-200 text-orange-700"
          )}>
            <span className="font-medium">
              {drawReady
                ? "✓ Documentación lista para draw"
                : `⚠️ Faltan ${drawMissing} documento${drawMissing !== 1 ? "s" : ""} requerido${drawMissing !== 1 ? "s" : ""} para el próximo draw`
              }
            </span>
            {!drawReady && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-[11px] font-semibold underline underline-offset-2 hover:text-orange-800">Ver</button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3">
                  <p className="text-[11px] font-bold text-[#0F1B2D] mb-2">Documentos para Draw</p>
                  <div className="space-y-1.5">
                    {drawChecks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        {c.pass
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          : <span className="w-3.5 h-3.5 rounded-full border-2 border-orange-400 shrink-0" />
                        }
                        <span className={c.pass ? "text-gray-500" : "text-[#0F1B2D] font-medium"}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════
            VIEW 1: LISTA (Tree/Outline)
           ═══════════════════════════════════ */}
        {viewMode === "lista" && (
          <div className="mt-3">
            {/* Column header — sticky */}
            <div className="hidden md:grid items-center px-5 py-2 text-[9px] font-bold text-gray-400 uppercase tracking-[0.08em] bg-white sticky top-0 z-10"
              style={{
                borderBottom: "2px solid #0F1B2D",
                gridTemplateColumns: "minmax(0, 1fr) 40px 80px 80px 90px 60px 20px 28px",
                gap: "8px",
              }}
            >
              <span>Documento</span>
              <span className="text-center">Ver.</span>
              <span className="hidden lg:block">Responsable</span>
              <span className="hidden lg:block">Vencimiento</span>
              <span className="text-center">Estado</span>
              <span className="text-center hidden lg:block">Visib.</span>
              <span />
              <span />
            </div>

            {filteredDocs.length === 0 && !searchQuery ? (
              <div className="text-center py-20 text-gray-400 text-[12px]">
                <FileText className="h-8 w-8 mx-auto mb-3 text-gray-200" />
                Sin documentos. Usa "Plantilla base" para comenzar.
              </div>
            ) : filteredDocs.length === 0 && searchQuery ? (
              <div className="text-center py-16 text-gray-400 text-[12px]">
                Sin resultados para "{searchQuery}"
              </div>
            ) : (
              <div>
                {categories.map((cat, catIdx) => {
                  const items = groupedByCat[cat.code] || [];
                  if (items.length === 0 && searchQuery) return null;
                  const catNum = catIdx + 1;
                  const catColor = cat.color || "#0D7377";
                  const catReq = items.filter(d => d.is_required);
                  const catApproved = catReq.filter(d => d.approval_status === "approved");
                  const catPct = catReq.length > 0 ? Math.round((catApproved.length / catReq.length) * 100) : (items.length > 0 ? 100 : 0);
                  const isOpen = openChapters[cat.code] !== false;
                  const hasExpiring = items.some(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) <= 30 && differenceInDays(new Date(d.expiration_date), new Date()) >= 0);
                  const hasExpired = items.some(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) < 0);

                  const subs = SUBCHAPTERS[cat.code] || [{ key: "_default", label: cat.name }];
                  const docsBySub = subs.map(sub => ({
                    ...sub,
                    docs: items.filter(d => assignSubchapter(d) === sub.key),
                  }));

                  return (
                    <div key={cat.code}>
                      {/* ── LEVEL 1 — Chapter ── */}
                      <button
                        onClick={() => toggleChapter(cat.code)}
                        className="w-full flex items-center justify-between h-[44px] px-5 bg-white transition-colors hover:bg-[#FAFAFA] select-none"
                        style={{ borderBottom: "1px solid #F3F4F6" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn("transition-transform duration-200", isOpen && "rotate-90")}>
                            <ChevronRight className="h-[14px] w-[14px] text-gray-400" />
                          </div>
                          <span className="text-[15px] leading-none">{cat.icon}</span>
                          <span className="text-[13px] font-bold uppercase tracking-[0.05em]" style={{ color: "#0F1B2D" }}>
                            {catNum}. {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {hasExpired && (
                            <span className="text-[9px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">🔴 vencido</span>
                          )}
                          {hasExpiring && !hasExpired && (
                            <span className="text-[9px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">⚠️ por vencer</span>
                          )}
                          <span className="text-[11px] text-gray-500 tabular-nums">
                            {catApproved.length}/{catReq.length || items.length}
                          </span>
                          <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                catPct >= 80 ? "bg-green-500" : catPct >= 50 ? "bg-amber-400" : "bg-red-400"
                              )}
                              style={{ width: `${catPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 w-8 text-right tabular-nums">{catPct}%</span>
                        </div>
                      </button>

                      {/* Expanded content */}
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-200 ease-in-out",
                          isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                        )}
                      >
                        {docsBySub.map((sub, subIdx) => {
                          if (sub.docs.length === 0 && searchQuery) return null;
                          const subKey = `${cat.code}::${sub.key}`;
                          const subOpen = openSubchapters[subKey] !== false;
                          const subNum = `${catNum}.${subIdx + 1}`;
                          const subExpiring = sub.docs.some(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) <= 30 && differenceInDays(new Date(d.expiration_date), new Date()) >= 0);
                          const subApproved = sub.docs.filter(d => d.approval_status === "approved").length;

                          return (
                            <div key={sub.key}>
                              {/* ── LEVEL 2 — Subchapter ── */}
                              <button
                                onClick={() => toggleSubchapter(subKey)}
                                className="w-full flex items-center justify-between h-[38px] pr-5 bg-[#FAFAFA] transition-colors hover:bg-blue-50/30 select-none"
                                style={{
                                  paddingLeft: "32px",
                                  borderBottom: "1px solid #F3F4F6",
                                  borderLeft: `2px solid ${catColor}`,
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {/* Tree connector line */}
                                  <div className="w-3 border-t border-gray-200" />
                                  <div className={cn("transition-transform duration-200", subOpen && "rotate-90")}>
                                    <ChevronRight className="h-3 w-3 text-gray-400" />
                                  </div>
                                  <span className="text-[12px] font-medium text-gray-600">
                                    {subNum} {sub.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {subExpiring && <span className="text-[9px] text-orange-500">⚠️</span>}
                                  <span className="text-[10px] text-gray-400 tabular-nums">
                                    {subApproved}/{sub.docs.length}
                                  </span>
                                </div>
                              </button>

                              {/* ── LEVEL 3 — Document rows ── */}
                              <div
                                className={cn(
                                  "overflow-hidden transition-all duration-200 ease-in-out",
                                  subOpen ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
                                )}
                              >
                                {sub.docs.map((doc) => {
                                  const dot = getDocStatusDot(doc);
                                  const ab = APPROVAL_BADGES[doc.approval_status ?? "draft"];
                                  const isExpired = doc.expiration_date && differenceInDays(new Date(doc.expiration_date), new Date()) < 0;
                                  const daysLeft = doc.expiration_date ? differenceInDays(new Date(doc.expiration_date), new Date()) : null;

                                  return (
                                    <div
                                      key={doc.id}
                                      className="group flex items-center bg-white transition-colors duration-150 hover:bg-[#F0FDFA]"
                                      style={{
                                        paddingLeft: "64px",
                                        paddingRight: "20px",
                                        minHeight: "40px",
                                        borderBottom: "1px solid #F9FAFB",
                                      }}
                                    >
                                      {/* Tree connector */}
                                      <div className="flex items-center mr-2.5 -ml-5 shrink-0">
                                        <div className="w-3 border-t border-dashed" style={{ borderColor: "#E5E7EB" }} />
                                      </div>

                                      {/* Status dot */}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className={cn("w-[10px] h-[10px] rounded-full shrink-0 mr-3", dot.color)} />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-[10px]">{dot.label}</TooltipContent>
                                      </Tooltip>

                                      {/* Document grid row */}
                                      <div className="flex-1 min-w-0 hidden md:grid items-center"
                                        style={{
                                          gridTemplateColumns: "minmax(0, 1fr) 40px 80px 80px 90px 60px 20px 28px",
                                          gap: "8px",
                                        }}
                                      >
                                        {/* Name */}
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[13px] font-medium truncate" style={{ color: "#0F1B2D" }}>
                                              {doc.name}
                                            </span>
                                            {doc.is_required && doc.approval_status !== "approved" && (
                                              <span className="text-red-500 text-[11px] font-bold leading-none">*</span>
                                            )}
                                          </div>
                                          {doc.description && (
                                            <p className="text-[10px] text-gray-400 italic truncate mt-0.5">{doc.description}</p>
                                          )}
                                        </div>

                                        {/* Version */}
                                        <div className="flex justify-center">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 cursor-default tabular-nums">
                                                v{doc.version ?? 1}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-[10px] space-y-1 p-2">
                                              <p className="font-bold">v{doc.version ?? 1}{doc.approval_status === "approved" ? " ✓" : ""}</p>
                                              {doc.uploaded_at && <p className="text-gray-500">{format(new Date(doc.uploaded_at), "dd MMM yyyy", { locale: es })}</p>}
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>

                                        {/* Responsible */}
                                        <span className="text-[11px] text-gray-500 truncate hidden lg:block">
                                          {doc.assigned_to || "—"}
                                        </span>

                                        {/* Expiration */}
                                        <span className={cn(
                                          "text-[11px] truncate hidden lg:block tabular-nums",
                                          isExpired ? "text-red-600 font-medium" :
                                          daysLeft !== null && daysLeft <= 30 ? "text-orange-500 font-medium" :
                                          doc.expiration_date ? "text-gray-400" : "text-gray-300"
                                        )}>
                                          {isExpired ? "Vencido" :
                                           daysLeft !== null && daysLeft <= 60 ? `${daysLeft}d` :
                                           doc.expiration_date ? format(new Date(doc.expiration_date), "MMM yyyy", { locale: es }) :
                                           "—"}
                                        </span>

                                        {/* Approval badge */}
                                        <div className="flex justify-center">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button className={cn(
                                                "text-[9px] font-medium rounded-full px-2 py-0.5 cursor-pointer transition-colors hover:ring-1 hover:ring-gray-200",
                                                ab.bg, ab.text
                                              )}>
                                                {ab.label}
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center" className="min-w-[140px]">
                                              <DropdownMenuItem className="text-[10px]" onClick={() => approveDoc(doc.id)}>
                                                <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-600" /> Aprobar
                                              </DropdownMenuItem>
                                              <DropdownMenuItem className="text-[10px]" onClick={() => submitForReview(doc.id)}>
                                                <Eye className="h-3 w-3 mr-1.5 text-blue-500" /> En revisión
                                              </DropdownMenuItem>
                                              <DropdownMenuItem className="text-[10px] text-red-600" onClick={() => { setRejectDocId(doc.id); setRejectionReason(""); }}>
                                                <Trash2 className="h-3 w-3 mr-1.5" /> Rechazar
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>

                                        {/* Visibility toggles */}
                                        <div className="hidden lg:flex items-center justify-center gap-1">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-[11px] cursor-default" style={{ color: "#0F1B2D" }}>👤</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-[9px]">Admin</TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={() => toggleVisibility(doc.id, "visible_to_gc", doc.visible_to_gc ?? false)}
                                                className="text-[11px] transition-opacity"
                                                style={{ opacity: doc.visible_to_gc ? 1 : 0.25 }}
                                              >
                                                👷
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-[9px]">
                                              {doc.visible_to_gc ? "Visible para GC" : "Oculto para GC"}
                                            </TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={() => toggleVisibility(doc.id, "visible_to_client", doc.visible_to_client ?? false)}
                                                className="text-[11px] transition-opacity"
                                                style={{ opacity: doc.visible_to_client ? 1 : 0.25 }}
                                              >
                                                👁
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-[9px]">
                                              {doc.visible_to_client ? "Visible para cliente" : "Oculto para cliente"}
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>

                                        {/* File icon */}
                                        {doc.file_url ? (
                                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex justify-center">
                                            <Paperclip className="h-3.5 w-3.5 text-[#0D7377] hover:text-[#0A5C5F] transition-colors" />
                                          </a>
                                        ) : (
                                          <span className="flex justify-center">
                                            <Paperclip className="h-3.5 w-3.5 text-gray-200" />
                                          </span>
                                        )}

                                        {/* Actions */}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all duration-150">
                                              <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="min-w-[160px]">
                                            <DropdownMenuItem className="text-[11px]" onClick={() => {
                                              const input = document.createElement("input");
                                              input.type = "file";
                                              input.onchange = (e: any) => { if (e.target.files[0]) handleQuickUpload(doc.id, e.target.files[0]); };
                                              input.click();
                                            }}>
                                              <Upload className="h-3 w-3 mr-2" /> Subir nueva versión
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-[11px]" onClick={() => openEdit(doc)}>
                                              <Pencil className="h-3 w-3 mr-2" /> Editar información
                                            </DropdownMenuItem>
                                            {doc.file_url && (
                                              <DropdownMenuItem className="text-[11px]" asChild>
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                  <Eye className="h-3 w-3 mr-2" /> Ver archivo
                                                </a>
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem className="text-[11px] text-red-600" onClick={() => setDeleteId(doc.id)}>
                                              <Trash2 className="h-3 w-3 mr-2" /> Eliminar
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>

                                      {/* Mobile: simplified row */}
                                      <div className="flex-1 flex items-center justify-between md:hidden min-w-0">
                                        <div className="min-w-0">
                                          <span className="text-[12px] font-medium truncate block" style={{ color: "#0F1B2D" }}>{doc.name}</span>
                                          <span className={cn("text-[9px] rounded-full px-1.5 py-0.5", ab.bg, ab.text)}>{ab.label}</span>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="p-1"><MoreHorizontal className="h-4 w-4 text-gray-400" /></button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="text-[11px]" onClick={() => openEdit(doc)}>
                                              <Pencil className="h-3 w-3 mr-2" /> Editar
                                            </DropdownMenuItem>
                                            {doc.file_url && (
                                              <DropdownMenuItem className="text-[11px]" asChild>
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                  <Eye className="h-3 w-3 mr-2" /> Ver
                                                </a>
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem className="text-[11px] text-red-600" onClick={() => setDeleteId(doc.id)}>
                                              <Trash2 className="h-3 w-3 mr-2" /> Eliminar
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Add document row */}
                                <button
                                  onClick={() => openAddForCategory(cat.code, sub.key)}
                                  className="w-full flex items-center gap-1.5 h-8 text-[10px] font-medium transition-colors hover:bg-[#F0FDFA]"
                                  style={{
                                    paddingLeft: "64px",
                                    color: "#0D7377",
                                    borderBottom: "1px dashed #E5E7EB",
                                  }}
                                >
                                  <Plus className="h-2.5 w-2.5" /> Agregar documento en {subNum}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════
            VIEW 2: CHECKLIST (Kanban)
           ═══════════════════════════════════ */}
        {viewMode === "checklist" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 p-5">
            {[
              { key: "draft", label: "Pendiente", dotColor: "bg-gray-400", headerColor: "text-gray-600", bgCol: "bg-gray-50/80", filter: (d: ProjectDocument) => d.approval_status === "draft" || (!d.file_url && d.approval_status !== "in_review" && d.approval_status !== "approved" && d.approval_status !== "rejected") },
              { key: "in_review", label: "Revisión", dotColor: "bg-blue-500", headerColor: "text-blue-600", bgCol: "bg-blue-50/40", filter: (d: ProjectDocument) => d.approval_status === "in_review" },
              { key: "approved", label: "Aprobado", dotColor: "bg-green-500", headerColor: "text-green-700", bgCol: "bg-green-50/40", filter: (d: ProjectDocument) => d.approval_status === "approved" && (!d.expiration_date || differenceInDays(new Date(d.expiration_date), new Date()) > 0) },
              { key: "expired", label: "Rechazado / Vencido", dotColor: "bg-red-500", headerColor: "text-red-600", bgCol: "bg-red-50/40", filter: (d: ProjectDocument) => d.approval_status === "rejected" || (d.expiration_date ? differenceInDays(new Date(d.expiration_date), new Date()) < 0 : false) },
            ].map(col => {
              const colDocs = filteredDocs.filter(col.filter);
              return (
                <div key={col.key} className={cn("rounded-xl p-3 min-h-[200px]", col.bgCol)}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                    <h3 className={cn("text-[10px] font-bold uppercase tracking-[0.06em]", col.headerColor)}>{col.label}</h3>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", col.bgCol, col.headerColor)}>{colDocs.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colDocs.map(doc => {
                      const cat = categories.find(c => c.code === doc.category);
                      const borderColor = cat?.color || "#0D7377";
                      const daysToExpire = doc.expiration_date ? differenceInDays(new Date(doc.expiration_date), new Date()) : null;
                      return (
                        <div
                          key={doc.id}
                          className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-150 space-y-1.5"
                          style={{ borderLeft: `3px solid ${borderColor}` }}
                        >
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1 font-semibold">{cat?.icon} {cat?.name}</p>
                          <p className="text-[11px] font-semibold text-[#0F1B2D] leading-tight">{doc.name}</p>
                          <div className="text-[9px] text-gray-500 space-y-0.5">
                            {doc.assigned_to && <p>👤 {doc.assigned_to}</p>}
                            {doc.due_date && (
                              <p className={differenceInDays(new Date(doc.due_date), new Date()) < 0 ? "text-red-500 font-medium" : ""}>
                                🎯 {format(new Date(doc.due_date), "dd MMM", { locale: es })}
                              </p>
                            )}
                          </div>
                          {daysToExpire !== null && (
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", daysToExpire < 0 ? "bg-red-400" : getExpirationBarColor(daysToExpire))}
                                style={{ width: `${Math.min(100, Math.max(10, daysToExpire < 0 ? 100 : (daysToExpire / 90) * 100))}%` }}
                              />
                            </div>
                          )}
                          <div className="flex gap-2 pt-0.5">
                            {doc.file_url && (
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-medium text-[#0D7377] hover:underline">Ver</a>
                            )}
                            {!doc.file_url && <FileUploadSource accept="pdf+images" compact onFileSelected={f => handleQuickUpload(doc.id, f)} />}
                          </div>
                        </div>
                      );
                    })}
                    {colDocs.length === 0 && <p className="text-gray-300 text-[10px] text-center py-8">Sin documentos</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════
            VIEW 3: ESTADO (Dashboard)
           ═══════════════════════════════════ */}
        {viewMode === "estado" && (
          <div className="space-y-5 p-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total docs", value: `${currentDocs.length}`, borderColor: "#0F1B2D" },
                { label: "Aprobados", value: `${approvedCount}`, borderColor: "#1A7A4A" },
                { label: "Acción requerida", value: `${currentDocs.filter(d => d.approval_status === "in_review" || (d.is_required && !d.file_url)).length}`, borderColor: "#E07B39" },
                { label: "Vencidos / Alertas", value: `${alertCount}`, borderColor: "#DC2626" },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-gray-100" style={{ borderTop: `3px solid ${kpi.borderColor}` }}>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">{kpi.label}</p>
                  <p className="text-[24px] font-bold text-[#0F1B2D] leading-none tabular-nums">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Category completion */}
            <div className="bg-white rounded-lg border border-gray-100 p-5">
              <h3 className="text-[11px] font-bold text-[#0F1B2D] uppercase tracking-wider mb-4">Completitud por categoría</h3>
              <div className="space-y-0">
                {categories.map(cat => {
                  const items = (groupedByCat[cat.code] || []);
                  const req = items.filter(d => d.is_required);
                  const approved = req.filter(d => d.approval_status === "approved");
                  const pct = req.length > 0 ? Math.round((approved.length / req.length) * 100) : (items.length > 0 ? 100 : 0);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat.code} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm w-5">{cat.icon}</span>
                      <span className="text-[11px] font-medium text-[#0F1B2D] w-32 truncate">{cat.name}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{pct}%</span>
                      <span className="text-[9px] text-gray-400 w-8 tabular-nums">{approved.length}/{req.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(() => {
                const expiringDocs = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) <= 60 && differenceInDays(new Date(d.expiration_date), new Date()) >= 0);
                const expiredDocs = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) < 0);
                const allAlert = [...expiredDocs, ...expiringDocs];
                return (
                  <div className="bg-white rounded-lg border border-gray-100 p-4">
                    <h3 className="text-[11px] font-bold text-[#0F1B2D] uppercase tracking-wider mb-3">📅 Próximos vencimientos</h3>
                    {allAlert.length === 0 ? (
                      <p className="text-[10px] text-gray-400 py-6 text-center">Sin alertas de vencimiento</p>
                    ) : (
                      <div className="space-y-0">
                        {allAlert.map((doc, idx) => {
                          const days = differenceInDays(new Date(doc.expiration_date!), new Date());
                          return (
                            <div key={doc.id} className={cn("flex items-center justify-between py-2 px-2 text-[10px] rounded", idx % 2 === 1 && "bg-gray-50/50")}>
                              <span className={cn("font-medium truncate flex-1", days < 0 ? "text-red-600" : "text-[#0F1B2D]")}>{doc.name}</span>
                              <span className="text-gray-400 w-16 text-right">{format(new Date(doc.expiration_date!), "dd/MM/yy")}</span>
                              <span className={cn("font-bold w-12 text-right tabular-nums", days < 0 ? "text-red-600" : days <= 30 ? "text-orange-500" : "text-gray-500")}>
                                {days < 0 ? `−${Math.abs(days)}d` : `${days}d`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const pendingDocs = currentDocs.filter(d => d.is_required && (!d.file_url || d.approval_status === "in_review" || d.approval_status === "rejected"));
                return (
                  <div className="bg-white rounded-lg border border-gray-100 p-4">
                    <h3 className="text-[11px] font-bold text-[#0F1B2D] uppercase tracking-wider mb-3">⏳ Requieren acción</h3>
                    {pendingDocs.length === 0 ? (
                      <p className="text-[10px] text-gray-400 py-6 text-center">Todo al día ✓</p>
                    ) : (
                      <div className="space-y-0">
                        {pendingDocs.map((doc, idx) => {
                          const ab = APPROVAL_BADGES[doc.approval_status ?? "draft"];
                          return (
                            <div key={doc.id} className={cn("flex items-center gap-2 py-2 px-2 text-[10px] rounded", idx % 2 === 1 && "bg-gray-50/50")}>
                              <span className="font-medium text-[#0F1B2D] truncate flex-1">{doc.name}</span>
                              <span className={cn("text-[8px] rounded-full px-1.5 py-0.5 shrink-0", ab.bg, ab.text)}>{ab.label}</span>
                              <span className="text-gray-400 w-16 text-right truncate">{doc.assigned_to || "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            SHARED MODALS
           ═══════════════════════════════════ */}

        {/* Add/Edit Modal */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-[560px] p-0 rounded-2xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-6 py-5 rounded-t-2xl">
              <DialogHeader>
                <DialogTitle className="text-white text-[15px] font-bold">
                  {editingId ? "Editar Documento" : "Subir Documento"}
                </DialogTitle>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  {editingId ? `Editando v${currentDocs.find(d => d.id === editingId)?.version ?? 1}` : "Nuevo documento"}
                </p>
              </DialogHeader>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Categoría</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.code} value={c.code}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Subcategoría</Label>
                  <Select value={form.subcategory} onValueChange={v => setForm({ ...form, subcategory: v })}>
                    <SelectTrigger className="text-[12px] h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {(SUBCHAPTERS[form.category] || []).map(s => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Nombre del documento *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="text-[12px] h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="text-[12px]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Estado de aprobación</Label>
                  <Select value={form.approval_status} onValueChange={v => setForm({ ...form, approval_status: v })}>
                    <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="in_review">En revisión</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Fecha de vencimiento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[12px] h-9", !form.expiration_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {form.expiration_date ? format(form.expiration_date, "dd/MM/yyyy") : "Sin vencimiento"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.expiration_date ?? undefined} onSelect={d => setForm({ ...form, expiration_date: d ?? null })} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Responsable</Label>
                  <Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="text-[12px] h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Fecha límite</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[12px] h-9", !form.due_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {form.due_date ? format(form.due_date, "dd/MM/yyyy") : "Sin fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.due_date ?? undefined} onSelect={d => setForm({ ...form, due_date: d ?? null })} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center gap-5 flex-wrap py-1">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_required} onCheckedChange={c => setForm({ ...form, is_required: c })} />
                  <Label className="text-[11px]">Requerido</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.visible_to_gc} onCheckedChange={c => setForm({ ...form, visible_to_gc: c })} />
                  <Label className="text-[11px]">👷 GC</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.visible_to_client} onCheckedChange={c => setForm({ ...form, visible_to_client: c })} />
                  <Label className="text-[11px]">👁 Cliente</Label>
                </div>
              </div>

              {/* File upload */}
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Archivo</Label>
                {uploadFile ? (
                  <div className="rounded-xl border-2 border-dashed border-[#0D7377]/30 bg-[#F0FDFA]/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0D7377]/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-[#0D7377]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-[#0F1B2D] truncate">{uploadFile.name}</p>
                        <p className="text-[9px] text-gray-400">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => setUploadFile(null)} className="text-gray-400 hover:text-red-500 text-sm">×</button>
                    </div>
                    <div className="mt-2 h-1 bg-[#0D7377]/20 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-[#0D7377] rounded-full" />
                    </div>
                    <p className="text-[9px] text-green-600 mt-1 font-medium">✓ Listo</p>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                    <FileUploadSource accept="any" onFileSelected={f => setUploadFile(f)} />
                    <p className="text-[10px] text-gray-400 mt-2">o arrastra aquí</p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="text-[12px]" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFormOpen(false)} className="text-[11px] text-gray-500">Cancelar</Button>
              <Button
                onClick={saveDoc}
                disabled={!form.name || uploading}
                className="text-[11px] bg-[#0D7377] hover:bg-[#0A5C5F] text-white rounded-lg px-5"
              >
                {uploading ? "Subiendo..." : editingId ? "Guardar cambios" : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject modal */}
        <Dialog open={!!rejectDocId} onOpenChange={() => setRejectDocId(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="text-[14px]">Rechazar documento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Motivo del rechazo *</Label>
              <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} placeholder="Ej: Documento incompleto, falta firma..." className="text-[12px]" />
              <Button onClick={rejectDoc} disabled={!rejectionReason} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px]">
                Rechazar documento
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteDoc} className="bg-red-600 hover:bg-red-700 rounded-lg">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import confirmation */}
        <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Cargar plantilla base</AlertDialogTitle>
              <AlertDialogDescription>
                Esto creará {templates.length} documentos requeridos para este proyecto basados en las 9 categorías del sistema. ¿Continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={importChecklist} className="bg-[#0D7377] hover:bg-[#0A5C5F] rounded-lg">Cargar plantilla</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default DocumentsAdmin;
