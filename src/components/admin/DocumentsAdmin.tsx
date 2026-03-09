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
import { Plus, Pencil, Trash2, Lock, Eye, Upload, ChevronDown, ChevronRight, Paperclip, CalendarIcon, Phone, CheckCircle2, Mail, FolderOpen, CheckSquare } from "lucide-react";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  BTN_SUCCESS, BTN_PRIMARY,
  PAGE_TITLE,
} from "@/lib/design-system";

const CATEGORIES = ["Contratos", "Permisos", "Seguros", "Planos & Diseño", "Contratistas", "Financiero", "Otros"];
const CATEGORY_ICONS: Record<string, string> = {
  "Contratos": "📋", "Permisos": "🏛️", "Seguros": "🛡️",
  "Planos & Diseño": "📐", "Contratistas": "👷", "Financiero": "🏦", "Otros": "📁",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "chasing", label: "En gestión" },
  { value: "uploaded", label: "Cargado" },
  { value: "not_required", label: "N/A" },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgente" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Baja" },
];

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
}

const emptyForm = {
  category: "Contratos",
  subcategory: "",
  name: "",
  description: "",
  status: "pending",
  expiration_date: null as Date | null,
  is_required: true,
  visible_to_client: true,
  notes: "",
  assigned_to: "",
  due_date: null as Date | null,
  priority: "normal",
  action_notes: "",
};

const BASE_CHECKLIST = [
  { category: "Contratos", name: "Contrato Principal con GC" },
  { category: "Contratos", name: "Subcontratos ejecutados" },
  { category: "Contratos", name: "Contrato de OPR con 360lateral" },
  { category: "Contratos", name: "Contrato de compraventa del lote" },
  { category: "Permisos", name: "Building Permit (City of St. Pete / Pinellas County)" },
  { category: "Permisos", name: "NOC (Notice of Commencement)" },
  { category: "Permisos", name: "Certificate of Occupancy" },
  { category: "Seguros", name: "General Liability Insurance — GC" },
  { category: "Seguros", name: "Workers Compensation — GC" },
  { category: "Seguros", name: "Builder's Risk Insurance" },
  { category: "Seguros", name: "Flood Insurance (NFIP/Private — FEMA zone)" },
  { category: "Planos & Diseño", name: "Planos arquitectónicos aprobados" },
  { category: "Planos & Diseño", name: "Planos estructurales aprobados" },
  { category: "Planos & Diseño", name: "Planos MEP aprobados" },
  { category: "Planos & Diseño", name: "Survey del lote" },
  { category: "Contratistas", name: "Licencia de contratista GC (Estado de Florida)" },
  { category: "Contratistas", name: "Licencia de contratista eléctrico" },
  { category: "Contratistas", name: "Licencia de contratista plomería" },
  { category: "Contratistas", name: "Licencia de contratista HVAC" },
  { category: "Contratistas", name: "W-9 de todos los contratistas" },
  { category: "Financiero", name: "Loan Agreement con el banco" },
  { category: "Financiero", name: "Deed / Título de propiedad" },
  { category: "Financiero", name: "Appraisal / ARV Report" },
  { category: "Otros", name: "HOA Approval (si aplica)" },
];

// Draw readiness documents
const DRAW_REQUIRED_DOCS = [
  { name: "Contrato Principal con GC", needsNotExpired: false },
  { name: "Builder's Risk Insurance", needsNotExpired: true },
  { name: "General Liability Insurance — GC", needsNotExpired: true },
  { name: "Workers Compensation — GC", needsNotExpired: true },
  { name: "Building Permit (City of St. Pete / Pinellas County)", needsNotExpired: false },
];

function getDocStatus(doc: ProjectDocument): { className: string; label: string } {
  if (doc.status === "not_required") return { className: "bg-gray-100 text-gray-400 border-0 text-[10px]", label: "N/A" };
  if (doc.status === "chasing") return { className: "bg-[#FFFBEB] text-[#92400E] border-0 text-[10px] font-bold", label: "En gestión" };
  if (doc.status === "uploaded") {
    if (doc.expiration_date) {
      const days = differenceInDays(new Date(doc.expiration_date), new Date());
      if (days < 0) return { className: "bg-[#FEF2F2] text-[#DC2626] border-0 text-[10px] font-bold", label: "Vencido !" };
      if (days <= 30) return { className: "bg-[#FFF7ED] text-[#EA580C] border-0 text-[10px] font-bold", label: "Vence pronto" };
    }
    return { className: "bg-[#F0FDF4] text-[#166534] border-0 text-[10px] font-bold", label: "✓ Cargado" };
  }
  return { className: "bg-gray-100 text-gray-500 border-0 text-[10px]", label: "Pendiente" };
}

function computeEffectivePriority(doc: ProjectDocument): string {
  if (doc.status === "uploaded" || doc.status === "not_required") return doc.priority ?? "normal";
  // Auto-urgent: expiration within 30 days
  if (doc.expiration_date) {
    const days = differenceInDays(new Date(doc.expiration_date), new Date());
    if (days <= 30) return "urgent";
  }
  // Seguros pending with expiration within 60 days
  if (doc.category === "Seguros" && doc.expiration_date) {
    const days = differenceInDays(new Date(doc.expiration_date), new Date());
    if (days <= 60) return "urgent";
  }
  // Contratos or Seguros pending = potential draw blocker
  if ((doc.category === "Contratos" || doc.category === "Seguros") && doc.status === "pending") {
    // Check if it's a draw-required doc
    if (DRAW_REQUIRED_DOCS.some((d) => doc.name.includes(d.name.split(" —")[0]))) return "urgent";
  }
  return doc.priority ?? "normal";
}

const DocumentsAdmin = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"repo" | "checklist">("repo");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  // Checklist mode state
  const [chaseDocId, setChaseDocId] = useState<string | null>(null);
  const [chaseNote, setChaseNote] = useState("");
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditForm, setQuickEditForm] = useState({ assigned_to: "", due_date: null as Date | null, priority: "normal", action_notes: "", is_required: true });
  const [sendingSummary, setSendingSummary] = useState(false);

  const fetchDocs = async () => {
    const { data } = await supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId)
      .order("category")
      .order("name");
    setDocuments((data as ProjectDocument[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [projectId]);

  // Group by category (for repo mode)
  const grouped = CATEGORIES.reduce<Record<string, ProjectDocument[]>>((acc, cat) => {
    const items = documents.filter((d) => d.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  // Compliance score
  const requiredDocs = documents.filter((d) => d.is_required);
  const uploadedRequired = requiredDocs.filter((d) => d.status === "uploaded");
  const compliancePct = requiredDocs.length > 0 ? Math.round((uploadedRequired.length / requiredDocs.length) * 100) : 0;
  const complianceColor = compliancePct >= 90 ? "bg-[#0D7377]" : compliancePct >= 70 ? "bg-[#FACC15]" : "bg-[#DC2626]";

  // Checklist columns
  const pendingDocs = documents.filter((d) => d.status === "pending" && d.is_required !== false);
  const chasingDocs = documents.filter((d) => d.status === "chasing");
  const completedDocs = documents.filter((d) => d.status === "uploaded");
  const urgentDocs = pendingDocs.filter((d) => computeEffectivePriority(d) === "urgent");

  // Draw readiness
  const drawChecks = DRAW_REQUIRED_DOCS.map((req) => {
    const doc = documents.find((d) => d.name.includes(req.name.split(" —")[0]));
    const isUploaded = doc?.status === "uploaded";
    const isExpired = doc?.expiration_date ? differenceInDays(new Date(doc.expiration_date), new Date()) < 0 : false;
    const pass = isUploaded && (!req.needsNotExpired || !isExpired);
    return { ...req, doc, pass, isUploaded, isExpired };
  });
  const drawReady = drawChecks.every((c) => c.pass);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setUploadFile(null); setFormOpen(true); };
  const openEdit = (d: ProjectDocument) => {
    setEditingId(d.id);
    setForm({
      category: d.category,
      subcategory: d.subcategory ?? "",
      name: d.name,
      description: d.description ?? "",
      status: d.status ?? "pending",
      expiration_date: d.expiration_date ? new Date(d.expiration_date) : null,
      is_required: d.is_required ?? true,
      visible_to_client: d.visible_to_client ?? true,
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
      const path = `documents/${projectId}-${Date.now()}.${ext}`;
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
      expiration_date: form.expiration_date ? format(form.expiration_date, "yyyy-MM-dd") : null,
      is_required: form.is_required,
      visible_to_client: form.visible_to_client,
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
      await supabase.from("project_documents").update(payload).eq("id", editingId);
      toast.success("Documento actualizado");
    } else {
      await supabase.from("project_documents").insert([payload]);
      toast.success("Documento agregado");
    }
    setFormOpen(false);
    setUploadFile(null);
    fetchDocs();
  };

  const deleteDoc = async () => {
    if (!deleteId) return;
    await supabase.from("project_documents").delete().eq("id", deleteId);
    toast.success("Documento eliminado");
    setDeleteId(null);
    fetchDocs();
  };

  const toggleVisibility = async (d: ProjectDocument) => {
    await supabase.from("project_documents").update({ visible_to_client: !d.visible_to_client }).eq("id", d.id);
    fetchDocs();
  };

  const handleQuickUpload = async (docId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `documents/${projectId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("project_files").upload(path, file);
    if (error) { toast.error("Error: " + error.message); return; }
    const { data } = supabase.storage.from("project_files").getPublicUrl(path);
    await supabase.from("project_documents").update({
      file_url: data.publicUrl,
      file_name: file.name,
      file_size_kb: Math.round(file.size / 1024),
      status: "uploaded",
      uploaded_at: new Date().toISOString(),
    }).eq("id", docId);
    toast.success("Archivo cargado");
    fetchDocs();
  };

  const markChasing = async (docId: string) => {
    await supabase.from("project_documents").update({ status: "chasing" }).eq("id", docId);
    toast.success("Marcado en gestión");
    fetchDocs();
  };

  const submitChase = async () => {
    if (!chaseDocId || !chaseNote) return;
    const doc = documents.find((d) => d.id === chaseDocId);
    await supabase.from("project_documents").update({
      last_chased_at: new Date().toISOString(),
      chase_count: (doc?.chase_count ?? 0) + 1,
      action_notes: chaseNote,
      status: "chasing",
    }).eq("id", chaseDocId);
    toast.success("Seguimiento registrado");
    setChaseDocId(null);
    setChaseNote("");
    fetchDocs();
  };

  const openQuickEdit = (d: ProjectDocument) => {
    setQuickEditId(d.id);
    setQuickEditForm({
      assigned_to: d.assigned_to ?? "",
      due_date: d.due_date ? new Date(d.due_date) : null,
      priority: d.priority ?? "normal",
      action_notes: d.action_notes ?? "",
      is_required: d.is_required ?? true,
    });
  };

  const saveQuickEdit = async () => {
    if (!quickEditId) return;
    await supabase.from("project_documents").update({
      assigned_to: quickEditForm.assigned_to || null,
      due_date: quickEditForm.due_date ? format(quickEditForm.due_date, "yyyy-MM-dd") : null,
      priority: quickEditForm.priority,
      action_notes: quickEditForm.action_notes || null,
      is_required: quickEditForm.is_required,
    }).eq("id", quickEditId);
    toast.success("Actualizado");
    setQuickEditId(null);
    fetchDocs();
  };

  const importChecklist = async () => {
    // Get existing doc names to avoid duplicates
    const { data: existing } = await supabase
      .from("project_documents")
      .select("category, name")
      .eq("project_id", projectId);
    const existingSet = new Set((existing ?? []).map((d) => `${d.category}::${d.name}`));
    const newRows = BASE_CHECKLIST
      .filter((r) => !existingSet.has(`${r.category}::${r.name}`))
      .map((r) => ({
        project_id: projectId, category: r.category, name: r.name,
        status: "pending", is_required: true, visible_to_client: true,
      }));
    if (newRows.length === 0) {
      toast.info("Todos los documentos del checklist ya existen.");
      setImportOpen(false);
      return;
    }
    await supabase.from("project_documents").insert(newRows);
    toast.success(`Checklist cargado — ${newRows.length} documentos nuevos`);
    setImportOpen(false);
    fetchDocs();
  };

  const sendSummary = async () => {
    setSendingSummary(true);
    try {
      const { data: project } = await supabase.from("projects").select("code, address").eq("id", projectId).single();
      await supabase.functions.invoke("send-notification", {
        body: {
          type: "document_checklist_summary",
          to: "juan.saldarriaga@360lateral.com",
          data: {
            project_code: project?.code ?? "",
            project_address: project?.address ?? "",
            completion_pct: compliancePct,
            urgent_docs: urgentDocs.map((d) => d.name),
            draw_ready: drawReady,
            pending_count: pendingDocs.length,
            uploaded_count: completedDocs.length,
          },
        },
      });
      toast.success("Resumen enviado al equipo");
    } catch { toast.error("Error enviando resumen"); }
    setSendingSummary(false);
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  // ═══════════════════════════════════════════════
  // CHECKLIST CARD COMPONENT
  // ═══════════════════════════════════════════════
  const DocCard = ({ doc }: { doc: ProjectDocument }) => {
    const effectivePriority = computeEffectivePriority(doc);
    const borderColor = effectivePriority === "urgent" ? "border-l-[#DC2626]" : effectivePriority === "low" ? "border-l-gray-200" : "border-l-gray-300";
    const bgColor = effectivePriority === "urgent" ? "bg-[#FEF2F2]" : effectivePriority === "low" ? "bg-gray-50" : "bg-white";
    const isExpired = doc.expiration_date && differenceInDays(new Date(doc.expiration_date), new Date()) < 0;
    const isExpiringSoon = doc.expiration_date && !isExpired && differenceInDays(new Date(doc.expiration_date), new Date()) <= 30;

    return (
      <div className={`rounded-lg border border-gray-200 border-l-4 ${borderColor} ${bgColor} p-3 space-y-2 relative`}>
        <button onClick={() => openQuickEdit(doc)} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100">
          <Pencil className="h-3 w-3 text-gray-400" />
        </button>
        <div className="flex items-center gap-2 flex-wrap pr-6">
          {effectivePriority === "urgent" && <Badge className="bg-[#DC2626] text-white border-0 text-[9px] font-bold">🔴 URGENTE</Badge>}
          <Badge className="bg-gray-100 text-gray-600 border-0 text-[9px]">{doc.category}</Badge>
        </div>
        <p className="text-[13px] font-semibold text-[#0F1B2D] leading-tight">{doc.name}</p>
        <div className="border-t border-gray-100 pt-2 space-y-1 text-[11px] text-gray-500">
          {doc.assigned_to && <p>👤 Asignado: <span className="font-medium text-[#0F1B2D]">{doc.assigned_to}</span></p>}
          {doc.expiration_date && (
            <p className={isExpired ? "text-[#DC2626] font-bold" : isExpiringSoon ? "text-[#EA580C] font-medium" : ""}>
              📅 Vence: {format(new Date(doc.expiration_date), "dd MMM yyyy", { locale: es })} {(isExpired || isExpiringSoon) && "⚠️"}
            </p>
          )}
          {doc.due_date && <p>🎯 Fecha límite: {format(new Date(doc.due_date), "dd MMM yyyy", { locale: es })}</p>}
          {doc.action_notes && <p>💬 "{doc.action_notes}"</p>}
          {doc.last_chased_at && (
            <p className="text-gray-400">Último seguimiento: {formatDistanceToNow(new Date(doc.last_chased_at), { addSuffix: true, locale: es })} {doc.chase_count ? `(${doc.chase_count}×)` : ""}</p>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap pt-1">
          {doc.status !== "uploaded" && (
            <label className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[#0D7377] text-white cursor-pointer hover:bg-[#0A5C5F] transition-colors">
              <Upload className="h-3 w-3" /> Subir archivo
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQuickUpload(doc.id, f); }} />
            </label>
          )}
          {doc.status === "pending" && (
            <button onClick={() => markChasing(doc.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] hover:bg-[#FEF3C7] transition-colors">
              <CheckCircle2 className="h-3 w-3" /> Marcar gestionado
            </button>
          )}
          <button onClick={() => { setChaseDocId(doc.id); setChaseNote(doc.action_notes ?? ""); }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            <Phone className="h-3 w-3" /> Registrar seguimiento
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className={PAGE_TITLE}>Documentación & Contratos — Cap. 1</h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode("repo")}
              className={cn("px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 transition-colors",
                viewMode === "repo" ? "bg-[#0F1B2D] text-white" : "bg-white text-gray-500 hover:bg-gray-50")}
            >
              <FolderOpen className="h-3.5 w-3.5" /> Repositorio
            </button>
            <button
              onClick={() => setViewMode("checklist")}
              className={cn("px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 transition-colors",
                viewMode === "checklist" ? "bg-[#0F1B2D] text-white" : "bg-white text-gray-500 hover:bg-gray-50")}
            >
              <CheckSquare className="h-3.5 w-3.5" /> Checklist
            </button>
          </div>
          {viewMode === "checklist" && (
            <Button size="sm" variant="outline" className="h-8 text-[11px] font-medium bg-white border-gray-300 text-gray-600 hover:bg-gray-50 gap-1.5" onClick={sendSummary} disabled={sendingSummary}>
              <Mail className="h-3.5 w-3.5" /> {sendingSummary ? "Enviando..." : "Enviar resumen al equipo"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-[11px] font-medium bg-white border-gray-300 text-gray-600 hover:bg-gray-50 gap-1.5" onClick={() => setImportOpen(true)}>
            Cargar checklist base
          </Button>
          <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar documento
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CHECKLIST MODE
          ═══════════════════════════════════════════ */}
      {viewMode === "checklist" && documents.length > 0 && (
        <>
          {/* Progress header */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] font-bold text-[#0F1B2D]">
                Expediente completo al {compliancePct}%
              </span>
              <span className="text-[12px] text-gray-500">{uploadedRequired.length} / {requiredDocs.length} documentos</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all ${complianceColor}`} style={{ width: `${compliancePct}%` }} />
            </div>
            <div className="flex gap-4 text-[12px]">
              <span className="font-semibold text-[#DC2626]">🔴 Urgentes: {urgentDocs.length}</span>
              <span className="font-semibold text-[#EA580C]">🟠 Próximos: {chasingDocs.length}</span>
              <span className="font-semibold text-[#166534]">✅ Listos: {completedDocs.length}</span>
            </div>
          </div>

          {/* Urgent banner */}
          {urgentDocs.length > 0 && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 flex items-start gap-2">
              <span className="text-base">🚨</span>
              <div>
                <p className="text-[13px] font-bold text-[#991B1B]">{urgentDocs.length} documento(s) urgente(s) requieren atención hoy</p>
                <p className="text-[11px] text-[#991B1B]/70">Estos documentos pueden bloquear el próximo draw.</p>
              </div>
            </div>
          )}

          {/* Draw readiness */}
          <div className={`bg-white rounded-lg border-2 ${drawReady ? "border-[#0D7377]" : "border-[#EA580C]"} shadow-sm p-4`}>
            <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-3">📋 LISTO PARA PRÓXIMO DRAW</h3>
            <div className="space-y-1.5">
              {drawChecks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  {c.pass ? (
                    <CheckCircle2 className="h-4 w-4 text-[#166534] shrink-0" />
                  ) : (
                    <span className="text-[#EA580C] shrink-0">⏳</span>
                  )}
                  <span className={c.pass ? "text-gray-600" : "font-medium text-[#0F1B2D]"}>{c.name}</span>
                  {!c.pass && <Badge className="bg-[#FEF2F2] text-[#DC2626] border-0 text-[9px] ml-auto">PENDIENTE</Badge>}
                  {c.isExpired && <Badge className="bg-[#FEF2F2] text-[#DC2626] border-0 text-[9px] ml-auto">VENCIDO</Badge>}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100">
              {drawReady ? (
                <p className="text-[12px] font-bold text-[#166534]">✅ LISTO PARA DRAW</p>
              ) : (
                <p className="text-[12px] font-bold text-[#EA580C]">⚠️ NO LISTO — faltan {drawChecks.filter((c) => !c.pass).length} documento(s)</p>
              )}
            </div>
          </div>

          {/* Kanban columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pending */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔴</span>
                <h3 className="text-[13px] font-bold text-[#0F1B2D] uppercase tracking-wide">Pendientes</h3>
                <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">{pendingDocs.length}</Badge>
              </div>
              <div className="space-y-2">
                {pendingDocs.map((doc) => <DocCard key={doc.id} doc={doc} />)}
                {pendingDocs.length === 0 && <p className="text-gray-400 text-[11px] text-center py-4">Sin pendientes 🎉</p>}
              </div>
            </div>
            {/* Chasing */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🟡</span>
                <h3 className="text-[13px] font-bold text-[#0F1B2D] uppercase tracking-wide">En Gestión</h3>
                <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">{chasingDocs.length}</Badge>
              </div>
              <div className="space-y-2">
                {chasingDocs.map((doc) => <DocCard key={doc.id} doc={doc} />)}
                {chasingDocs.length === 0 && <p className="text-gray-400 text-[11px] text-center py-4">Nada en gestión</p>}
              </div>
            </div>
            {/* Completed */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">✅</span>
                <h3 className="text-[13px] font-bold text-[#0F1B2D] uppercase tracking-wide">Completados</h3>
                <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">{completedDocs.length}</Badge>
              </div>
              <div className="space-y-2">
                {completedDocs.map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-gray-200 bg-[#F0FDF4] p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-gray-100 text-gray-600 border-0 text-[9px]">{doc.category}</Badge>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] text-[10px] hover:underline flex items-center gap-1">
                          <Paperclip className="h-3 w-3" /> Ver
                        </a>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-[#166534]">✓ {doc.name}</p>
                    {doc.expiration_date && (
                      <p className="text-[10px] text-gray-400">Vence: {format(new Date(doc.expiration_date), "dd MMM yyyy", { locale: es })}</p>
                    )}
                  </div>
                ))}
                {completedDocs.length === 0 && <p className="text-gray-400 text-[11px] text-center py-4">Sin completados</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          REPO MODE (original accordion view)
          ═══════════════════════════════════════════ */}
      {viewMode === "repo" && (
        <>
          {/* Compliance score */}
          {requiredDocs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#0F1B2D]">
                  Completitud del expediente: {uploadedRequired.length}/{requiredDocs.length} documentos — {compliancePct}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${complianceColor}`} style={{ width: `${compliancePct}%` }} />
              </div>
            </div>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-[12px]">
              Sin documentos. Usa "Cargar checklist base" para comenzar.
            </div>
          ) : (
            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const items = grouped[cat];
                if (!items) return null;
                const catRequired = items.filter((d) => d.is_required);
                const catUploaded = catRequired.filter((d) => d.status === "uploaded");
                const catPct = catRequired.length > 0 ? Math.round((catUploaded.length / catRequired.length) * 100) : 100;
                const isOpen = openCategories[cat] !== false;

                return (
                  <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleCategory(cat)}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{CATEGORY_ICONS[cat] || "📁"}</span>
                          <span className="text-[13px] font-semibold text-[#0F1B2D] uppercase tracking-wide">{cat}</span>
                          <span className="text-[11px] text-gray-500 ml-2">[{catUploaded.length}/{catRequired.length}]</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${catPct >= 90 ? "bg-[#0D7377]" : catPct >= 50 ? "bg-[#FACC15]" : "bg-[#DC2626]"}`} style={{ width: `${catPct}%` }} />
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
                              <th className={`${TH_CLASS} w-8`}>✓</th>
                              <th className={TH_CLASS}>Documento</th>
                              <th className={TH_CLASS}>Estado</th>
                              <th className={TH_CLASS}>Vencimiento</th>
                              <th className={TH_CLASS}>Archivo</th>
                              <th className={TH_CLASS}>Visible</th>
                              <th className={TH_CLASS}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((doc, idx) => {
                              const st = getDocStatus(doc);
                              const isExpired = doc.expiration_date && differenceInDays(new Date(doc.expiration_date), new Date()) < 0;
                              const isExpiringSoon = doc.expiration_date && !isExpired && differenceInDays(new Date(doc.expiration_date), new Date()) <= 30;

                              return (
                                <tr key={doc.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors ${!doc.visible_to_client ? "opacity-60" : ""}`}>
                                  <td className={TD_CLASS}>
                                    {doc.status === "uploaded" ? <span className="text-[#166534]">✓</span> : <span className="text-gray-300">○</span>}
                                  </td>
                                  <td className={`${TD_CLASS} max-w-[250px]`}>
                                    <span className="font-medium">{doc.name}</span>
                                    {!doc.visible_to_client && <Lock className="inline h-3 w-3 ml-1 text-gray-400" />}
                                    {doc.description && <p className="text-[11px] text-gray-400 truncate">{doc.description}</p>}
                                  </td>
                                  <td className={TD_CLASS}><Badge className={st.className}>{st.label}</Badge></td>
                                  <td className={TD_CLASS}>
                                    {doc.expiration_date ? (
                                      <span className={`text-[11px] ${isExpired ? "text-[#DC2626] font-bold" : isExpiringSoon ? "text-[#EA580C] font-medium" : "text-gray-500"}`}>
                                        {format(new Date(doc.expiration_date), "dd/MM/yyyy")}
                                      </span>
                                    ) : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className={TD_CLASS}>
                                    {doc.file_url ? (
                                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1">
                                        <Paperclip className="h-3 w-3" /> {doc.file_name || "Archivo"}
                                      </a>
                                    ) : (
                                      <label className="text-gray-400 text-[11px] cursor-pointer hover:text-[#0D7377] flex items-center gap-1">
                                        <Upload className="h-3 w-3" /> Subir
                                        <input type="file" className="hidden" onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) handleQuickUpload(doc.id, f);
                                        }} />
                                      </label>
                                    )}
                                  </td>
                                  <td className={TD_CLASS}>
                                    <button onClick={() => toggleVisibility(doc)} className="p-1 rounded hover:bg-gray-100">
                                      {doc.visible_to_client ? <Eye className="h-3.5 w-3.5 text-[#0D7377]" /> : <Lock className="h-3.5 w-3.5 text-gray-400" />}
                                    </button>
                                  </td>
                                  <td className={TD_CLASS}>
                                    <div className="flex gap-1">
                                      <button onClick={() => openEdit(doc)} className="p-1 rounded hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-[#0D7377]" /></button>
                                      <button onClick={() => setDeleteId(doc.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Empty state for checklist mode */}
      {viewMode === "checklist" && documents.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-[12px]">
          Sin documentos. Usa "Cargar checklist base" para comenzar.
        </div>
      )}

      {/* ═══════════════════════════════════════════
          SHARED MODALS
          ═══════════════════════════════════════════ */}

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Documento" : "Agregar Documento"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Subcategoría (opcional)</Label><Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Nombre del documento</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Descripción (opcional)</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
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
                    <Calendar mode="single" selected={form.expiration_date ?? undefined} onSelect={(d) => setForm({ ...form, expiration_date: d ?? null })} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[11px] text-gray-400">Asignado a</Label><Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Nombre del responsable" /></div>
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-400">Prioridad</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Fecha límite interna</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[12px]", !form.due_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {form.due_date ? format(form.due_date, "dd/MM/yyyy") : "Sin fecha límite"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.due_date ?? undefined} onSelect={(d) => setForm({ ...form, due_date: d ?? null })} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Notas de gestión</Label><Textarea value={form.action_notes} onChange={(e) => setForm({ ...form, action_notes: e.target.value })} rows={2} placeholder="ej: Llamar al GC, solicitar al banco..." /></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_required} onCheckedChange={(c) => setForm({ ...form, is_required: c })} />
                <Label className="text-[12px]">¿Requerido?</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.visible_to_client} onCheckedChange={(c) => setForm({ ...form, visible_to_client: c })} />
                <Label className="text-[12px]">Visible para cliente</Label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Archivo</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-[#0D7377] transition-colors">
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2 text-[12px]">
                    <Paperclip className="h-4 w-4 text-[#0D7377]" />
                    <span>{uploadFile.name}</span>
                    <button onClick={() => { setUploadFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-red-400 hover:text-red-600 text-[11px]">×</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="text-[12px] text-gray-400 hover:text-[#0D7377]">
                    <Upload className="h-5 w-5 mx-auto mb-1" />
                    Haz clic o arrastra un archivo
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Notas (opcional)</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button onClick={saveDoc} disabled={!form.name || uploading} className={`w-full ${BTN_PRIMARY}`}>
              {uploading ? "Subiendo..." : editingId ? "Guardar cambios" : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chase follow-up modal */}
      <Dialog open={!!chaseDocId} onOpenChange={() => setChaseDocId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar seguimiento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">¿Qué acción tomaste?</Label>
              <Textarea value={chaseNote} onChange={(e) => setChaseNote(e.target.value)} rows={3} placeholder="Llamé al GC, espera respuesta en 2 días..." />
            </div>
            <Button onClick={submitChase} disabled={!chaseNote} className={`w-full ${BTN_PRIMARY}`}>Guardar seguimiento</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick edit modal */}
      <Dialog open={!!quickEditId} onOpenChange={() => setQuickEditId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar asignación</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Asignado a</Label><Input value={quickEditForm.assigned_to} onChange={(e) => setQuickEditForm({ ...quickEditForm, assigned_to: e.target.value })} /></div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Fecha límite interna</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-[12px]", !quickEditForm.due_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {quickEditForm.due_date ? format(quickEditForm.due_date, "dd/MM/yyyy") : "Sin fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={quickEditForm.due_date ?? undefined} onSelect={(d) => setQuickEditForm({ ...quickEditForm, due_date: d ?? null })} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Prioridad</Label>
              <Select value={quickEditForm.priority} onValueChange={(v) => setQuickEditForm({ ...quickEditForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-gray-400">Notas de gestión</Label><Textarea value={quickEditForm.action_notes} onChange={(e) => setQuickEditForm({ ...quickEditForm, action_notes: e.target.value })} rows={2} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={quickEditForm.is_required} onCheckedChange={(c) => setQuickEditForm({ ...quickEditForm, is_required: c })} />
              <Label className="text-[12px]">¿Requerido? (desmarcar = N/A)</Label>
            </div>
            <Button onClick={saveQuickEdit} className={`w-full ${BTN_PRIMARY}`}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDoc} className="bg-red-600 hover:bg-red-700">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import confirmation */}
      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cargar checklist base</AlertDialogTitle>
            <AlertDialogDescription>
              {documents.length > 0
                ? `Este proyecto ya tiene ${documents.length} documento(s). ¿Agregar el checklist estándar 360lateral al expediente?`
                : "Esto cargará 24 documentos requeridos del checklist estándar de 360lateral. Puedes editarlos después."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={importChecklist} className="bg-[#0D7377] hover:bg-[#0A5C5F]">Agregar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentsAdmin;
