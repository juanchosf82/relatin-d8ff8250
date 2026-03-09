import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Lock, Eye, Upload, ChevronDown, ChevronRight, Paperclip, CalendarIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  BTN_SUCCESS, BTN_PRIMARY,
  badgeClass, PAGE_TITLE,
} from "@/lib/design-system";

const CATEGORIES = ["Contratos", "Permisos", "Seguros", "Planos & Diseño", "Contratistas", "Financiero", "Otros"];
const CATEGORY_ICONS: Record<string, string> = {
  "Contratos": "📋",
  "Permisos": "🏛️",
  "Seguros": "🛡️",
  "Planos & Diseño": "📐",
  "Contratistas": "👷",
  "Financiero": "🏦",
  "Otros": "📁",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "uploaded", label: "Cargado" },
  { value: "not_required", label: "N/A" },
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

function getDocStatus(doc: ProjectDocument): { className: string; label: string } {
  if (doc.status === "not_required") return { className: "bg-gray-100 text-gray-400 border-0 text-[10px]", label: "N/A" };
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

const DocumentsAdmin = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDocId, setUploadDocId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

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

  // Group by category
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
    setUploadDocId(docId);
    const ext = file.name.split(".").pop();
    const path = `documents/${projectId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("project_files").upload(path, file);
    if (error) { toast.error("Error: " + error.message); setUploadDocId(null); return; }
    const { data } = supabase.storage.from("project_files").getPublicUrl(path);
    await supabase.from("project_documents").update({
      file_url: data.publicUrl,
      file_name: file.name,
      file_size_kb: Math.round(file.size / 1024),
      status: "uploaded",
      uploaded_at: new Date().toISOString(),
    }).eq("id", docId);
    toast.success("Archivo cargado");
    setUploadDocId(null);
    fetchDocs();
  };

  const importChecklist = async () => {
    const rows = BASE_CHECKLIST.map((r) => ({
      project_id: projectId,
      category: r.category,
      name: r.name,
      status: "pending",
      is_required: true,
      visible_to_client: true,
    }));
    await supabase.from("project_documents").insert(rows);
    toast.success("Checklist base cargado — 24 documentos");
    setImportOpen(false);
    fetchDocs();
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={PAGE_TITLE}>Documentación & Contratos — Cap. 1</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-[11px] font-medium bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-800 gap-1.5" onClick={() => setImportOpen(true)}>
            Cargar checklist base
          </Button>
          <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar documento
          </Button>
        </div>
      </div>

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

      {/* Accordion by category */}
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
            const isOpen = openCategories[cat] !== false; // default open

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
