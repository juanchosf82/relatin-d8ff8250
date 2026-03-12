import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Paperclip, CalendarIcon, CheckCircle2, ShieldAlert, FileCheck, FileText } from "lucide-react";
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

type ViewMode = "obligatorios" | "expediente" | "checklist" | "estado";

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

function getObligatoryStatus(doc: ProjectDocument): "green" | "yellow" | "red" {
  if (doc.approval_status === "approved") {
    if (doc.expiration_date) {
      const days = differenceInDays(new Date(doc.expiration_date), new Date());
      if (days < 0) return "red";
      if (days <= 30) return "yellow";
    }
    return "green";
  }
  if (doc.approval_status === "in_review" || (doc.approval_status === "draft" && doc.file_url)) return "yellow";
  return "red";
}

function getExpirationBarColor(days: number): string {
  if (days < 30) return "bg-red-400";
  if (days <= 60) return "bg-amber-400";
  return "bg-green-500";
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════

const DocumentsAdmin = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("obligatorios");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

  // Compliance metrics
  const currentDocs = documents.filter(d => d.is_current_version !== false);
  const requiredDocs = currentDocs.filter(d => d.is_required);
  const approvedRequired = requiredDocs.filter(d => d.approval_status === "approved");
  const compliancePct = requiredDocs.length > 0 ? Math.round((approvedRequired.length / requiredDocs.length) * 100) : 0;

  // Status counts
  const approvedCount = currentDocs.filter(d => d.approval_status === "approved").length;
  const inReviewCount = currentDocs.filter(d => d.approval_status === "in_review").length;
  const pendingCount = currentDocs.filter(d => !d.file_url || d.approval_status === "draft").length;
  const expiredCount = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) < 0).length;
  const expiringSoonCount = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) >= 0 && differenceInDays(new Date(d.expiration_date), new Date()) <= 30).length;

  // Draw readiness
  const drawChecks = DRAW_REQUIRED_DOCS.map(name => {
    const doc = currentDocs.find(d => d.name.includes(name));
    const isApproved = doc?.approval_status === "approved";
    const isExpired = doc?.expiration_date ? differenceInDays(new Date(doc.expiration_date), new Date()) < 0 : false;
    return { name, doc, pass: isApproved && !isExpired };
  });
  const drawReady = drawChecks.every(c => c.pass);

  // Grouped by category code
  const groupedByCat = categories.reduce<Record<string, ProjectDocument[]>>((acc, cat) => {
    acc[cat.code] = currentDocs.filter(d => d.category === cat.code);
    return acc;
  }, {});

  // ── ACTIONS ──
  const openAdd = () => { setEditingId(null); setForm(emptyForm); setUploadFile(null); setFormOpen(true); };
  const openAddForCategory = (catCode: string) => { setEditingId(null); setForm({ ...emptyForm, category: catCode }); setUploadFile(null); setFormOpen(true); };

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
      const catPath = form.category;
      const path = `documentos/${projectId}/${catPath}/${Date.now()}.${ext}`;
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

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getCatName = (code: string) => categories.find(c => c.code === code)?.name || code;
  const getCatIcon = (code: string) => categories.find(c => c.code === code)?.icon || "📁";
  const getCatColor = (code: string) => categories.find(c => c.code === code)?.color || "#0D7377";

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">

        {/* ═══ TOP SECTION ═══ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-bold text-[#0F1B2D] tracking-tight">Documentación & Contratos</h2>
              <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide uppercase">Cap. 1</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-[#0F1B2D]">
                {compliancePct}% completado
              </span>
              <span className="text-[11px] text-gray-400">
                {approvedRequired.length} de {requiredDocs.length} documentos aprobados
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${compliancePct}%`,
                  background: "linear-gradient(90deg, #0D7377, #1A7A4A)",
                }}
              />
            </div>
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-[11px] font-medium text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Aprobados {approvedCount}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[11px] font-medium text-blue-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> En revisión {inReviewCount}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-[11px] font-medium text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Pendientes {pendingCount}
            </span>
            {expiredCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-[11px] font-medium text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Vencidos {expiredCount}
              </span>
            )}
            {expiringSoonCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-[11px] font-medium text-orange-600">
                ⚠️ Por vencer {expiringSoonCount}
              </span>
            )}
          </div>
        </div>

        {/* ═══ TAB BAR ═══ */}
        <div className="flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-8">
            {([
              { key: "obligatorios" as ViewMode, icon: "📋", label: "Obligatorios" },
              { key: "expediente" as ViewMode, icon: "🗂", label: "Expediente" },
              { key: "checklist" as ViewMode, icon: "✅", label: "Checklist" },
              { key: "estado" as ViewMode, icon: "📊", label: "Estado" },
            ]).map(v => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={cn(
                  "flex items-center gap-1.5 pb-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px",
                  viewMode === v.key
                    ? "text-[#0F1B2D] border-[#0F1B2D]"
                    : "text-gray-400 border-transparent hover:text-gray-700"
                )}
              >
                <span className="text-sm">{v.icon}</span> {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] font-medium text-gray-500 border-gray-200 rounded-md hover:bg-gray-50"
              onClick={() => setImportOpen(true)}
            >
              Plantilla base
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px] font-medium bg-[#0D7377] hover:bg-[#0A5C5F] text-white rounded-md"
              onClick={openAdd}
            >
              <Plus className="h-3 w-3 mr-1" /> Agregar documento
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════
            VIEW 1: OBLIGATORIOS
           ═══════════════════════════════════ */}
        {viewMode === "obligatorios" && (
          <div className="space-y-5">
            {/* Draw Readiness Card */}
            <div className={cn(
              "rounded-xl p-5 shadow-sm border-l-4",
              drawReady
                ? "bg-green-50/60 border-l-green-600"
                : "bg-orange-50/60 border-l-orange-500"
            )}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🏦</span>
                <h3 className="text-[13px] font-bold text-[#0F1B2D]">Listo para Draw</h3>
              </div>
              <div className="space-y-2">
                {drawChecks.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[12px]">
                      {c.pass
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        : <span className="w-4 h-4 rounded-full border-2 border-orange-400 shrink-0 flex items-center justify-center text-[8px] text-orange-500">✗</span>
                      }
                      <span className={c.pass ? "text-gray-600" : "font-medium text-[#0F1B2D]"}>{c.name}</span>
                    </div>
                    {!c.pass && c.doc && (
                      <button
                        onClick={() => c.doc && handleQuickUploadTrigger(c.doc.id)}
                        className="text-[10px] font-medium text-[#0D7377] hover:underline"
                      >
                        Subir →
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", drawReady ? "bg-green-500" : "bg-orange-400")}
                    style={{ width: `${(drawChecks.filter(c => c.pass).length / drawChecks.length) * 100}%` }}
                  />
                </div>
                <span className={cn("text-[11px] font-semibold", drawReady ? "text-green-700" : "text-orange-600")}>
                  {drawReady ? "Listo" : "No listo"}
                </span>
              </div>
            </div>

            {/* Mandatory docs grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentDocs.filter(d => d.is_required).map(doc => {
                const status = getObligatoryStatus(doc);
                const catColor = getCatColor(doc.category);
                const approvalBadge = APPROVAL_BADGES[doc.approval_status ?? "draft"];
                const daysToExpire = doc.expiration_date ? differenceInDays(new Date(doc.expiration_date), new Date()) : null;

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-px transition-all duration-150 group"
                    style={{ borderTopWidth: 3, borderTopColor: catColor }}
                  >
                    {/* Status dot */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        status === "green" ? "bg-green-500" : status === "yellow" ? "bg-amber-400" : "bg-red-500"
                      )} />
                      <Badge className={cn("border-0 text-[9px] rounded-full px-2", approvalBadge.bg, approvalBadge.text)}>
                        {approvalBadge.label}
                      </Badge>
                    </div>

                    {/* Category label */}
                    <p className="text-[10px] uppercase tracking-[0.08em] font-semibold mb-1" style={{ color: catColor }}>
                      {getCatIcon(doc.category)} {getCatName(doc.category)}
                    </p>

                    {/* Document name */}
                    <p className="text-[13px] font-medium text-[#0F1B2D] leading-snug mb-3">{doc.name}</p>

                    {/* Expiration bar */}
                    {daysToExpire !== null && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className={daysToExpire < 0 ? "text-red-600 font-medium" : daysToExpire <= 30 ? "text-orange-500" : "text-gray-400"}>
                            {daysToExpire < 0 ? `Vencido hace ${Math.abs(daysToExpire)}d` : `Vence: ${format(new Date(doc.expiration_date!), "MMM d, yyyy")}`}
                          </span>
                          {daysToExpire >= 0 && <span className="text-gray-400">{daysToExpire}d</span>}
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", daysToExpire < 0 ? "bg-red-400" : getExpirationBarColor(daysToExpire))}
                            style={{ width: `${Math.min(100, Math.max(5, daysToExpire < 0 ? 100 : (daysToExpire / 90) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-[#0D7377] hover:underline">
                          Ver archivo
                        </a>
                      )}
                      {!doc.file_url && (
                        <FileUploadSource accept="pdf+images" compact onFileSelected={f => handleQuickUpload(doc.id, f)} />
                      )}
                      {doc.file_url && doc.approval_status !== "approved" && (
                        <button onClick={() => approveDoc(doc.id)} className="text-[11px] text-gray-500 hover:text-green-600">
                          Aprobar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            VIEW 2: EXPEDIENTE
           ═══════════════════════════════════ */}
        {viewMode === "expediente" && (
          <div className="space-y-2">
            {currentDocs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-[12px]">
                <FileText className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                Sin documentos. Usa "Plantilla base" para comenzar.
              </div>
            ) : (
              categories.map(cat => {
                const items = groupedByCat[cat.code] || [];
                if (items.length === 0) return null;
                const catRequired = items.filter(d => d.is_required);
                const catApproved = catRequired.filter(d => d.approval_status === "approved");
                const catPct = catRequired.length > 0 ? Math.round((catApproved.length / catRequired.length) * 100) : 100;
                const hasExpiring = items.some(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) <= 30 && differenceInDays(new Date(d.expiration_date), new Date()) >= 0);
                const hasExpired = items.some(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) < 0);
                const isOpen = openCategories[cat.code] !== false;
                const catColor = cat.color || "#0D7377";

                return (
                  <Collapsible key={cat.code} open={isOpen} onOpenChange={() => toggleCategory(cat.code)}>
                    <CollapsibleTrigger asChild>
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border-b border-gray-100 transition-colors"
                        style={{ borderLeft: `4px solid ${catColor}` }}
                      >
                        <div className="flex items-center gap-2.5">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                          <span className="text-base">{cat.icon}</span>
                          <span className="text-[12px] font-bold text-[#0F1B2D] uppercase tracking-[0.06em]">{cat.name}</span>
                          <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px] rounded-full px-2">{catApproved.length}/{catRequired.length}</Badge>
                          {hasExpired && <span className="w-2 h-2 rounded-full bg-red-500" />}
                          {hasExpiring && !hasExpired && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-gray-400 hidden md:inline">
                            {catApproved.length} aprobados
                            {items.filter(d => d.approval_status === "in_review").length > 0 && ` · ${items.filter(d => d.approval_status === "in_review").length} en revisión`}
                            {items.filter(d => !d.file_url).length > 0 && ` · ${items.filter(d => !d.file_url).length} pendientes`}
                          </span>
                          <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", catPct >= 90 ? "bg-green-500" : catPct >= 50 ? "bg-amber-400" : "bg-red-400")}
                              style={{ width: `${catPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 w-8 text-right">{catPct}%</span>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="bg-white">
                        {items.map((doc, idx) => {
                          const dot = getDocStatusDot(doc);
                          const approvalBadge = APPROVAL_BADGES[doc.approval_status ?? "draft"];
                          const isExpired = doc.expiration_date && differenceInDays(new Date(doc.expiration_date), new Date()) < 0;
                          const isExpiringSoon = doc.expiration_date && !isExpired && differenceInDays(new Date(doc.expiration_date), new Date()) <= 30;

                          return (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 px-4 py-2.5 pl-10 border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-[12px]"
                            >
                              {/* Status dot */}
                              <Tooltip>
                                <TooltipTrigger><div className={cn("w-2 h-2 rounded-full shrink-0", dot.color)} /></TooltipTrigger>
                                <TooltipContent side="left" className="text-[11px]">{dot.label}</TooltipContent>
                              </Tooltip>

                              {/* Name */}
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-[#0F1B2D]">{doc.name}</span>
                                {doc.description && <p className="text-[10px] text-gray-400 italic truncate">{doc.description}</p>}
                              </div>

                              {/* Version */}
                              <Badge className="bg-gray-100 text-gray-500 border-0 text-[9px] rounded-full px-2 shrink-0">
                                v{doc.version ?? 1}
                              </Badge>

                              {/* Responsible */}
                              <span className="text-[11px] text-gray-500 w-20 truncate hidden lg:block">{doc.assigned_to || "—"}</span>

                              {/* Expiration */}
                              <span className={cn(
                                "text-[11px] w-20 truncate hidden md:block",
                                isExpired ? "text-red-600 font-medium" : isExpiringSoon ? "text-orange-500 font-medium" : "text-gray-400"
                              )}>
                                {doc.expiration_date ? format(new Date(doc.expiration_date), "dd/MM/yyyy") : "—"}
                              </span>

                              {/* Approval badge */}
                              <Badge className={cn("border-0 text-[9px] shrink-0 rounded-full px-2", approvalBadge.bg, approvalBadge.text)}>
                                {approvalBadge.label}
                              </Badge>

                              {/* Visibility toggles */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={async () => { await supabase.from("project_documents").update({ visible_to_gc: !doc.visible_to_gc }).eq("id", doc.id); fetchAll(); }}
                                  className={cn("text-[11px] p-0.5 rounded transition-colors", doc.visible_to_gc ? "text-[#E07B39]" : "text-gray-300 hover:text-gray-400")}
                                  title="GC"
                                >👷</button>
                                <button
                                  onClick={async () => { await supabase.from("project_documents").update({ visible_to_client: !doc.visible_to_client }).eq("id", doc.id); fetchAll(); }}
                                  className={cn("text-[11px] p-0.5 rounded transition-colors", doc.visible_to_client ? "text-[#0D7377]" : "text-gray-300 hover:text-gray-400")}
                                  title="Cliente"
                                >👁</button>
                              </div>

                              {/* File icon */}
                              {doc.file_url ? (
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                  <Paperclip className={cn("h-3.5 w-3.5", doc.approval_status === "approved" ? "text-[#0D7377]" : "text-gray-400")} />
                                </a>
                              ) : (
                                <Paperclip className="h-3.5 w-3.5 text-gray-200 shrink-0" />
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                {doc.file_url && doc.approval_status === "draft" && (
                                  <button onClick={() => submitForReview(doc.id)} className="p-1 rounded hover:bg-blue-50" title="Enviar a revisión">
                                    <FileCheck className="h-3.5 w-3.5 text-blue-500" />
                                  </button>
                                )}
                                {doc.approval_status === "in_review" && (
                                  <>
                                    <button onClick={() => approveDoc(doc.id)} className="p-1 rounded hover:bg-green-50" title="Aprobar">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    </button>
                                    <button onClick={() => { setRejectDocId(doc.id); setRejectionReason(""); }} className="p-1 rounded hover:bg-red-50" title="Rechazar">
                                      <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                                    </button>
                                  </>
                                )}
                                <button onClick={() => openEdit(doc)} className="p-1 rounded hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-gray-400 hover:text-[#0D7377]" /></button>
                                <button onClick={() => setDeleteId(doc.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-gray-300 hover:text-red-500" /></button>
                              </div>
                            </div>
                          );
                        })}
                        {/* Add document for this category */}
                        <button
                          onClick={() => openAddForCategory(cat.code)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-[#0D7377] border-t border-dashed border-gray-200 hover:bg-[#E8F4F4]/30 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Agregar documento
                        </button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        )}

        {/* ═══════════════════════════════════
            VIEW 3: CHECKLIST (Kanban)
           ═══════════════════════════════════ */}
        {viewMode === "checklist" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {([
              { key: "draft", label: "Pendiente", dotColor: "bg-gray-400", headerColor: "text-gray-600", bgCol: "bg-gray-50/80", filter: (d: ProjectDocument) => d.approval_status === "draft" || (!d.file_url && d.approval_status !== "in_review" && d.approval_status !== "approved" && d.approval_status !== "rejected") },
              { key: "in_review", label: "Revisión", dotColor: "bg-blue-500", headerColor: "text-blue-600", bgCol: "bg-blue-50/40", filter: (d: ProjectDocument) => d.approval_status === "in_review" },
              { key: "approved", label: "Aprobado", dotColor: "bg-green-500", headerColor: "text-green-700", bgCol: "bg-green-50/40", filter: (d: ProjectDocument) => d.approval_status === "approved" && (!d.expiration_date || differenceInDays(new Date(d.expiration_date), new Date()) > 0) },
              { key: "expired", label: "Rechazado / Vencido", dotColor: "bg-red-500", headerColor: "text-red-600", bgCol: "bg-red-50/40", filter: (d: ProjectDocument) => d.approval_status === "rejected" || (d.expiration_date ? differenceInDays(new Date(d.expiration_date), new Date()) < 0 : false) },
            ]).map(col => {
              let colDocs: ProjectDocument[];
              if (col.key === "draft") {
                colDocs = currentDocs.filter(d => d.approval_status === "draft" || (!d.file_url && d.approval_status !== "in_review" && d.approval_status !== "approved" && d.approval_status !== "rejected"));
              } else {
                colDocs = currentDocs.filter(col.filter);
              }

              return (
                <div key={col.key} className={cn("rounded-xl p-3", col.bgCol)}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                    <h3 className={cn("text-[11px] font-bold uppercase tracking-[0.06em]", col.headerColor)}>{col.label}</h3>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", col.bgCol, col.headerColor)}>{colDocs.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colDocs.map(doc => {
                      const cat = categories.find(c => c.code === doc.category);
                      const borderColor = cat?.color || "#0D7377";
                      const daysToExpire = doc.expiration_date ? differenceInDays(new Date(doc.expiration_date), new Date()) : null;
                      return (
                        <div
                          key={doc.id}
                          className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-150 space-y-2"
                          style={{ borderLeft: `3px solid ${borderColor}` }}
                        >
                          <p className="text-[10px] text-gray-400">{cat?.icon} {cat?.name}</p>
                          <p className="text-[12px] font-semibold text-[#0F1B2D] leading-tight">{doc.name}</p>
                          <div className="text-[10px] text-gray-500 space-y-0.5">
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
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-[#0D7377] hover:underline">
                                Ver
                              </a>
                            )}
                            {!doc.file_url && <FileUploadSource accept="pdf+images" compact onFileSelected={f => handleQuickUpload(doc.id, f)} />}
                          </div>
                        </div>
                      );
                    })}
                    {colDocs.length === 0 && <p className="text-gray-300 text-[11px] text-center py-6">Sin documentos</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════
            VIEW 4: ESTADO (Dashboard)
           ═══════════════════════════════════ */}
        {viewMode === "estado" && (
          <div className="space-y-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total docs", value: `${currentDocs.length}`, sub: `${compliancePct}%`, borderColor: "#0F1B2D" },
                { label: "Aprobados", value: `${approvedCount}`, sub: "✓", borderColor: "#1A7A4A" },
                { label: "Acción requerida", value: `${currentDocs.filter(d => d.approval_status === "in_review" || (d.is_required && !d.file_url)).length}`, sub: "⚠️", borderColor: "#E07B39" },
                { label: "Vencidos / Alertas", value: `${expiredCount + expiringSoonCount}`, sub: "🔴", borderColor: "#DC2626" },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm" style={{ borderTop: `3px solid ${kpi.borderColor}` }}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{kpi.label}</p>
                  <p className="text-[28px] font-bold text-[#0F1B2D] leading-none">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Category completion bars */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-[12px] font-bold text-[#0F1B2D] uppercase tracking-wide mb-4">Completitud por categoría</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                {categories.map(cat => {
                  const items = groupedByCat[cat.code] || [];
                  const req = items.filter(d => d.is_required);
                  const approved = req.filter(d => d.approval_status === "approved");
                  const pct = req.length > 0 ? Math.round((approved.length / req.length) * 100) : (items.length > 0 ? 100 : 0);
                  if (items.length === 0) return null;
                  const hasIssue = pct < 50;
                  return (
                    <div key={cat.code} className="flex items-center gap-3 py-2.5 border-b border-gray-50">
                      <span className="text-sm w-5">{cat.icon}</span>
                      <span className="text-[12px] font-medium text-[#0F1B2D] w-32 truncate">{cat.name}</span>
                      <div className="flex-1 h-[6px] bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 w-8 text-right tabular-nums">{pct}%</span>
                      <span className="text-[10px] text-gray-400 w-10">{approved.length}/{req.length}</span>
                      {hasIssue && <span className="text-[10px]">⚠️</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expiration + Pending tables side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Expiration alerts */}
              {(() => {
                const expiringDocs = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) <= 60 && differenceInDays(new Date(d.expiration_date), new Date()) >= 0);
                const expiredDocs = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) < 0);
                const allAlert = [...expiredDocs, ...expiringDocs];
                return (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <h3 className="text-[12px] font-bold text-[#0F1B2D] uppercase tracking-wide mb-3">📅 Próximos vencimientos</h3>
                    {allAlert.length === 0 ? (
                      <p className="text-[11px] text-gray-400 py-4 text-center">Sin alertas de vencimiento</p>
                    ) : (
                      <div className="space-y-0">
                        {allAlert.map((doc, idx) => {
                          const days = differenceInDays(new Date(doc.expiration_date!), new Date());
                          return (
                            <div key={doc.id} className={cn("flex items-center justify-between py-2 text-[11px]", idx % 2 === 1 && "bg-gray-50/50")}>
                              <span className={cn("font-medium truncate flex-1", days < 0 ? "text-red-600" : "text-[#0F1B2D]")}>{doc.name}</span>
                              <span className="text-gray-400 w-20 text-right">{format(new Date(doc.expiration_date!), "dd/MM/yy")}</span>
                              <span className={cn("font-bold w-20 text-right", days < 0 ? "text-red-600" : days <= 30 ? "text-orange-500" : "text-gray-500")}>
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

              {/* Pending actions */}
              {(() => {
                const pendingDocs = currentDocs.filter(d => d.is_required && (!d.file_url || d.approval_status === "in_review" || d.approval_status === "rejected"));
                return (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <h3 className="text-[12px] font-bold text-[#0F1B2D] uppercase tracking-wide mb-3">⏳ Requieren acción</h3>
                    {pendingDocs.length === 0 ? (
                      <p className="text-[11px] text-gray-400 py-4 text-center">Todo al día ✓</p>
                    ) : (
                      <div className="space-y-0">
                        {pendingDocs.map((doc, idx) => {
                          const ab = APPROVAL_BADGES[doc.approval_status ?? "draft"];
                          return (
                            <div key={doc.id} className={cn("flex items-center gap-2 py-2 text-[11px]", idx % 2 === 1 && "bg-gray-50/50")}>
                              <span className="font-medium text-[#0F1B2D] truncate flex-1">{doc.name}</span>
                              <Badge className={cn("border-0 text-[9px] shrink-0", ab.bg, ab.text)}>{ab.label}</Badge>
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
            {/* Modal header */}
            <div className="bg-[#0F1B2D] px-6 py-5 rounded-t-2xl">
              <DialogHeader>
                <DialogTitle className="text-white text-[16px] font-bold">
                  {editingId ? "Editar Documento" : "Subir Documento"}
                </DialogTitle>
                <p className="text-gray-400 text-[12px] mt-0.5">
                  {editingId ? `Editando v${currentDocs.find(d => d.id === editingId)?.version ?? 1}` : "Nuevo documento"}
                </p>
              </DialogHeader>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Categoría</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.code} value={c.code}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Subcategoría</Label>
                  <Input value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} className="text-[12px]" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Nombre del documento *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="text-[12px]" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="text-[12px]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Estado de aprobación</Label>
                  <Select value={form.approval_status} onValueChange={v => setForm({ ...form, approval_status: v })}>
                    <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="in_review">En revisión</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Fecha de vencimiento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[12px]", !form.expiration_date && "text-muted-foreground")}>
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
                  <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Responsable</Label>
                  <Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="text-[12px]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Fecha límite</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[12px]", !form.due_date && "text-muted-foreground")}>
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

              {/* File upload zone */}
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Archivo</Label>
                {uploadFile ? (
                  <div className="rounded-xl border-2 border-[#0D7377]/20 bg-[#E8F4F4]/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0D7377]/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-[#0D7377]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#0F1B2D] truncate">{uploadFile.name}</p>
                        <p className="text-[10px] text-gray-400">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => setUploadFile(null)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                    </div>
                    <div className="mt-2 h-1 bg-[#0D7377]/20 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-[#0D7377] rounded-full" />
                    </div>
                    <p className="text-[10px] text-green-600 mt-1 font-medium">✓ Listo</p>
                  </div>
                ) : (
                  <FileUploadSource accept="any" onFileSelected={f => setUploadFile(f)} />
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="text-[12px]" />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFormOpen(false)} className="text-[12px] text-gray-500">Cancelar</Button>
              <Button
                onClick={saveDoc}
                disabled={!form.name || uploading}
                className="text-[12px] bg-[#0D7377] hover:bg-[#0A5C5F] text-white rounded-lg px-5"
              >
                {uploading ? "Subiendo..." : editingId ? "Guardar cambios" : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject modal */}
        <Dialog open={!!rejectDocId} onOpenChange={() => setRejectDocId(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="text-[15px]">Rechazar documento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label className="text-[11px] text-gray-400 uppercase tracking-wide">Motivo del rechazo *</Label>
              <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} placeholder="Ej: Documento incompleto, falta firma..." className="text-[12px]" />
              <Button onClick={rejectDoc} disabled={!rejectionReason} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg text-[12px]">
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

// Helper — trigger file input for draw readiness quick upload
function handleQuickUploadTrigger(docId: string) {
  // This is a no-op placeholder; the actual upload happens via FileUploadSource in the grid
}

export default DocumentsAdmin;
