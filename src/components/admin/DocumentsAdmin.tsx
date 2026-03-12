import { useState, useEffect, useRef } from "react";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, ChevronDown, ChevronRight, Paperclip, CalendarIcon, CheckCircle2, FolderOpen, CheckSquare, BarChart3, ClipboardList, ShieldCheck, ShieldAlert, FileCheck } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import FileUploadSource from "@/components/FileUploadSource";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  BTN_SUCCESS, BTN_PRIMARY,
  PAGE_TITLE,
} from "@/lib/design-system";

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
  // New columns
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
  draft: { bg: "bg-gray-100", text: "text-gray-500", label: "Borrador" },
  in_review: { bg: "bg-blue-50", text: "text-blue-700", label: "En revisión" },
  approved: { bg: "bg-green-50", text: "text-green-700", label: "Aprobado ✓" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rechazado ✗" },
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
      if (days <= 30) return { color: "bg-yellow-500", label: "Vence pronto" };
    }
    return { color: "bg-green-500", label: "Aprobado" };
  }
  if (doc.approval_status === "in_review") return { color: "bg-blue-500", label: "En revisión" };
  if (doc.approval_status === "rejected") return { color: "bg-red-500", label: "Rechazado" };
  if (doc.file_url) return { color: "bg-yellow-500", label: "Borrador con archivo" };
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
  const complianceColor = compliancePct >= 80 ? "bg-green-500" : compliancePct >= 50 ? "bg-orange-500" : "bg-red-500";

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
      // Check if uploading new version
      const existingDoc = currentDocs.find(d => d.id === editingId);
      if (uploadFile && existingDoc?.file_url) {
        // Create new version
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
      // New version
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
    setApproveDocId(null);
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

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className={PAGE_TITLE}>Documentación & Contratos — Cap. 1</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-[11px] font-medium gap-1.5" onClick={() => setImportOpen(true)}>
            Cargar plantilla base
          </Button>
          <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar documento
          </Button>
        </div>
      </div>

      {/* VIEW TOGGLES */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
        {([
          { key: "obligatorios" as ViewMode, icon: ClipboardList, label: "Obligatorios" },
          { key: "expediente" as ViewMode, icon: FolderOpen, label: "Expediente" },
          { key: "checklist" as ViewMode, icon: CheckSquare, label: "Checklist" },
          { key: "estado" as ViewMode, icon: BarChart3, label: "Estado" },
        ]).map(v => (
          <button
            key={v.key}
            onClick={() => setViewMode(v.key)}
            className={cn("px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 transition-colors",
              viewMode === v.key ? "bg-[#0F1B2D] text-white" : "bg-white text-gray-500 hover:bg-gray-50")}
          >
            <v.icon className="h-3.5 w-3.5" /> {v.label}
          </button>
        ))}
      </div>

      {/* COMPLETENESS BAR */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-bold text-[#0F1B2D]">
            Expediente completo: {approvedRequired.length}/{requiredDocs.length} documentos — {compliancePct}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${complianceColor}`} style={{ width: `${compliancePct}%` }} />
        </div>
      </div>

      {/* ═══════════════════════════════════
          VIEW 1: OBLIGATORIOS
         ═══════════════════════════════════ */}
      {viewMode === "obligatorios" && (
        <div className="space-y-4">
          {/* Draw Readiness */}
          <div className={`bg-white rounded-lg border-2 ${drawReady ? "border-green-400" : "border-orange-400"} shadow-sm p-4`}>
            <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-3 flex items-center gap-2">
              {drawReady ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldAlert className="h-4 w-4 text-orange-500" />}
              {drawReady ? "✅ Listo para draw" : "⚠️ No listo para draw"}
            </h3>
            <div className="space-y-1.5">
              {drawChecks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  {c.pass ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <span className="text-orange-500 shrink-0">⏳</span>}
                  <span className={c.pass ? "text-gray-600" : "font-medium text-[#0F1B2D]"}>{c.name}</span>
                  {!c.pass && <Badge className="bg-red-50 text-red-600 border-0 text-[9px] ml-auto">PENDIENTE</Badge>}
                </div>
              ))}
            </div>
          </div>

          {/* Mandatory docs grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentDocs.filter(d => d.is_required).map(doc => {
              const status = getObligatoryStatus(doc);
              const statusColors = { green: "border-l-green-500 bg-green-50/30", yellow: "border-l-yellow-500 bg-yellow-50/30", red: "border-l-red-500 bg-red-50/30" };
              const statusDots = { green: "🟢", yellow: "🟡", red: "🔴" };
              const approvalBadge = APPROVAL_BADGES[doc.approval_status ?? "draft"];

              return (
                <div key={doc.id} className={`rounded-lg border border-gray-200 border-l-4 ${statusColors[status]} p-3 space-y-2`}>
                  <div className="flex items-center gap-2">
                    <span>{statusDots[status]}</span>
                    <span className="text-sm">{getCatIcon(doc.category)}</span>
                    <Badge className="bg-gray-100 text-gray-600 border-0 text-[9px]">{getCatName(doc.category)}</Badge>
                  </div>
                  <p className="text-[12px] font-semibold text-[#0F1B2D]">{doc.name}</p>
                  <div className="text-[11px] text-gray-500 space-y-0.5">
                    <p>Estado: <Badge className={`${approvalBadge.bg} ${approvalBadge.text} border-0 text-[9px]`}>{approvalBadge.label}</Badge></p>
                    {doc.expiration_date && (
                      <p className={differenceInDays(new Date(doc.expiration_date), new Date()) <= 30 ? "text-orange-600 font-medium" : ""}>
                        Vence: {format(new Date(doc.expiration_date), "dd/MM/yyyy")}
                        {differenceInDays(new Date(doc.expiration_date), new Date()) >= 0 && ` (${differenceInDays(new Date(doc.expiration_date), new Date())} días)`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[#E8F4F4] text-[#0D7377] hover:bg-[#d0ecec]">
                        <Eye className="h-3 w-3" /> Ver
                      </a>
                    )}
                    {!doc.file_url && (
                      <FileUploadSource accept="pdf+images" compact onFileSelected={f => handleQuickUpload(doc.id, f)} />
                    )}
                    {doc.file_url && doc.approval_status !== "approved" && (
                      <button onClick={() => approveDoc(doc.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-green-50 text-green-700 hover:bg-green-100">
                        <CheckCircle2 className="h-3 w-3" /> Aprobar
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
            <div className="text-center py-12 text-gray-400 text-[12px]">
              Sin documentos. Usa "Cargar plantilla base" para comenzar.
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

              return (
                <Collapsible key={cat.code} open={isOpen} onOpenChange={() => toggleCategory(cat.code)}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-[13px] font-semibold text-[#0F1B2D] uppercase tracking-wide">{cat.name}</span>
                        <span className="text-[11px] text-gray-500 ml-2">[{catApproved.length}/{catRequired.length}]</span>
                        {hasExpired && <span className="text-red-500 text-[10px]">🔴</span>}
                        {hasExpiring && !hasExpired && <span className="text-yellow-500 text-[10px]">🟡</span>}
                        <span className="text-[11px] text-gray-400 ml-1">
                          {catApproved.length} aprobados
                          {items.filter(d => d.approval_status === "in_review").length > 0 && ` | ${items.filter(d => d.approval_status === "in_review").length} en revisión`}
                          {items.filter(d => !d.file_url).length > 0 && ` | ${items.filter(d => !d.file_url).length} pendientes`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${catPct >= 90 ? "bg-green-500" : catPct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${catPct}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-500 w-8 text-right">{catPct}%</span>
                        {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-white rounded-b-lg border border-t-0 border-gray-200 overflow-hidden">
                      <table className="w-full text-[12px] border-collapse">
                        <thead>
                          <tr>
                            <th className={`${TH_CLASS} w-6`}></th>
                            <th className={TH_CLASS}>Documento</th>
                            <th className={TH_CLASS}>Ver.</th>
                            <th className={TH_CLASS}>Aprobación</th>
                            <th className={TH_CLASS}>Vencimiento</th>
                            <th className={TH_CLASS}>Archivo</th>
                            <th className={`${TH_CLASS} text-center`}>Visibilidad</th>
                            <th className={TH_CLASS}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((doc, idx) => {
                            const dot = getDocStatusDot(doc);
                            const approvalBadge = APPROVAL_BADGES[doc.approval_status ?? "draft"];
                            const isExpired = doc.expiration_date && differenceInDays(new Date(doc.expiration_date), new Date()) < 0;
                            const isExpiringSoon = doc.expiration_date && !isExpired && differenceInDays(new Date(doc.expiration_date), new Date()) <= 30;

                            return (
                              <tr key={doc.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                                <td className={TD_CLASS}>
                                  <div className={`w-2 h-2 rounded-full ${dot.color}`} title={dot.label} />
                                </td>
                                <td className={`${TD_CLASS} max-w-[220px]`}>
                                  <span className="font-medium">{doc.name}</span>
                                  {doc.description && <p className="text-[11px] text-gray-400 truncate">{doc.description}</p>}
                                  {doc.assigned_to && <p className="text-[10px] text-gray-400">👤 {doc.assigned_to}</p>}
                                </td>
                                <td className={TD_CLASS}>
                                  <Badge className="bg-gray-100 text-gray-600 border-0 text-[9px] rounded-full">v{doc.version ?? 1}</Badge>
                                </td>
                                <td className={TD_CLASS}>
                                  <Badge className={`${approvalBadge.bg} ${approvalBadge.text} border-0 text-[9px]`}>{approvalBadge.label}</Badge>
                                  {doc.rejection_reason && <p className="text-[10px] text-red-500 mt-0.5" title={doc.rejection_reason}>📝 {doc.rejection_reason.slice(0, 30)}...</p>}
                                </td>
                                <td className={TD_CLASS}>
                                  {doc.expiration_date ? (
                                    <span className={`text-[11px] ${isExpired ? "text-red-600 font-bold" : isExpiringSoon ? "text-orange-500 font-medium" : "text-gray-500"}`}>
                                      {format(new Date(doc.expiration_date), "dd/MM/yyyy")}
                                    </span>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className={TD_CLASS}>
                                  {doc.file_url ? (
                                    <div className="flex items-center gap-1">
                                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1">
                                        <Paperclip className="h-3 w-3" /> {doc.file_name?.slice(0, 20) || "Archivo"}
                                      </a>
                                      <FileUploadSource accept="pdf+images" compact onFileSelected={f => handleQuickUpload(doc.id, f)} />
                                    </div>
                                  ) : (
                                    <FileUploadSource accept="pdf+images" compact onFileSelected={f => handleQuickUpload(doc.id, f)} />
                                  )}
                                </td>
                                <td className={`${TD_CLASS} text-center`}>
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={async () => { await supabase.from("project_documents").update({ visible_to_gc: !doc.visible_to_gc }).eq("id", doc.id); fetchAll(); }}
                                      title="Visible para GC"
                                      className={`p-0.5 rounded text-[10px] ${doc.visible_to_gc ? "text-orange-600" : "text-gray-300"}`}
                                    >👷</button>
                                    <button
                                      onClick={async () => { await supabase.from("project_documents").update({ visible_to_client: !doc.visible_to_client }).eq("id", doc.id); fetchAll(); }}
                                      title="Visible para cliente"
                                      className={`p-0.5 rounded text-[10px] ${doc.visible_to_client ? "text-[#0D7377]" : "text-gray-300"}`}
                                    >👁</button>
                                  </div>
                                </td>
                                <td className={TD_CLASS}>
                                  <div className="flex gap-0.5">
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
                                    <button onClick={() => openEdit(doc)} className="p-1 rounded hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-[#0D7377]" /></button>
                                    <button onClick={() => setDeleteId(doc.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="px-4 py-2 border-t border-gray-100">
                        <button onClick={() => openAddForCategory(cat.code)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium text-[#0D7377] border border-[#0D7377] hover:bg-[#E8F4F4] transition-colors">
                          <Plus className="h-3 w-3" /> Agregar documento
                        </button>
                      </div>
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
            { key: "draft", label: "Pendiente", emoji: "🔴", filter: (d: ProjectDocument) => !d.file_url || d.approval_status === "draft" },
            { key: "in_review", label: "En revisión", emoji: "🔵", filter: (d: ProjectDocument) => d.approval_status === "in_review" },
            { key: "approved", label: "Aprobado", emoji: "🟢", filter: (d: ProjectDocument) => d.approval_status === "approved" && (!d.expiration_date || differenceInDays(new Date(d.expiration_date), new Date()) > 0) },
            { key: "expired", label: "Vencido / Rechazado", emoji: "🔴", filter: (d: ProjectDocument) => d.approval_status === "rejected" || (d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) < 0) },
          ]).map(col => {
            // For "draft" column, exclude docs that are in_review, approved, or rejected
            let colDocs: ProjectDocument[];
            if (col.key === "draft") {
              colDocs = currentDocs.filter(d => d.approval_status === "draft" || (!d.file_url && d.approval_status !== "in_review" && d.approval_status !== "approved" && d.approval_status !== "rejected"));
            } else {
              colDocs = currentDocs.filter(col.filter);
            }

            return (
              <div key={col.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{col.emoji}</span>
                  <h3 className="text-[13px] font-bold text-[#0F1B2D] uppercase tracking-wide">{col.label}</h3>
                  <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">{colDocs.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colDocs.map(doc => {
                    const cat = categories.find(c => c.code === doc.category);
                    const borderColor = cat?.color || "#0D7377";
                    return (
                      <div key={doc.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 space-y-2" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{cat?.icon || "📁"}</span>
                          <span className="text-[12px] font-semibold text-[#0F1B2D] leading-tight">{doc.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 space-y-0.5">
                          {doc.assigned_to && <p>👤 {doc.assigned_to}</p>}
                          {doc.due_date && (
                            <p className={differenceInDays(new Date(doc.due_date), new Date()) < 0 ? "text-red-500 font-medium" : ""}>
                              🎯 {format(new Date(doc.due_date), "dd MMM", { locale: es })}
                            </p>
                          )}
                          {doc.expiration_date && (
                            <p className={differenceInDays(new Date(doc.expiration_date), new Date()) <= 30 ? "text-orange-500 font-medium" : ""}>
                              📅 Vence: {format(new Date(doc.expiration_date), "dd MMM", { locale: es })}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[#E8F4F4] text-[#0D7377]">
                              <Eye className="h-3 w-3" /> Ver
                            </a>
                          )}
                          {!doc.file_url && <FileUploadSource accept="pdf+images" compact onFileSelected={f => handleQuickUpload(doc.id, f)} />}
                        </div>
                      </div>
                    );
                  })}
                  {colDocs.length === 0 && <p className="text-gray-400 text-[11px] text-center py-4">—</p>}
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
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Total documentos</p>
              <p className="text-[24px] font-bold text-[#0F1B2D]">{approvedRequired.length}/{requiredDocs.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Aprobados</p>
              <p className="text-[24px] font-bold text-green-600">{currentDocs.filter(d => d.approval_status === "approved").length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Requieren acción</p>
              <p className="text-[24px] font-bold text-orange-500">{currentDocs.filter(d => d.approval_status === "in_review" || (d.is_required && !d.file_url)).length}</p>
            </div>
          </div>

          {/* Category completion bars */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
            <h3 className="text-[13px] font-bold text-[#0F1B2D]">Completitud por categoría</h3>
            {categories.map(cat => {
              const items = groupedByCat[cat.code] || [];
              const req = items.filter(d => d.is_required);
              const approved = req.filter(d => d.approval_status === "approved");
              const pct = req.length > 0 ? Math.round((approved.length / req.length) * 100) : (items.length > 0 ? 100 : 0);
              if (items.length === 0) return null;
              return (
                <div key={cat.code} className="flex items-center gap-3">
                  <span className="text-sm w-5">{cat.icon}</span>
                  <span className="text-[12px] font-medium text-[#0F1B2D] w-40 truncate">{cat.name}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-500 w-16 text-right">{pct}% [{approved.length}/{req.length}]</span>
                </div>
              );
            })}
          </div>

          {/* Expiration alerts */}
          {(() => {
            const expiringDocs = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) <= 60 && differenceInDays(new Date(d.expiration_date), new Date()) >= 0);
            const expiredDocs = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) < 0);
            if (expiringDocs.length === 0 && expiredDocs.length === 0) return null;
            return (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-3">📅 Próximos vencimientos</h3>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-500 font-medium">Documento</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Vence</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...expiredDocs, ...expiringDocs].map(doc => {
                      const days = differenceInDays(new Date(doc.expiration_date!), new Date());
                      return (
                        <tr key={doc.id} className="border-b border-gray-50">
                          <td className={`py-2 font-medium ${days < 0 ? "text-red-600" : "text-[#0F1B2D]"}`}>{doc.name}</td>
                          <td className="py-2 text-gray-500">{format(new Date(doc.expiration_date!), "dd/MM/yyyy")}</td>
                          <td className={`py-2 font-bold ${days < 0 ? "text-red-600" : days <= 30 ? "text-orange-500" : "text-gray-500"}`}>
                            {days < 0 ? `Vencido hace ${Math.abs(days)} días` : `${days} días`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Pending actions */}
          {(() => {
            const pendingDocs = currentDocs.filter(d => d.is_required && (!d.file_url || d.approval_status === "in_review" || d.approval_status === "rejected"));
            if (pendingDocs.length === 0) return null;
            return (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-3">⏳ Requieren acción</h3>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-500 font-medium">Documento</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Estado</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Responsable</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Vence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDocs.map(doc => {
                      const ab = APPROVAL_BADGES[doc.approval_status ?? "draft"];
                      return (
                        <tr key={doc.id} className="border-b border-gray-50">
                          <td className="py-2 font-medium text-[#0F1B2D]">{doc.name}</td>
                          <td className="py-2"><Badge className={`${ab.bg} ${ab.text} border-0 text-[9px]`}>{ab.label}</Badge></td>
                          <td className="py-2 text-gray-500">{doc.assigned_to || "—"}</td>
                          <td className="py-2 text-gray-500">{doc.due_date ? format(new Date(doc.due_date), "dd/MM/yyyy") : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════════════════
          SHARED MODALS
         ═══════════════════════════════════ */}

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Documento" : "Agregar Documento"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Categoría</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.code} value={c.code}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Subcategoría</Label><Input value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Nombre del documento *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Descripción</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Estado de aprobación</Label>
                <Select value={form.approval_status} onValueChange={v => setForm({ ...form, approval_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="in_review">En revisión</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Fecha de vencimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[12px]", !form.expiration_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {form.expiration_date ? format(form.expiration_date, "dd/MM/yyyy") : "Sin vencimiento"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.expiration_date ?? undefined} onSelect={d => setForm({ ...form, expiration_date: d ?? null })} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[11px] text-gray-400">Responsable</Label><Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} /></div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Fecha límite</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[12px]", !form.due_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {form.due_date ? format(form.due_date, "dd/MM/yyyy") : "Sin fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.due_date ?? undefined} onSelect={d => setForm({ ...form, due_date: d ?? null })} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_required} onCheckedChange={c => setForm({ ...form, is_required: c })} />
                <Label className="text-[12px]">Requerido</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.visible_to_gc} onCheckedChange={c => setForm({ ...form, visible_to_gc: c })} />
                <Label className="text-[12px]">👷 GC</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.visible_to_client} onCheckedChange={c => setForm({ ...form, visible_to_client: c })} />
                <Label className="text-[12px]">👁 Cliente</Label>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Archivo</Label>
              <FileUploadSource
                accept="all"
                onFileSelected={f => setUploadFile(f)}
              />
              {uploadFile && (
                <div className="flex items-center gap-2 text-[12px] mt-1">
                  <Paperclip className="h-4 w-4 text-[#0D7377]" />
                  <span>{uploadFile.name}</span>
                  <button onClick={() => setUploadFile(null)} className="text-red-400 hover:text-red-600 text-[11px]">×</button>
                </div>
              )}
            </div>

            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Notas</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button onClick={saveDoc} disabled={!form.name || uploading} className={`w-full ${BTN_PRIMARY}`}>
              {uploading ? "Subiendo..." : editingId ? "Guardar cambios" : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectDocId} onOpenChange={() => setRejectDocId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rechazar documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-[11px] text-gray-400">Motivo del rechazo *</Label>
            <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} placeholder="Ej: Documento incompleto, falta firma..." />
            <Button onClick={rejectDoc} disabled={!rejectionReason} className="w-full bg-red-600 hover:bg-red-700 text-white">Rechazar documento</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDoc} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import confirmation */}
      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cargar plantilla base</AlertDialogTitle>
            <AlertDialogDescription>
              Esto creará {templates.length} documentos requeridos para este proyecto basados en las 9 categorías del sistema. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={importChecklist} className="bg-[#0D7377] hover:bg-[#0A5C5F]">Cargar plantilla</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentsAdmin;
