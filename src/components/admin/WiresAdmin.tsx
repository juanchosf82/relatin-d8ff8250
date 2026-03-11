import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Bot, Loader2 } from "lucide-react";
import { TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE, fmt, BTN_SUCCESS } from "@/lib/design-system";
import FileUploadSource from "@/components/FileUploadSource";

interface Wire {
  id: string;
  project_id: string | null;
  wire_number: string | null;
  wire_date: string;
  amount: number;
  beneficiary: string | null;
  bank_reference: string | null;
  concept: string | null;
  invoice_id: string | null;
  draw_id: string | null;
  status: string | null;
  notes: string | null;
  visible_to_client: boolean | null;
  file_url: string | null;
  file_filename: string | null;
  extraction_method: string | null;
}

const WIRE_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-gray-100 text-gray-600" },
  sent: { label: "Enviado", cls: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Confirmado ✓", cls: "bg-[#D1FAE5] text-[#065F46]" },
  returned: { label: "Devuelto", cls: "bg-[#FEE2E2] text-[#991B1B]" },
};

const emptyForm = {
  wire_number: "", wire_date: new Date().toISOString().slice(0, 10), amount: "",
  beneficiary: "", bank_reference: "", concept: "", invoice_id: "", draw_id: "",
  status: "sent", visible_to_client: true, notes: "",
  file_url: "", file_filename: "",
};

type ExtractedFields = Set<string>;

const WiresAdmin = ({ projectId }: { projectId: string }) => {
  const [wires, setWires] = useState<Wire[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; invoice_number: string | null }[]>([]);
  const [draws, setDraws] = useState<{ id: string; draw_number: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedFields>(new Set());
  const [confidence, setConfidence] = useState<string | null>(null);
  const [extractionMethod, setExtractionMethod] = useState<string>("manual");

  const load = async () => {
    setLoading(true);
    const [wRes, iRes, dRes] = await Promise.all([
      supabase.from("developer_wires").select("*").eq("project_id", projectId).order("wire_date", { ascending: false }),
      supabase.from("gc_invoices").select("id, invoice_number").eq("project_id", projectId),
      supabase.from("draws").select("id, draw_number").eq("project_id", projectId).order("draw_number"),
    ]);
    setWires((wRes.data ?? []) as Wire[]);
    setInvoices(iRes.data ?? []);
    setDraws(dRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  const totalAmount = useMemo(() => wires.reduce((s, w) => s + Number(w.amount), 0), [wires]);
  const sentCount = wires.filter(w => w.status === "sent").length;
  const pendingCount = wires.filter(w => w.status === "pending").length;
  const linkedCount = wires.filter(w => w.invoice_id).length;

  const resetExtractionState = () => {
    setExtractedFields(new Set());
    setConfidence(null);
    setExtractionMethod("manual");
  };

  const openAdd = () => {
    setEditingId(null); setForm(emptyForm); setPendingFile(null);
    resetExtractionState();
    setFormOpen(true);
  };
  const openEdit = (w: Wire) => {
    setEditingId(w.id);
    setPendingFile(null);
    resetExtractionState();
    setForm({
      wire_number: w.wire_number || "", wire_date: w.wire_date, amount: String(w.amount),
      beneficiary: w.beneficiary || "", bank_reference: w.bank_reference || "",
      concept: w.concept || "", invoice_id: w.invoice_id || "", draw_id: w.draw_id || "",
      status: w.status || "sent", visible_to_client: w.visible_to_client !== false, notes: w.notes || "",
      file_url: w.file_url || "", file_filename: w.file_filename || "",
    });
    setFormOpen(true);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileSelected = async (file: File) => {
    setPendingFile(file);

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) return;

    setExtracting(true);
    try {
      const base64 = await fileToBase64(file);
      const fileType = isPdf ? "pdf" : "image";

      const { data, error } = await supabase.functions.invoke("extract-wire-document", {
        body: { file_base64: base64, file_type: fileType, project_id: projectId },
      });

      if (error || data?.error) {
        console.error("Extraction error:", error || data?.error);
        toast.error("No se pudo extraer automáticamente. Completa los datos manualmente.", { icon: "⚠️" });
        setExtracting(false);
        return;
      }

      // Auto-fill form fields
      const filled = new Set<string>();
      const updates: Partial<typeof emptyForm> = {};

      if (data.wire_number) { updates.wire_number = String(data.wire_number); filled.add("wire_number"); }
      if (data.wire_date) { updates.wire_date = data.wire_date; filled.add("wire_date"); }
      if (data.amount != null) { updates.amount = String(data.amount); filled.add("amount"); }
      if (data.beneficiary) { updates.beneficiary = data.beneficiary; filled.add("beneficiary"); }
      if (data.bank_reference) { updates.bank_reference = data.bank_reference; filled.add("bank_reference"); }
      if (data.concept) { updates.concept = data.concept; filled.add("concept"); }
      if (data.status && WIRE_STATUS[data.status]) { updates.status = data.status; filled.add("status"); }

      setForm(prev => ({ ...prev, ...updates }));
      setExtractedFields(filled);
      setConfidence(data.confidence || "medium");
      setExtractionMethod(isPdf ? "pdf_auto" : "image_auto");

      toast.success(`${filled.size} campos extraídos automáticamente`, { icon: "🤖" });
    } catch (err) {
      console.error("Extraction failed:", err);
      toast.error("Error en la extracción. Completa manualmente.", { icon: "⚠️" });
    }
    setExtracting(false);
  };

  const uploadFile = async (file: File): Promise<{ url: string; filename: string } | null> => {
    const path = `wires/${projectId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("project_files").upload(path, file);
    if (error) {
      toast.error("Error al subir comprobante.");
      return null;
    }
    const { data: urlData } = supabase.storage.from("project_files").getPublicUrl(path);
    return { url: urlData.publicUrl, filename: file.name };
  };

  const save = async () => {
    setUploading(true);
    let fileUrl = form.file_url || null;
    let fileFilename = form.file_filename || null;

    if (pendingFile) {
      const result = await uploadFile(pendingFile);
      if (result) {
        fileUrl = result.url;
        fileFilename = result.filename;
      }
    }

    const data: any = {
      project_id: projectId, wire_number: form.wire_number || null, wire_date: form.wire_date,
      amount: parseFloat(form.amount) || 0, beneficiary: form.beneficiary || null,
      bank_reference: form.bank_reference || null, concept: form.concept || null,
      invoice_id: form.invoice_id || null, draw_id: form.draw_id || null,
      status: form.status, visible_to_client: form.visible_to_client, notes: form.notes || null,
      file_url: fileUrl, file_filename: fileFilename,
      extraction_method: extractionMethod,
    };
    if (editingId) {
      await supabase.from("developer_wires").update(data).eq("id", editingId);
      toast.success("Wire actualizado");
    } else {
      await supabase.from("developer_wires").insert([data]);
      toast.success("✓ Wire guardado correctamente");
    }
    setUploading(false);
    setFormOpen(false);
    setPendingFile(null);
    resetExtractionState();
    load();
  };

  const deleteWire = async (id: string) => {
    if (!confirm("¿Eliminar este wire?")) return;
    await supabase.from("developer_wires").delete().eq("id", id);
    toast.success("Wire eliminado");
    load();
  };

  const invoiceLabel = (id: string | null) => {
    if (!id) return null;
    const inv = invoices.find(i => i.id === id);
    return inv ? `#${inv.invoice_number || "s/n"}` : null;
  };
  const drawLabel = (id: string | null) => {
    if (!id) return null;
    const d = draws.find(dr => dr.id === id);
    return d ? `#${d.draw_number}` : null;
  };

  const AutoBadge = () => (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#E8F4F4] text-[#0D7377] text-[10px] font-medium ml-1">
      🤖 Auto-extraído
    </span>
  );

  const FieldLabel = ({ label, fieldKey }: { label: string; fieldKey: string }) => (
    <div className="flex items-center">
      <Label className="text-[11px] text-gray-400">{label}</Label>
      {extractedFields.has(fieldKey) && <AutoBadge />}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#0F1B2D]">Wires del Developer</h2>
        <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={openAdd}><Plus className="h-3.5 w-3.5 mr-1" /> Nuevo wire</Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-2">
          <span className="text-[11px] text-gray-400">💸 Total wires</span>
          <p className="text-[14px] font-bold text-[#0D7377]">{fmt(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-2">
          <span className="text-[11px] text-gray-400">✅ Enviados</span>
          <p className="text-[14px] font-bold">{sentCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-2">
          <span className="text-[11px] text-gray-400">⏳ Pendientes</span>
          <p className="text-[14px] font-bold">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-2">
          <span className="text-[11px] text-gray-400">🔗 Vinculados a invoice</span>
          <p className="text-[14px] font-bold">{linkedCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
        <table className="w-full text-[12px] border-collapse min-w-[1050px]">
          <thead><tr>
            {["# Wire", "Fecha", "Monto", "Beneficiario", "Referencia", "Concepto", "Invoice", "Draw", "Comprobante", "Origen", "Estado", "Acciones"].map(h =>
              <th key={h} className={TH_CLASS}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {wires.map((w, i) => {
              const st = WIRE_STATUS[w.status || "sent"] || WIRE_STATUS.sent;
              const invLbl = invoiceLabel(w.invoice_id);
              const drwLbl = drawLabel(w.draw_id);
              const isAuto = (w.extraction_method || "").includes("auto");
              return (
                <tr key={w.id} className={`${TR_STRIPE(i)} ${TR_HOVER} border-b border-gray-100`}>
                  <td className={`${TD_CLASS} font-mono`}>{w.wire_number || "—"}</td>
                  <td className={TD_CLASS}>{w.wire_date}</td>
                  <td className={`${TD_CLASS} text-right font-mono font-semibold`}>{fmt(w.amount)}</td>
                  <td className={TD_CLASS}>{w.beneficiary || "—"}</td>
                  <td className={TD_CLASS}>{w.bank_reference || "—"}</td>
                  <td className={`${TD_CLASS} max-w-[150px] truncate`}>{w.concept || "—"}</td>
                  <td className={TD_CLASS}>
                    {invLbl ? <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0 text-[10px]">Invoice {invLbl}</Badge> : <span className="text-gray-400 text-[11px]">Sin vincular</span>}
                  </td>
                  <td className={TD_CLASS}>
                    {drwLbl ? <Badge className="bg-[#0F1B2D]/10 text-[#0F1B2D] border-0 text-[10px]">Draw {drwLbl}</Badge> : <span className="text-gray-400 text-[11px]">—</span>}
                  </td>
                  <td className={TD_CLASS}>
                    {w.file_url ? (
                      <a href={w.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0D7377] hover:underline" title={w.file_filename || "Comprobante"}>
                        <FileText className="h-3.5 w-3.5" />
                        <span className="text-[10px] truncate max-w-[80px]">{w.file_filename || "📄"}</span>
                      </a>
                    ) : (
                      <span className="text-gray-300 text-[11px]">—</span>
                    )}
                  </td>
                  <td className={TD_CLASS}>
                    {isAuto ? (
                      <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0 text-[10px]">🤖 Auto-extraído</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">✏️ Manual</Badge>
                    )}
                  </td>
                  <td className={TD_CLASS}><Badge className={`${st.cls} border-0 text-[10px]`}>{st.label}</Badge></td>
                  <td className={TD_CLASS}>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(w)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                      <button onClick={() => deleteWire(w.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {wires.length === 0 && <tr><td colSpan={12} className="text-center py-8 text-gray-400 text-[12px]">Sin wires registrados</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Wire" : "Nuevo Wire"}</DialogTitle></DialogHeader>
          <div className="space-y-3">

            {/* Comprobante upload — first in "New" mode to enable AI extraction */}
            {!editingId && (
              <div>
                <Label className="text-[11px] text-gray-400">Comprobante del wire (opcional)</Label>
                {extracting ? (
                  <div className="mt-1 rounded-lg bg-[#0F1B2D] p-4 text-white flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <div>
                      <p className="text-[13px] font-medium">🔍 Extrayendo datos del wire...</p>
                      <p className="text-[11px] text-white/60">La IA está leyendo el documento</p>
                    </div>
                  </div>
                ) : pendingFile ? (
                  <div className="flex items-center gap-2 mt-1 p-2 bg-[#E8F4F4] rounded-lg border border-[#0D7377]/20">
                    <FileText className="h-4 w-4 text-[#0D7377]" />
                    <span className="text-[12px] text-[#0D7377] truncate flex-1">{pendingFile.name}</span>
                    <button type="button" onClick={() => { setPendingFile(null); resetExtractionState(); }} className="text-[11px] text-red-400 hover:text-red-600">Quitar</button>
                  </div>
                ) : (
                  <div className="mt-1">
                    <FileUploadSource
                      accept="pdf+images"
                      onFileSelected={handleFileSelected}
                      label="Adjuntar comprobante (PDF o imagen) — los datos se extraerán automáticamente"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Confidence indicator */}
            {confidence && (
              <div className="flex justify-center">
                {confidence === "high" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium">✓ Extracción confiable</span>
                )}
                {confidence === "medium" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-[#E07B39] text-[11px] font-medium">⚠️ Revisa los datos</span>
                )}
                {confidence === "low" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FEE2E2] text-[#991B1B] text-[11px] font-medium">⚠️ Baja confianza — verifica todo</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel label="Wire #" fieldKey="wire_number" />
                <Input
                  value={form.wire_number}
                  onChange={e => setForm({ ...form, wire_number: e.target.value })}
                  placeholder={extractedFields.size > 0 && !extractedFields.has("wire_number") ? "No encontrado — completar manualmente" : ""}
                  className={extractedFields.size > 0 && !extractedFields.has("wire_number") && !form.wire_number ? "bg-yellow-50" : ""}
                />
              </div>
              <div>
                <FieldLabel label="Fecha" fieldKey="wire_date" />
                <Input type="date" value={form.wire_date} onChange={e => setForm({ ...form, wire_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel label="Monto ($)" fieldKey="amount" />
                <Input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder={extractedFields.size > 0 && !extractedFields.has("amount") ? "No encontrado" : ""}
                  className={extractedFields.size > 0 && !extractedFields.has("amount") && !form.amount ? "bg-yellow-50" : ""}
                />
              </div>
              <div>
                <FieldLabel label="Beneficiario" fieldKey="beneficiary" />
                <Input
                  value={form.beneficiary}
                  onChange={e => setForm({ ...form, beneficiary: e.target.value })}
                  placeholder={extractedFields.size > 0 && !extractedFields.has("beneficiary") ? "No encontrado — completar manualmente" : ""}
                  className={extractedFields.size > 0 && !extractedFields.has("beneficiary") && !form.beneficiary ? "bg-yellow-50" : ""}
                />
              </div>
            </div>
            <div>
              <FieldLabel label="Referencia bancaria" fieldKey="bank_reference" />
              <Input
                value={form.bank_reference}
                onChange={e => setForm({ ...form, bank_reference: e.target.value })}
                placeholder={extractedFields.size > 0 && !extractedFields.has("bank_reference") ? "No encontrado — completar manualmente" : ""}
                className={extractedFields.size > 0 && !extractedFields.has("bank_reference") && !form.bank_reference ? "bg-yellow-50" : ""}
              />
            </div>
            <div>
              <FieldLabel label="Concepto" fieldKey="concept" />
              <Textarea
                value={form.concept}
                onChange={e => setForm({ ...form, concept: e.target.value })}
                rows={2}
                placeholder={extractedFields.size > 0 && !extractedFields.has("concept") ? "No encontrado — completar manualmente" : ""}
                className={extractedFields.size > 0 && !extractedFields.has("concept") && !form.concept ? "bg-yellow-50" : ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-400">Vincular a Invoice</Label>
                <Select value={form.invoice_id} onValueChange={v => setForm({ ...form, invoice_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {invoices.map(inv => <SelectItem key={inv.id} value={inv.id}>Invoice #{inv.invoice_number || "s/n"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-gray-400">Vincular a Draw</Label>
                <Select value={form.draw_id} onValueChange={v => setForm({ ...form, draw_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {draws.map(d => <SelectItem key={d.id} value={d.id}>Draw #{d.draw_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <FieldLabel label="Estado" fieldKey="status" />
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WIRE_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.visible_to_client} onCheckedChange={v => setForm({ ...form, visible_to_client: v })} />
              <Label className="text-[11px] text-gray-500">Visible para cliente</Label>
            </div>
            <div><Label className="text-[11px] text-gray-400">Notas</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

            {/* Comprobante in edit mode */}
            {editingId && (
              <div>
                <Label className="text-[11px] text-gray-400">Comprobante del wire (opcional)</Label>
                {form.file_url && !pendingFile ? (
                  <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText className="h-4 w-4 text-[#0D7377]" />
                    <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#0D7377] hover:underline truncate flex-1">
                      {form.file_filename || "Comprobante"}
                    </a>
                    <button type="button" onClick={() => { setForm({ ...form, file_url: "", file_filename: "" }); setPendingFile(null); }} className="text-[11px] text-red-400 hover:text-red-600">Quitar</button>
                  </div>
                ) : pendingFile ? (
                  <div className="flex items-center gap-2 mt-1 p-2 bg-[#E8F4F4] rounded-lg border border-[#0D7377]/20">
                    <FileText className="h-4 w-4 text-[#0D7377]" />
                    <span className="text-[12px] text-[#0D7377] truncate flex-1">{pendingFile.name}</span>
                    <button type="button" onClick={() => setPendingFile(null)} className="text-[11px] text-red-400 hover:text-red-600">Quitar</button>
                  </div>
                ) : (
                  <div className="mt-1">
                    <FileUploadSource
                      accept="pdf+images"
                      onFileSelected={(file) => setPendingFile(file)}
                      label="Adjuntar comprobante (PDF o imagen)"
                    />
                  </div>
                )}
              </div>
            )}

            <Button onClick={save} disabled={!form.wire_date || !form.amount || uploading || extracting} className={`w-full ${BTN_SUCCESS}`}>
              {uploading ? "Subiendo..." : editingId ? "Actualizar" : "✓ Guardar wire"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WiresAdmin;
