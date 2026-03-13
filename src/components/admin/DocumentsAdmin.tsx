import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, CalendarIcon, CheckCircle2, FileText, Search, AlertTriangle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import FileUploadSource from "@/components/FileUploadSource";
import { ALL_PINELLAS_DOCS, DISCIPLINES, INICIO_DISCIPLINES, DISCIPLINAS_DISCIPLINES } from "@/lib/pinellas-documents";

// ═══════════════════════════════
// TYPES
// ═══════════════════════════════

interface ProjectDocument {
  id: string;
  project_id: string | null;
  tab: string;
  discipline: string | null;
  category: string;
  subcategory: string | null;
  name: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string | null;
  approval_status: string | null;
  is_required: boolean | null;
  is_florida_specific: boolean | null;
  pinellas_reference: string | null;
  assigned_to: string | null;
  assigned_role: string | null;
  due_date: string | null;
  expiration_date: string | null;
  expiration_alert_days: number | null;
  version: number | null;
  is_current_version: boolean | null;
  parent_document_id: string | null;
  uploaded_at: string | null;
  uploaded_by_role: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  visible_to_client: boolean | null;
  visible_to_gc: boolean | null;
  priority: string | null;
  notes: string | null;
  action_notes: string | null;
  sequence: number | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-l-red-600",
  high: "border-l-orange-500",
  medium: "border-l-amber-400",
  low: "border-l-gray-300",
};


const STATUS_DOT: Record<string, { color: string; label: string }> = {
  approved: { color: "bg-green-500", label: "Aprobado" },
  in_review: { color: "bg-blue-500", label: "En revisión" },
  rejected: { color: "bg-red-500", label: "Rechazado" },
  draft: { color: "bg-gray-300", label: "Pendiente" },
  uploaded: { color: "bg-amber-400", label: "Cargado" },
};

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  admin: { bg: "bg-[#0F1B2D]", text: "text-white" },
  gc: { bg: "bg-[#E07B39]", text: "text-white" },
  client: { bg: "bg-[#0D7377]", text: "text-white" },
};

const DRAW_REQUIRED_DOCS = [
  "Building Permit",
  "Builder's Risk Insurance",
  "General Liability Insurance",
  "GC State License",
  "GC Certificate of Insurance",
];

// ═══════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════

const DocumentsAdmin = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inicio");

  // Expand/collapse state with localStorage persistence
  const storageKey = `docs-sections-${projectId}`;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Persist to localStorage on change
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(openSections)); } catch {}
  }, [openSections, storageKey]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ProjectDocument | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDiscipline, setActiveDiscipline] = useState<string | null>(null);
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Form state
  const [form, setForm] = useState({
    tab: "inicio" as string,
    discipline: "" as string,
    subcategory: "",
    name: "",
    description: "",
    pinellas_reference: "",
    is_required: true,
    is_florida_specific: false,
    priority: "medium",
    assigned_role: "admin",
    due_date: null as Date | null,
    expiration_date: null as Date | null,
    expiration_alert_days: 30,
    visible_to_gc: false,
    visible_to_client: false,
    notes: "",
    approval_status: "draft",
  });

  const fetchDocs = async () => {
    const { data } = await supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_current_version", true)
      .order("sequence")
      .order("name");
    setDocuments((data as unknown as ProjectDocument[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [projectId]);

  const currentDocs = documents;
  const filteredDocs = useMemo(() => {
    let docs = currentDocs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(d => d.name.toLowerCase().includes(q) || d.discipline?.toLowerCase().includes(q) || d.pinellas_reference?.toLowerCase().includes(q));
    }
    return docs;
  }, [currentDocs, searchQuery]);

  const inicioDocs = filteredDocs.filter(d => d.tab === "inicio");
  const disciplinasDocs = filteredDocs.filter(d => d.tab === "disciplinas");

  // Stats
  const totalDocs = currentDocs.length;
  const approvedDocs = currentDocs.filter(d => d.approval_status === "approved").length;
  const pendingDocs = currentDocs.filter(d => !d.file_url || d.approval_status === "draft").length;
  const alertDocs = currentDocs.filter(d => {
    if (!d.expiration_date) return false;
    const days = differenceInDays(new Date(d.expiration_date), new Date());
    return days <= 30;
  }).length;

  // Draw readiness
  const drawChecks = DRAW_REQUIRED_DOCS.map(name => {
    const doc = currentDocs.find(d => d.name.includes(name));
    const pass = doc?.approval_status === "approved" && (!doc.expiration_date || differenceInDays(new Date(doc.expiration_date), new Date()) > 0);
    return { name, pass: !!pass };
  });

  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  // Expand/collapse all helpers
  const getActiveDisciplines = useCallback(() => {
    return activeTab === "inicio" ? INICIO_DISCIPLINES : DISCIPLINAS_DISCIPLINES;
  }, [activeTab]);

  const allExpanded = useMemo(() => {
    const discs = activeTab === "inicio" ? INICIO_DISCIPLINES : DISCIPLINAS_DISCIPLINES;
    return discs.every(d => openSections[d] !== false);
  }, [activeTab, openSections]);

  const allCollapsed = useMemo(() => {
    const discs = activeTab === "inicio" ? INICIO_DISCIPLINES : DISCIPLINAS_DISCIPLINES;
    return discs.every(d => openSections[d] === false);
  }, [activeTab, openSections]);

  const expandAll = useCallback(() => {
    const discs = getActiveDisciplines();
    setOpenSections(p => {
      const next = { ...p };
      discs.forEach(d => { next[d] = true; });
      return next;
    });
  }, [getActiveDisciplines]);

  const collapseAll = useCallback(() => {
    const discs = getActiveDisciplines();
    setOpenSections(p => {
      const next = { ...p };
      discs.forEach(d => { next[d] = false; });
      return next;
    });
  }, [getActiveDisciplines]);

  // Keyboard shortcuts: Alt+E expand, Alt+C collapse
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeTab === "estado") return;
      if (e.altKey && e.key.toLowerCase() === "e") { e.preventDefault(); expandAll(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); collapseAll(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab, expandAll, collapseAll]);

  // ═══ CRUD ═══
  const openAdd = (tab?: string, discipline?: string) => {
    setEditingDoc(null);
    setForm({
      tab: tab || "inicio",
      discipline: discipline || "",
      subcategory: "",
      name: "",
      description: "",
      pinellas_reference: "",
      is_required: true,
      is_florida_specific: false,
      priority: "medium",
      assigned_role: "admin",
      due_date: null,
      expiration_date: null,
      expiration_alert_days: 30,
      visible_to_gc: false,
      visible_to_client: false,
      notes: "",
      approval_status: "draft",
    });
    setUploadFile(null);
    setFormOpen(true);
  };

  const openEdit = (d: ProjectDocument) => {
    setEditingDoc(d);
    setForm({
      tab: d.tab || "inicio",
      discipline: d.discipline || "",
      subcategory: d.subcategory || "",
      name: d.name,
      description: d.description || "",
      pinellas_reference: d.pinellas_reference || "",
      is_required: d.is_required ?? true,
      is_florida_specific: d.is_florida_specific ?? false,
      priority: d.priority || "medium",
      assigned_role: d.assigned_role || "admin",
      due_date: d.due_date ? new Date(d.due_date) : null,
      expiration_date: d.expiration_date ? new Date(d.expiration_date) : null,
      expiration_alert_days: d.expiration_alert_days ?? 30,
      visible_to_gc: d.visible_to_gc ?? false,
      visible_to_client: d.visible_to_client ?? false,
      notes: d.notes || "",
      approval_status: d.approval_status || "draft",
    });
    setUploadFile(null);
    setFormOpen(true);
  };

  const saveDoc = async () => {
    if (!form.name || !form.discipline) { toast.error("Nombre y disciplina requeridos"); return; }
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (uploadFile) {
      setUploading(true);
      const ext = uploadFile.name.split(".").pop();
      const path = `documentos/${projectId}/${form.discipline}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("project_files").upload(path, uploadFile);
      if (error) { toast.error("Error: " + error.message); setUploading(false); return; }
      const { data } = supabase.storage.from("project_files").getPublicUrl(path);
      fileUrl = data.publicUrl;
      fileName = uploadFile.name;
      setUploading(false);
    }

    const payload: any = {
      project_id: projectId,
      tab: form.tab,
      discipline: form.discipline,
      category: form.discipline, // backwards compat
      subcategory: form.subcategory || null,
      name: form.name,
      description: form.description || null,
      pinellas_reference: form.pinellas_reference || null,
      is_required: form.is_required,
      is_florida_specific: form.is_florida_specific,
      priority: form.priority,
      assigned_role: form.assigned_role,
      due_date: form.due_date ? format(form.due_date, "yyyy-MM-dd") : null,
      expiration_date: form.expiration_date ? format(form.expiration_date, "yyyy-MM-dd") : null,
      expiration_alert_days: form.expiration_alert_days,
      visible_to_gc: form.visible_to_gc,
      visible_to_client: form.visible_to_client,
      notes: form.notes || null,
      approval_status: form.approval_status,
      status: uploadFile ? "uploaded" : "pending",
    };

    if (fileUrl) {
      payload.file_url = fileUrl;
      payload.file_name = fileName;
      payload.uploaded_at = new Date().toISOString();
    }

    if (editingDoc) {
      await supabase.from("project_documents").update(payload).eq("id", editingDoc.id);
      toast.success("Documento actualizado");
    } else {
      payload.version = 1;
      payload.is_current_version = true;
      await supabase.from("project_documents").insert([payload]);
      toast.success("Documento agregado");
    }
    setFormOpen(false);
    fetchDocs();
  };

  const deleteDoc = async () => {
    if (!deleteId) return;
    await supabase.from("project_documents").delete().eq("id", deleteId);
    toast.success("Documento eliminado");
    setDeleteId(null);
    fetchDocs();
  };

  const handleQuickUpload = async (docId: string, file: File) => {
    const doc = currentDocs.find(d => d.id === docId);
    const ext = file.name.split(".").pop();
    const path = `documentos/${projectId}/${doc?.discipline || "otros"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("project_files").upload(path, file);
    if (error) { toast.error("Error: " + error.message); return; }
    const { data } = supabase.storage.from("project_files").getPublicUrl(path);

    if (doc?.file_url) {
      await supabase.from("project_documents").update({ is_current_version: false }).eq("id", docId);
      await supabase.from("project_documents").insert([{
        project_id: projectId,
        tab: doc.tab,
        discipline: doc.discipline,
        category: doc.category,
        name: doc.name,
        file_url: data.publicUrl,
        file_name: file.name,
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
        assigned_role: doc.assigned_role,
        pinellas_reference: doc.pinellas_reference,
        is_florida_specific: doc.is_florida_specific,
        priority: doc.priority,
        sequence: doc.sequence,
      }]);
      toast.success(`Versión ${(doc.version ?? 1) + 1} creada`);
    } else {
      await supabase.from("project_documents").update({
        file_url: data.publicUrl,
        file_name: file.name,
        status: "uploaded",
        uploaded_at: new Date().toISOString(),
      }).eq("id", docId);
      toast.success("Archivo cargado");
    }
    fetchDocs();
  };

  const approveDoc = async (docId: string) => {
    await supabase.from("project_documents").update({
      approval_status: "approved",
      approved_at: new Date().toISOString(),
    }).eq("id", docId);
    toast.success("Documento aprobado ✓");
    fetchDocs();
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
    fetchDocs();
  };

  // ═══ IMPORT TEMPLATE ═══
  const loadTemplate = async () => {
    setImportOpen(false);
    const existingNames = currentDocs.map(d => d.name);
    const newDocs = ALL_PINELLAS_DOCS.filter(t => !existingNames.includes(t.name));
    if (newDocs.length === 0) { toast.info("Todos los documentos ya existen"); return; }

    const rows = newDocs.map(t => ({
      project_id: projectId,
      tab: t.tab,
      discipline: t.discipline,
      category: t.discipline,
      subcategory: t.subcategory || null,
      name: t.name,
      description: t.description || null,
      is_required: t.is_mandatory,
      is_florida_specific: t.is_florida_specific,
      pinellas_reference: t.pinellas_reference || null,
      priority: t.priority,
      assigned_role: t.assigned_role,
      expiration_alert_days: t.expiration_alert_days || 30,
      status: "pending",
      approval_status: "draft",
      version: 1,
      is_current_version: true,
      visible_to_client: false,
      visible_to_gc: t.assigned_role === "gc",
      sequence: t.sequence,
    }));

    const { error } = await supabase.from("project_documents").insert(rows);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success(`${newDocs.length} documentos creados`);
    fetchDocs();
  };

  // ═══ HELPERS ═══
  const getDocStatus = (d: ProjectDocument) => {
    if (d.approval_status === "approved") {
      if (d.expiration_date) {
        const days = differenceInDays(new Date(d.expiration_date), new Date());
        if (days < 0) return { color: "bg-red-500", label: "Vencido" };
        if (days <= 30) return { color: "bg-amber-400", label: "Vence pronto" };
      }
      return { color: "bg-green-500", label: "Aprobado" };
    }
    return STATUS_DOT[d.approval_status ?? "draft"] || STATUS_DOT.draft;
  };

  const getDisciplineStats = (docs: ProjectDocument[], discipline: string) => {
    const items = docs.filter(d => d.discipline === discipline);
    const approved = items.filter(d => d.approval_status === "approved").length;
    return { total: items.length, approved };
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  // ═══════════════════════════════
  // DOCUMENT ROW COMPONENT
  // ═══════════════════════════════
  const DocRow = ({ doc }: { doc: ProjectDocument }) => {
    const st = getDocStatus(doc);
    const roleBadge = ROLE_BADGE[doc.assigned_role ?? "admin"] || ROLE_BADGE.admin;
    const isDrawDoc = DRAW_REQUIRED_DOCS.some(n => doc.name.includes(n));
    const drawReady = isDrawDoc && (doc.approval_status === "approved" || doc.status === "uploaded");
    const drawPending = isDrawDoc && !drawReady;

    return (
      <div className={cn(
        "flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 border-l-4 transition-colors group",
        drawPending ? "bg-red-50 border-l-red-600 hover:bg-red-100/60" : cn("hover:bg-[#E8F4F4]/30", PRIORITY_COLORS[doc.priority ?? "medium"])
      )}>
        {/* Status dot */}
        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", st.color)} title={st.label} />

        {/* Name + ref */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-[13px] truncate", drawPending ? "font-semibold text-red-700" : "font-medium text-[#0F1B2D]")}>{doc.name}</span>
            {doc.is_required && <span className="text-[9px] text-red-500 font-bold">REQ</span>}
            {drawPending && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 whitespace-nowrap shrink-0">⚠️ Requerido para Draw</span>
            )}
            {drawReady && isDrawDoc && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 whitespace-nowrap shrink-0">✓ Listo para Draw</span>
            )}
            <span className="text-[9px] text-gray-400">v{doc.version ?? 1}</span>
          </div>
          {doc.pinellas_reference && (
            <p className="text-[10px] text-[#0D7377] italic truncate">📍 {doc.pinellas_reference}</p>
          )}
        </div>

        {/* Role */}
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0", roleBadge.bg, roleBadge.text)}>
          {doc.assigned_role === "admin" ? "Admin" : doc.assigned_role === "gc" ? "GC" : "Cliente"}
        </span>

        {/* Due date */}
        {doc.due_date && (
          <span className={cn("text-[11px] shrink-0", differenceInDays(new Date(doc.due_date), new Date()) < 0 ? "text-red-500 font-medium" : "text-gray-400")}>
            {format(new Date(doc.due_date), "dd/MM/yy")}
          </span>
        )}

        {/* Expiration */}
        {doc.expiration_date && (
          <span className={cn("text-[11px] shrink-0",
            differenceInDays(new Date(doc.expiration_date), new Date()) < 0 ? "text-red-500 font-bold" :
            differenceInDays(new Date(doc.expiration_date), new Date()) <= 30 ? "text-amber-500" : "text-gray-400"
          )}>
            ⏳ {format(new Date(doc.expiration_date), "dd/MM/yy")}
          </span>
        )}

        {/* File icon */}
        {doc.file_url ? (
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <FileText className="h-4 w-4 text-[#0D7377]" />
          </a>
        ) : (
          <FileText className="h-4 w-4 text-gray-200 shrink-0" />
        )}

        {/* Actions on hover */}
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          {!doc.file_url && (
            <FileUploadSource accept="pdf+images" compact onFileSelected={f => handleQuickUpload(doc.id, f)} />
          )}
          {doc.file_url && doc.approval_status === "draft" && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-green-600" onClick={() => approveDoc(doc.id)}>✓</Button>
          )}
          {doc.file_url && doc.approval_status === "in_review" && (
            <>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-green-600" onClick={() => approveDoc(doc.id)}>✓</Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-500" onClick={() => { setRejectDocId(doc.id); setRejectionReason(""); }}>✗</Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEdit(doc)}>
            <Pencil className="h-3 w-3 text-gray-400" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setDeleteId(doc.id)}>
            <Trash2 className="h-3 w-3 text-red-400" />
          </Button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════
  // DISCIPLINE ACCORDION
  // ═══════════════════════════════
  const DisciplineSection = ({ discipline, docs, color }: { discipline: string; docs: ProjectDocument[]; color: string }) => {
    const isOpen = openSections[discipline] !== false; // default open
    const stats = getDisciplineStats(currentDocs, discipline);
    const pct = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
    const discMeta = DISCIPLINES[discipline];

    return (
      <div className="mb-1" id={`discipline-${discipline}`}>
        <div
          className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 border-b border-gray-100 transition-colors cursor-pointer"
          style={{ borderLeft: `3px solid ${color}` }}
          onClick={() => toggleSection(discipline)}
        >
          <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0", isOpen && "rotate-90")} />
          <span className="text-lg">{discMeta?.icon || "📁"}</span>
          <span className="text-[13px] uppercase tracking-wider font-bold text-[#0F1B2D]">
            {discMeta?.label || discipline}
          </span>
          <span className="text-[11px] text-gray-400 ml-auto mr-2">{stats.approved}/{stats.total}</span>
          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
          <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
        </div>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-in-out",
            isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {docs.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)).map(doc => <DocRow key={doc.id} doc={doc} />)}
          <button
            onClick={() => openAdd(docs[0]?.tab || "inicio", discipline)}
            className="w-full flex items-center gap-2 px-4 py-2 text-[11px] text-[#0D7377] hover:bg-[#E8F4F4]/20 border-b border-dashed border-gray-200"
          >
            <Plus className="h-3 w-3" /> Agregar documento
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════
  // LEFT PANEL — INICIO
  // ═══════════════════════════════
  const InicioSidebar = () => (
    <div className="space-y-4">
      <h4 className="text-[12px] font-bold text-[#0F1B2D] uppercase tracking-wide">Resumen Pinellas County</h4>
      {INICIO_DISCIPLINES.map(disc => {
        const stats = getDisciplineStats(inicioDocs.length > 0 ? inicioDocs : currentDocs.filter(d => d.tab === "inicio"), disc);
        const meta = DISCIPLINES[disc];
        const pct = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
        return (
          <button
            key={disc}
            onClick={() => {
              setOpenSections(p => ({ ...p, [disc]: true }));
              document.getElementById(`discipline-${disc}`)?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white transition-colors text-left"
          >
            <span className="text-base">{meta?.icon || "📁"}</span>
            <span className="text-[11px] text-[#0F1B2D] flex-1">{meta?.label || disc}</span>
            <span className="text-[10px] text-gray-400">{stats.approved}/{stats.total}</span>
            {/* Mini ring */}
            <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
              <circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2" />
              <circle cx="10" cy="10" r="8" fill="none" stroke={meta?.color || "#0D7377"} strokeWidth="2"
                strokeDasharray={`${pct * 0.5} 50`} strokeLinecap="round" transform="rotate(-90 10 10)" />
            </svg>
          </button>
        );
      })}

      {/* Draw Readiness */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mt-4">
        <p className="text-[11px] font-bold text-[#0F1B2D] mb-2">🏦 Listo para Draw #1</p>
        {drawChecks.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] py-0.5">
            {c.pass ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertTriangle className="h-3 w-3 text-red-400" />}
            <span className={c.pass ? "text-gray-500" : "text-red-600 font-medium"}>{c.name}</span>
          </div>
        ))}
        <p className="text-[10px] text-gray-400 mt-2">{drawChecks.filter(c => c.pass).length} de {drawChecks.length} requeridos</p>
      </div>
    </div>
  );

  // ═══════════════════════════════
  // LEFT PANEL — DISCIPLINAS
  // ═══════════════════════════════
  const DisciplinasSidebar = () => (
    <div className="space-y-1">
      <h4 className="text-[12px] font-bold text-[#0F1B2D] uppercase tracking-wide mb-3">Disciplinas</h4>
      {DISCIPLINAS_DISCIPLINES.map(disc => {
        const stats = getDisciplineStats(disciplinasDocs.length > 0 ? disciplinasDocs : currentDocs.filter(d => d.tab === "disciplinas"), disc);
        const meta = DISCIPLINES[disc];
        const isActive = activeDiscipline === disc;
        return (
          <button
            key={disc}
            onClick={() => {
              setActiveDiscipline(disc);
              setOpenSections(p => ({ ...p, [disc]: true }));
              document.getElementById(`discipline-${disc}`)?.scrollIntoView({ behavior: "smooth" });
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-colors",
              isActive ? "bg-[#0F1B2D] text-white" : "hover:bg-white text-[#0F1B2D]"
            )}
          >
            <span className="text-base">{meta?.icon || "📁"}</span>
            <span className="text-[11px] flex-1 font-medium">{meta?.label || disc}</span>
            <span className={cn("text-[10px]", isActive ? "text-white/60" : "text-gray-400")}>{stats.total}</span>
          </button>
        );
      })}
    </div>
  );

  // ═══════════════════════════════
  // ESTADO TAB
  // ═══════════════════════════════
  const EstadoTab = () => {
    const expiringDocs = currentDocs.filter(d => d.expiration_date && differenceInDays(new Date(d.expiration_date), new Date()) <= 60 && differenceInDays(new Date(d.expiration_date), new Date()) >= -30);
    const pendingActionDocs = currentDocs.filter(d => !d.file_url && d.is_required);
    const allDiscs = [...new Set(currentDocs.map(d => d.discipline).filter(Boolean))] as string[];

    return (
      <div className="space-y-5 p-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: totalDocs, icon: FileText, color: "text-[#0F1B2D]" },
            { label: "Aprobados", value: approvedDocs, icon: CheckCircle2, color: "text-green-600" },
            { label: "Pendientes", value: pendingDocs, icon: Clock, color: "text-amber-500" },
            { label: "Alertas", value: alertDocs, icon: AlertTriangle, color: "text-red-500" },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                <span className="text-[11px] text-gray-400">{kpi.label}</span>
              </div>
              <p className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Completion by discipline */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-[13px] font-bold text-[#0F1B2D] mb-3">Completitud por Disciplina</h4>
          <div className="space-y-2">
            {allDiscs.map(disc => {
              const stats = getDisciplineStats(currentDocs, disc);
              const pct = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
              const meta = DISCIPLINES[disc];
              return (
                <div key={disc} className="flex items-center gap-3">
                  <span className="text-[11px] w-32 truncate text-[#0F1B2D]">{meta?.icon} {meta?.label || disc}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: meta?.color || "#0D7377" }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-12 text-right">{stats.approved}/{stats.total}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expiration alerts */}
        {expiringDocs.length > 0 && (
          <div className="bg-white rounded-lg border border-orange-200 p-4">
            <h4 className="text-[13px] font-bold text-orange-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Alertas de Vencimiento
            </h4>
            <div className="space-y-1">
              {expiringDocs.map(d => {
                const days = differenceInDays(new Date(d.expiration_date!), new Date());
                return (
                  <div key={d.id} className="flex items-center gap-2 text-[12px] py-1">
                    <span className={cn("w-2 h-2 rounded-full", days < 0 ? "bg-red-500" : "bg-amber-400")} />
                    <span className="flex-1 text-[#0F1B2D]">{d.name}</span>
                    <span className={days < 0 ? "text-red-500 font-bold" : "text-amber-500"}>
                      {days < 0 ? `Vencido hace ${Math.abs(days)}d` : `${days}d restantes`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending actions */}
        {pendingActionDocs.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-[13px] font-bold text-[#0F1B2D] mb-3">Documentos Obligatorios Pendientes</h4>
            <div className="space-y-1">
              {pendingActionDocs.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-[12px] py-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="flex-1 text-[#0F1B2D]">{d.name}</span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded", ROLE_BADGE[d.assigned_role ?? "admin"].bg, ROLE_BADGE[d.assigned_role ?? "admin"].text)}>
                    {d.assigned_role === "gc" ? "GC" : d.assigned_role === "client" ? "Cliente" : "Admin"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════
  // RENDER
  // ═══════════════════════════════
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="bg-white rounded-t-lg border border-gray-200 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#0F1B2D]">Documentación del Proyecto</h2>
          <p className="text-[11px] text-gray-400">Pinellas County, FL — Residential Construction</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 h-8 w-48 text-[12px]"
            />
          </div>
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setImportOpen(true)}>
            📋 Cargar plantilla Pinellas County
          </Button>
          <Button size="sm" className="h-8 text-[11px] bg-[#0D7377] hover:bg-[#0B6163] text-white" onClick={() => openAdd()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white border-x border-gray-200 px-5 flex items-center justify-between">
          <TabsList className="bg-transparent h-10 p-0 gap-0">
            <TabsTrigger value="inicio" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0D7377] data-[state=active]:text-[#0D7377] data-[state=active]:shadow-none rounded-none text-[12px] px-4 h-10 data-[state=active]:bg-transparent">
              Inicio del Proyecto
            </TabsTrigger>
            <TabsTrigger value="disciplinas" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0D7377] data-[state=active]:text-[#0D7377] data-[state=active]:shadow-none rounded-none text-[12px] px-4 h-10 data-[state=active]:bg-transparent">
              Por Disciplina
            </TabsTrigger>
            <TabsTrigger value="estado" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0D7377] data-[state=active]:text-[#0D7377] data-[state=active]:shadow-none rounded-none text-[12px] px-4 h-10 data-[state=active]:bg-transparent">
              Estado General
            </TabsTrigger>
          </TabsList>
          {activeTab !== "estado" && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className={cn("h-7 text-[10px] gap-1", allExpanded ? "text-[#0D7377] cursor-default" : "text-gray-500 hover:text-[#0D7377]")}
                onClick={allExpanded ? undefined : expandAll}
                title="Alt + E"
              >
                <ChevronDown className="h-3 w-3" />
                {allExpanded ? "Todo expandido" : "Expandir todo"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={cn("h-7 text-[10px] gap-1", allCollapsed ? "text-gray-400 cursor-default" : "text-gray-500 hover:text-gray-700")}
                onClick={allCollapsed ? undefined : collapseAll}
                title="Alt + C"
              >
                <ChevronRight className="h-3 w-3" />
                {allCollapsed ? "Todo contraído" : "Contraer todo"}
              </Button>
            </div>
          )}
        </div>

        {/* TAB: INICIO */}
        <TabsContent value="inicio" className="mt-0">
          <div className="flex border border-gray-200 rounded-b-lg overflow-hidden" style={{ minHeight: "500px" }}>
            {/* Left panel */}
            <div className="w-[260px] bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto shrink-0 sticky top-0 self-start" style={{ maxHeight: "calc(100vh - 200px)" }}>
              <InicioSidebar />
            </div>
            {/* Right panel */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
              {INICIO_DISCIPLINES.map(disc => {
                const docs = inicioDocs.filter(d => d.discipline === disc);
                if (docs.length === 0 && !searchQuery) return null;
                return (
                  <DisciplineSection
                    key={disc}
                    discipline={disc}
                    docs={docs}
                    color={DISCIPLINES[disc]?.color || "#0D7377"}
                  />
                );
              })}
              {inicioDocs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <FileText className="h-10 w-10 mb-3 text-gray-200" />
                  <p className="text-[13px]">No hay documentos de inicio</p>
                  <p className="text-[11px]">Usa "Cargar plantilla Pinellas County" para comenzar</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB: DISCIPLINAS */}
        <TabsContent value="disciplinas" className="mt-0">
          <div className="flex border border-gray-200 rounded-b-lg overflow-hidden" style={{ minHeight: "500px" }}>
            {/* Left panel */}
            <div className="w-[260px] bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto shrink-0 sticky top-0 self-start" style={{ maxHeight: "calc(100vh - 200px)" }}>
              <DisciplinasSidebar />
            </div>
            {/* Right panel */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
              {DISCIPLINAS_DISCIPLINES.map(disc => {
                const docs = disciplinasDocs.filter(d => d.discipline === disc);
                if (docs.length === 0 && !searchQuery) return null;
                return (
                  <DisciplineSection
                    key={disc}
                    discipline={disc}
                    docs={docs}
                    color={DISCIPLINES[disc]?.color || "#0D7377"}
                  />
                );
              })}
              {disciplinasDocs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <FileText className="h-10 w-10 mb-3 text-gray-200" />
                  <p className="text-[13px]">No hay documentos por disciplina</p>
                  <p className="text-[11px]">Usa "Cargar plantilla Pinellas County" para comenzar</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB: ESTADO */}
        <TabsContent value="estado" className="mt-0">
          <div className="border border-gray-200 rounded-b-lg bg-gray-50">
            <EstadoTab />
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ MODALS ═══ */}

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[15px]">{editingDoc ? "Editar documento" : "Agregar documento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-400">Tab</Label>
                <Select value={form.tab} onValueChange={v => setForm(f => ({ ...f, tab: v }))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inicio">Inicio del Proyecto</SelectItem>
                    <SelectItem value="disciplinas">Por Disciplina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-gray-400">Disciplina *</Label>
                <Select value={form.discipline} onValueChange={v => setForm(f => ({ ...f, discipline: v }))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DISCIPLINES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-gray-400">Nombre *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-[12px]" />
            </div>

            <div>
              <Label className="text-[11px] text-gray-400">Descripción</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-[12px] min-h-[60px]" />
            </div>

            <div>
              <Label className="text-[11px] text-gray-400">Referencia Florida</Label>
              <Input value={form.pinellas_reference} onChange={e => setForm(f => ({ ...f, pinellas_reference: e.target.value }))} placeholder="Florida Statute § ..." className="h-8 text-[12px]" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] text-gray-400">Prioridad</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-gray-400">Responsable</Label>
                <Select value={form.assigned_role} onValueChange={v => setForm(f => ({ ...f, assigned_role: v }))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gc">GC</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-gray-400">Estado</Label>
                <Select value={form.approval_status} onValueChange={v => setForm(f => ({ ...f, approval_status: v }))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="in_review">En revisión</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-400">Fecha límite</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-8 text-[12px] justify-start">
                      <CalendarIcon className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      {form.due_date ? format(form.due_date, "dd/MM/yyyy") : "Sin fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.due_date || undefined} onSelect={d => setForm(f => ({ ...f, due_date: d || null }))} locale={es} /></PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-[11px] text-gray-400">Fecha vencimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-8 text-[12px] justify-start">
                      <CalendarIcon className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      {form.expiration_date ? format(form.expiration_date, "dd/MM/yyyy") : "Sin fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.expiration_date || undefined} onSelect={d => setForm(f => ({ ...f, expiration_date: d || null }))} locale={es} /></PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_required} onCheckedChange={v => setForm(f => ({ ...f, is_required: v }))} />
                <Label className="text-[11px]">Obligatorio</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_florida_specific} onCheckedChange={v => setForm(f => ({ ...f, is_florida_specific: v }))} />
                <Label className="text-[11px]">FL específico</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.visible_to_gc} onCheckedChange={v => setForm(f => ({ ...f, visible_to_gc: v }))} />
                <Label className="text-[11px]">Visible GC</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.visible_to_client} onCheckedChange={v => setForm(f => ({ ...f, visible_to_client: v }))} />
                <Label className="text-[11px]">Visible Cliente</Label>
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-gray-400">Archivo</Label>
              <FileUploadSource accept="pdf+images" compact onFileSelected={f => setUploadFile(f)} />
              {uploadFile && <p className="text-[10px] text-[#0D7377] mt-1">📎 {uploadFile.name}</p>}
            </div>

            <div>
              <Label className="text-[11px] text-gray-400">Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-[12px] min-h-[50px]" />
            </div>

            <Button onClick={saveDoc} disabled={uploading} className="w-full bg-[#0D7377] hover:bg-[#0B6163] text-white">
              {uploading ? "Subiendo..." : editingDoc ? "Actualizar" : "Guardar documento"}
            </Button>
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
            <AlertDialogAction onClick={deleteDoc} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject modal */}
      <Dialog open={!!rejectDocId} onOpenChange={() => setRejectDocId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-[14px]">Rechazar documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Motivo del rechazo..." className="text-[12px]" />
            <Button onClick={rejectDoc} disabled={!rejectionReason} className="w-full bg-red-600 hover:bg-red-700 text-white">Rechazar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import template */}
      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">📋 Cargar plantilla Pinellas County</AlertDialogTitle>
            <AlertDialogDescription>
              Esto creará {ALL_PINELLAS_DOCS.length} documentos organizados por disciplina para proyectos residenciales en Pinellas County, FL. Los documentos existentes no serán duplicados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={loadTemplate} className="bg-[#0D7377] hover:bg-[#0B6163]">Cargar plantilla</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentsAdmin;
