import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE, badgeClass, fmt,
  BTN_SUCCESS, BTN_PRIMARY, BTN_SECONDARY,
} from "@/lib/design-system";
import { Upload, Pencil, Trash2, FileText, Loader2, Check, AlertTriangle, Bot, ChevronDown, ChevronRight } from "lucide-react";
import FileUploadSource from "@/components/FileUploadSource";

interface Props {
  projectId: string;
}

type Invoice = {
  id: string;
  project_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  period_from: string | null;
  period_to: string | null;
  total_amount: number;
  status: string;
  pdf_url: string | null;
  pdf_filename: string | null;
  extraction_method: string;
  notes: string | null;
  visible_to_client: boolean;
  created_at: string;
};

type InvoiceLine = {
  id: string;
  invoice_id: string;
  line_number: number | null;
  product_service: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  sov_line_id: string | null;
};

const INVOICE_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]", label: "Pendiente" },
  approved: { bg: "bg-[#D1FAE5]", text: "text-[#065F46]", label: "Aprobado ✓" },
  disputed: { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", label: "En disputa" },
  paid:     { bg: "bg-[#E8F4F4]", text: "text-[#0D7377]", label: "Pagado" },
  rejected: { bg: "bg-[#FEE2E2]", text: "text-[#7F1D1D]", label: "Rechazado" },
};

const InvoicesAdmin = ({ projectId }: Props) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<Record<string, InvoiceLine[]>>({});
  const [sovLines, setSovLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Upload flow
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<"upload" | "processing" | "review" | "error">("upload");
  const [extractedHeader, setExtractedHeader] = useState<any>({});
  const [extractedLines, setExtractedLines] = useState<any[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Manual modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    invoice_number: "", invoice_date: "", period_from: "", period_to: "",
    status: "pending", notes: "",
  });
  const [manualLines, setManualLines] = useState<{ product_service: string; description: string; quantity: number; unit_price: number; amount: number }[]>([]);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualSaving, setManualSaving] = useState(false);

  // Delete
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gc_invoices")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setInvoices((data as any) ?? []);
    setLoading(false);
  }, [projectId]);

  const fetchSovLines = useCallback(async () => {
    const { data } = await supabase
      .from("sov_lines")
      .select("id, name, line_number")
      .eq("project_id", projectId)
      .order("line_number");
    setSovLines(data ?? []);
  }, [projectId]);

  useEffect(() => { fetchInvoices(); fetchSovLines(); }, [fetchInvoices, fetchSovLines]);

  const fetchLines = useCallback(async (invoiceId: string) => {
    if (invoiceLines[invoiceId]) return;
    const { data } = await supabase
      .from("gc_invoice_lines")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("line_number");
    setInvoiceLines(prev => ({ ...prev, [invoiceId]: (data as any) ?? [] }));
  }, [invoiceLines]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    fetchLines(id);
  };

  // Summary
  const totalInvoiced = useMemo(() => invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0), [invoices]);
  const countByStatus = useMemo(() => {
    const c: Record<string, number> = {};
    invoices.forEach(i => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [invoices]);

  // PDF upload
  const resetUpload = () => {
    setUploadStep("upload");
    setExtractedHeader({});
    setExtractedLines([]);
    setPdfFile(null);
    setErrorDetail(null);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") { toast.error("Solo PDF"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }

    setPdfFile(file);
    setUploadStep("processing");
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ""));

      const { data, error } = await supabase.functions.invoke("extract-invoice-pdf", {
        body: { pdf_base64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setExtractedHeader({
        invoice_number: data.invoice_number ?? null,
        invoice_date: data.invoice_date ?? null,
        period_from: data.period_from ?? null,
        period_to: data.period_to ?? null,
        total_amount: data.total_amount ?? null,
        status: "pending",
      });

      setExtractedLines((data.lines || []).map((l: any, i: number) => ({
        line_number: l.line_number ?? i + 1,
        product_service: l.product_service ?? "",
        description: l.description ?? "",
        quantity: l.quantity ?? 1,
        unit_price: l.unit_price ?? 0,
        amount: l.amount ?? 0,
        sov_line_id: null,
      })));

      setUploadStep("review");
    } catch (err: any) {
      setErrorDetail(err?.message || "Extracción fallida");
      toast.error("Error: " + (err?.message || "Extracción fallida"));
      setUploadStep("error");
    }
  };

  const sumExtractedLines = useMemo(() => extractedLines.reduce((s, l) => s + (l.amount || 0), 0), [extractedLines]);
  const totalDiff = Math.abs((extractedHeader.total_amount || 0) - sumExtractedLines);
  const totalsMatch = totalDiff < 1;

  const nullHighlight = (val: any) => val == null || val === "" ? "bg-yellow-50 border-yellow-300" : "";

  const handleConfirmImport = async () => {
    setSaving(true);
    try {
      let pdf_url = null;
      if (pdfFile) {
        const fileName = `${projectId}-inv-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from("project_files").upload(`invoices/${fileName}`, pdfFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("project_files").getPublicUrl(`invoices/${fileName}`);
        pdf_url = urlData.publicUrl;
      }

      const { data: invData, error: invErr } = await supabase.from("gc_invoices").insert([{
        project_id: projectId,
        invoice_number: extractedHeader.invoice_number,
        invoice_date: extractedHeader.invoice_date,
        period_from: extractedHeader.period_from,
        period_to: extractedHeader.period_to,
        total_amount: extractedHeader.total_amount || sumExtractedLines,
        status: extractedHeader.status || "pending",
        pdf_url,
        pdf_filename: pdfFile?.name,
        extraction_method: "pdf",
      }]).select("id").single();

      if (invErr) throw invErr;

      const lineRows = extractedLines.map(l => ({
        invoice_id: invData.id,
        project_id: projectId,
        line_number: l.line_number,
        product_service: l.product_service || "—",
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        amount: l.amount,
        sov_line_id: l.sov_line_id || null,
      }));

      if (lineRows.length > 0) {
        const { error: lErr } = await supabase.from("gc_invoice_lines").insert(lineRows);
        if (lErr) throw lErr;
      }

      toast.success(`✓ Invoice #${extractedHeader.invoice_number || "—"} importado — ${fmt(extractedHeader.total_amount || sumExtractedLines)}`);
      resetUpload();
      setUploadOpen(false);
      fetchInvoices();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Manual entry
  const resetManual = () => {
    setManualForm({ invoice_number: "", invoice_date: "", period_from: "", period_to: "", status: "pending", notes: "" });
    setManualLines([]);
    setManualFile(null);
  };

  const addManualLine = () => {
    setManualLines(prev => [...prev, { product_service: "", description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const updateManualLine = (idx: number, field: string, value: any) => {
    setManualLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      if (field === "quantity" || field === "unit_price") {
        updated.amount = (updated.quantity || 0) * (updated.unit_price || 0);
      }
      return updated;
    }));
  };

  const removeManualLine = (idx: number) => {
    setManualLines(prev => prev.filter((_, i) => i !== idx));
  };

  const manualTotal = useMemo(() => manualLines.reduce((s, l) => s + (l.amount || 0), 0), [manualLines]);

  const handleSaveManual = async () => {
    if (!manualForm.invoice_number) { toast.error("Invoice # requerido"); return; }
    setManualSaving(true);
    try {
      let pdf_url = null;
      if (manualFile) {
        const fileName = `${projectId}-inv-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from("project_files").upload(`invoices/${fileName}`, manualFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("project_files").getPublicUrl(`invoices/${fileName}`);
        pdf_url = urlData.publicUrl;
      }

      const { data: invData, error: invErr } = await supabase.from("gc_invoices").insert([{
        project_id: projectId,
        invoice_number: manualForm.invoice_number,
        invoice_date: manualForm.invoice_date || null,
        period_from: manualForm.period_from || null,
        period_to: manualForm.period_to || null,
        total_amount: manualTotal,
        status: manualForm.status,
        notes: manualForm.notes || null,
        pdf_url,
        pdf_filename: manualFile?.name,
        extraction_method: "manual",
      }]).select("id").single();

      if (invErr) throw invErr;

      if (manualLines.length > 0) {
        const lineRows = manualLines.map((l, i) => ({
          invoice_id: invData.id,
          project_id: projectId,
          line_number: i + 1,
          product_service: l.product_service || "—",
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.amount,
        }));
        const { error: lErr } = await supabase.from("gc_invoice_lines").insert(lineRows);
        if (lErr) throw lErr;
      }

      toast.success(`✓ Invoice #${manualForm.invoice_number} guardado`);
      resetManual();
      setManualOpen(false);
      fetchInvoices();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setManualSaving(false);
    }
  };

  // Status change
  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("gc_invoices").update({ status }).eq("id", id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    toast.success("Estado actualizado");
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteInvoice) return;
    await supabase.from("gc_invoice_lines").delete().eq("invoice_id", deleteInvoice.id);
    if (deleteInvoice.pdf_url) {
      const path = deleteInvoice.pdf_url.split("/project_files/")[1];
      if (path) await supabase.storage.from("project_files").remove([path]);
    }
    await supabase.from("gc_invoices").delete().eq("id", deleteInvoice.id);
    toast.success(`Invoice #${deleteInvoice.invoice_number || "—"} eliminado`);
    setDeleteInvoice(null);
    fetchInvoices();
  };

  if (loading) return <div className="flex items-center justify-center h-16"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[#0F1B2D]">Invoices del GC</h3>
        <div className="flex gap-2">
          <Button onClick={() => { resetUpload(); setUploadOpen(true); }} className={BTN_SUCCESS}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Subir Invoice
          </Button>
          <Button onClick={() => { resetManual(); setManualOpen(true); }} variant="outline" className="text-xs font-semibold">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Ingresar manual
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-[#E8F4F4] rounded-lg px-3 py-1.5 text-[12px]">
          <span className="text-[#0D7377] font-semibold">💰 Total invoiced: {fmt(totalInvoiced)}</span>
        </div>
        {(countByStatus.approved || 0) > 0 && (
          <div className="bg-[#D1FAE5] rounded-lg px-3 py-1.5 text-[12px] text-[#065F46] font-semibold">✅ Aprobados: {countByStatus.approved}</div>
        )}
        {(countByStatus.pending || 0) > 0 && (
          <div className="bg-[#F3F4F6] rounded-lg px-3 py-1.5 text-[12px] text-[#6B7280] font-semibold">⏳ Pendientes: {countByStatus.pending}</div>
        )}
        {(countByStatus.disputed || 0) > 0 && (
          <div className="bg-[#FEE2E2] rounded-lg px-3 py-1.5 text-[12px] text-[#991B1B] font-semibold">🔴 En disputa: {countByStatus.disputed}</div>
        )}
      </div>

      {/* Invoice table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className={`${TH_CLASS} w-8`}></th>
              <th className={TH_CLASS}>Invoice #</th>
              <th className={TH_CLASS}>Fecha</th>
              <th className={TH_CLASS}>Período</th>
              <th className={`${TH_CLASS} text-right`}>Monto Total</th>
              <th className={TH_CLASS}>Estado</th>
              <th className={TH_CLASS}>Origen</th>
              <th className={TH_CLASS}>Archivo</th>
              <th className={TH_CLASS}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, idx) => {
              const st = INVOICE_STATUS_BADGE[inv.status] || INVOICE_STATUS_BADGE.pending;
              const isPdf = inv.extraction_method === "pdf";
              const isExpanded = expandedId === inv.id;
              const lines = invoiceLines[inv.id] || [];

              return (
                <>
                  <tr key={inv.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors cursor-pointer`} onClick={() => toggleExpand(inv.id)}>
                    <td className={TD_CLASS}>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                    </td>
                    <td className={`${TD_CLASS} font-mono font-semibold`}>{inv.invoice_number || "—"}</td>
                    <td className={TD_CLASS}>{inv.invoice_date || "—"}</td>
                    <td className={TD_CLASS}>{inv.period_from && inv.period_to ? `${inv.period_from} — ${inv.period_to}` : "—"}</td>
                    <td className={`${TD_CLASS} text-right font-mono font-semibold`}>{fmt(inv.total_amount)}</td>
                    <td className={TD_CLASS}>
                      <Select value={inv.status} onValueChange={(v) => { handleStatusChange(inv.id, v); }}>
                        <SelectTrigger className="w-[130px] h-7 text-[11px] border-gray-200" onClick={e => e.stopPropagation()}>
                          <Badge className={badgeClass(st.bg, st.text)}>{st.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(INVOICE_STATUS_BADGE).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={TD_CLASS}>
                      {isPdf ? (
                        <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0 text-[10px]">
                          <Bot className="h-3 w-3 mr-0.5" /> Auto-extraído
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">
                          <Pencil className="h-3 w-3 mr-0.5" /> Manual
                        </Badge>
                      )}
                    </td>
                    <td className={TD_CLASS} onClick={e => e.stopPropagation()}>
                      {inv.pdf_url ? (
                        <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Ver
                        </a>
                      ) : "—"}
                    </td>
                    <td className={TD_CLASS} onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteInvoice(inv)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${inv.id}-lines`}>
                      <td colSpan={9} className="p-0">
                        <div className="bg-gray-50 border-l-[3px] border-[#0D7377] ml-4 mr-2 my-1 rounded">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-3 py-1.5 text-left text-[10px] uppercase text-gray-500 font-semibold">#</th>
                                <th className="px-3 py-1.5 text-left text-[10px] uppercase text-gray-500 font-semibold">Producto / Servicio</th>
                                <th className="px-3 py-1.5 text-left text-[10px] uppercase text-gray-500 font-semibold">Descripción</th>
                                <th className="px-3 py-1.5 text-right text-[10px] uppercase text-gray-500 font-semibold">Cant.</th>
                                <th className="px-3 py-1.5 text-right text-[10px] uppercase text-gray-500 font-semibold">Precio Unit.</th>
                                <th className="px-3 py-1.5 text-right text-[10px] uppercase text-gray-500 font-semibold">Monto</th>
                                <th className="px-3 py-1.5 text-left text-[10px] uppercase text-gray-500 font-semibold">SOV Line</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((l, li) => {
                                const sovMatch = sovLines.find(s => s.id === l.sov_line_id);
                                return (
                                  <tr key={l.id} className={`border-b border-gray-200 ${li % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                    <td className="px-3 py-1 font-mono text-gray-400">{l.line_number}</td>
                                    <td className="px-3 py-1 font-medium">{l.product_service}</td>
                                    <td className="px-3 py-1 text-gray-500">{l.description || "—"}</td>
                                    <td className="px-3 py-1 text-right font-mono">{l.quantity}</td>
                                    <td className="px-3 py-1 text-right font-mono">{fmt(l.unit_price)}</td>
                                    <td className="px-3 py-1 text-right font-mono font-semibold">{fmt(l.amount)}</td>
                                    <td className="px-3 py-1 text-[10px] text-gray-400">{sovMatch ? `${sovMatch.line_number} - ${sovMatch.name}` : "—"}</td>
                                  </tr>
                                );
                              })}
                              {lines.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-4 text-gray-400 text-[11px]">Sin líneas</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {invoices.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400 text-[12px]">Sin invoices</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PDF Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!o) resetUpload(); setUploadOpen(o); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Invoice desde PDF</DialogTitle></DialogHeader>

          {uploadStep === "upload" && (
            <FileUploadSource
              accept="pdf"
              label="— o arrastra el invoice del GC aquí —"
              onFileSelected={(file) => {
                const dt = new DataTransfer();
                dt.items.add(file);
                const input = document.createElement("input");
                input.type = "file";
                input.files = dt.files;
                handlePdfUpload({ target: input } as any);
              }}
            />
          )}

          {uploadStep === "processing" && (
            <div className="bg-[#0F1B2D] rounded-lg p-10 text-center space-y-3">
              <Loader2 className="h-10 w-10 text-white animate-spin mx-auto" />
              <p className="text-white text-[14px] font-medium">🔍 Extrayendo datos del invoice...</p>
              <p className="text-white/60 text-[12px]">Claude está leyendo el PDF</p>
            </div>
          )}

          {uploadStep === "error" && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto" />
              <p className="text-[13px] font-bold text-orange-700">⚠️ No se pudo extraer automáticamente</p>
              {errorDetail && <p className="text-[10px] text-gray-500 font-mono bg-gray-100 rounded px-2 py-1 max-w-md mx-auto break-all">{errorDetail}</p>}
              <p className="text-[12px] text-orange-600">Puedes ingresar los datos manualmente.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setUploadOpen(false)} variant="ghost">Cancelar</Button>
                <Button onClick={() => { setUploadOpen(false); resetManual(); setManualOpen(true); }} className={BTN_SECONDARY}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Ingresar manualmente
                </Button>
              </div>
            </div>
          )}

          {uploadStep === "review" && (
            <div className="space-y-5">
              {/* Header fields */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400">Invoice #</Label>
                  <Input value={extractedHeader.invoice_number ?? ""} onChange={e => setExtractedHeader({ ...extractedHeader, invoice_number: e.target.value || null })}
                    className={`h-8 text-[12px] font-mono ${nullHighlight(extractedHeader.invoice_number)}`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400">Fecha</Label>
                  <Input type="date" value={extractedHeader.invoice_date ?? ""} onChange={e => setExtractedHeader({ ...extractedHeader, invoice_date: e.target.value || null })}
                    className={`h-8 text-[12px] ${nullHighlight(extractedHeader.invoice_date)}`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400">Total</Label>
                  <Input type="number" value={extractedHeader.total_amount ?? ""} onChange={e => setExtractedHeader({ ...extractedHeader, total_amount: e.target.value ? Number(e.target.value) : null })}
                    className={`h-8 text-[12px] font-mono ${nullHighlight(extractedHeader.total_amount)}`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400">Período desde</Label>
                  <Input type="date" value={extractedHeader.period_from ?? ""} onChange={e => setExtractedHeader({ ...extractedHeader, period_from: e.target.value || null })}
                    className={`h-8 text-[12px] ${nullHighlight(extractedHeader.period_from)}`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400">Período hasta</Label>
                  <Input type="date" value={extractedHeader.period_to ?? ""} onChange={e => setExtractedHeader({ ...extractedHeader, period_to: e.target.value || null })}
                    className={`h-8 text-[12px] ${nullHighlight(extractedHeader.period_to)}`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-400">Estado</Label>
                  <Select value={extractedHeader.status || "pending"} onValueChange={v => setExtractedHeader({ ...extractedHeader, status: v })}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(INVOICE_STATUS_BADGE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {Object.entries(extractedHeader).some(([k, v]) => v == null && k !== "status") && (
                <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-[11px] text-yellow-700">
                  ⚠️ Los campos en amarillo no fueron encontrados — completar manualmente
                </div>
              )}

              {/* Lines table */}
              <div className="max-h-[300px] overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[10px] uppercase text-white bg-[#0F1B2D] font-semibold">#</th>
                      <th className="px-3 py-1.5 text-left text-[10px] uppercase text-white bg-[#0F1B2D] font-semibold">Producto/Servicio</th>
                      <th className="px-3 py-1.5 text-left text-[10px] uppercase text-white bg-[#0F1B2D] font-semibold">Descripción</th>
                      <th className="px-3 py-1.5 text-right text-[10px] uppercase text-white bg-[#0F1B2D] font-semibold">Cant.</th>
                      <th className="px-3 py-1.5 text-right text-[10px] uppercase text-white bg-[#0F1B2D] font-semibold">Precio Unit.</th>
                      <th className="px-3 py-1.5 text-right text-[10px] uppercase text-white bg-[#0F1B2D] font-semibold">Monto</th>
                      <th className="px-3 py-1.5 text-left text-[10px] uppercase text-white bg-[#0F1B2D] font-semibold">Vincular SOV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedLines.map((l, idx) => (
                      <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-3 py-1 font-mono text-gray-400">{l.line_number}</td>
                        <td className="px-3 py-1">
                          <Input value={l.product_service} onChange={e => { const n = [...extractedLines]; n[idx] = { ...n[idx], product_service: e.target.value }; setExtractedLines(n); }}
                            className="h-6 text-[10px] w-full border-gray-200" />
                        </td>
                        <td className="px-3 py-1">
                          <Input value={l.description || ""} onChange={e => { const n = [...extractedLines]; n[idx] = { ...n[idx], description: e.target.value }; setExtractedLines(n); }}
                            className="h-6 text-[10px] w-full border-gray-200" />
                        </td>
                        <td className="px-3 py-1 text-right">
                          <Input type="number" value={l.quantity} onChange={e => { const n = [...extractedLines]; n[idx] = { ...n[idx], quantity: Number(e.target.value) || 0 }; setExtractedLines(n); }}
                            className="h-6 text-[10px] text-right font-mono w-16 border-gray-200" />
                        </td>
                        <td className="px-3 py-1 text-right">
                          <Input type="number" value={l.unit_price} onChange={e => { const n = [...extractedLines]; n[idx] = { ...n[idx], unit_price: Number(e.target.value) || 0 }; setExtractedLines(n); }}
                            className="h-6 text-[10px] text-right font-mono w-20 border-gray-200" />
                        </td>
                        <td className="px-3 py-1 text-right">
                          <Input type="number" value={l.amount} onChange={e => { const n = [...extractedLines]; n[idx] = { ...n[idx], amount: Number(e.target.value) || 0 }; setExtractedLines(n); }}
                            className="h-6 text-[10px] text-right font-mono w-20 border-gray-200" />
                        </td>
                        <td className="px-3 py-1">
                          <Select value={l.sov_line_id || "none"} onValueChange={v => { const n = [...extractedLines]; n[idx] = { ...n[idx], sov_line_id: v === "none" ? null : v }; setExtractedLines(n); }}>
                            <SelectTrigger className="h-6 text-[10px] w-[140px] border-gray-200"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Sin vincular</SelectItem>
                              {sovLines.map(s => <SelectItem key={s.id} value={s.id}>{s.line_number} - {s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals validation */}
              <div className={`flex items-center gap-3 text-[12px] px-3 py-2 rounded ${totalsMatch ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                <span>Total extraído: {fmt(extractedHeader.total_amount)}</span>
                <span>|</span>
                <span>Suma de líneas: {fmt(sumExtractedLines)}</span>
                {totalsMatch ? (
                  <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Coincide</span>
                ) : (
                  <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Diferencia: {fmt(totalDiff)}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancelar</Button>
                <Button onClick={() => { setUploadOpen(false); resetManual(); setManualOpen(true); }} variant="outline" className="text-xs">
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar manualmente
                </Button>
                <Button onClick={handleConfirmImport} disabled={saving} className={BTN_SUCCESS}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  {saving ? "Importando..." : "Confirmar e importar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={manualOpen} onOpenChange={(o) => { if (!o) resetManual(); setManualOpen(o); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Invoice Manual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Invoice #</Label>
                <Input value={manualForm.invoice_number} onChange={e => setManualForm({ ...manualForm, invoice_number: e.target.value })} placeholder="INV-001" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Fecha</Label>
                <Input type="date" value={manualForm.invoice_date} onChange={e => setManualForm({ ...manualForm, invoice_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Período desde</Label>
                <Input type="date" value={manualForm.period_from} onChange={e => setManualForm({ ...manualForm, period_from: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Período hasta</Label>
                <Input type="date" value={manualForm.period_to} onChange={e => setManualForm({ ...manualForm, period_to: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Estado</Label>
                <Select value={manualForm.status} onValueChange={v => setManualForm({ ...manualForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVOICE_STATUS_BADGE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">PDF adjunto</Label>
                <FileUploadSource
                  accept="pdf"
                  compact
                  onFileSelected={(f) => setManualFile(f)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-gray-400">Notas</Label>
              <Textarea value={manualForm.notes} onChange={e => setManualForm({ ...manualForm, notes: e.target.value })} placeholder="Notas opcionales..." rows={2} />
            </div>

            {/* Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-gray-500 font-semibold uppercase">Líneas del Invoice</Label>
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={addManualLine}>+ Agregar línea</Button>
              </div>

              {manualLines.length > 0 && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 text-left text-[10px] text-gray-500">Producto/Servicio</th>
                        <th className="px-2 py-1 text-left text-[10px] text-gray-500">Descripción</th>
                        <th className="px-2 py-1 text-right text-[10px] text-gray-500">Cant.</th>
                        <th className="px-2 py-1 text-right text-[10px] text-gray-500">Precio Unit.</th>
                        <th className="px-2 py-1 text-right text-[10px] text-gray-500">Monto</th>
                        <th className="px-2 py-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualLines.map((l, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-2 py-1"><Input value={l.product_service} onChange={e => updateManualLine(i, "product_service", e.target.value)} className="h-6 text-[10px]" placeholder="Servicio" /></td>
                          <td className="px-2 py-1"><Input value={l.description} onChange={e => updateManualLine(i, "description", e.target.value)} className="h-6 text-[10px]" placeholder="Desc." /></td>
                          <td className="px-2 py-1"><Input type="number" value={l.quantity} onChange={e => updateManualLine(i, "quantity", Number(e.target.value) || 0)} className="h-6 text-[10px] text-right w-16" /></td>
                          <td className="px-2 py-1"><Input type="number" value={l.unit_price} onChange={e => updateManualLine(i, "unit_price", Number(e.target.value) || 0)} className="h-6 text-[10px] text-right w-20" /></td>
                          <td className="px-2 py-1 text-right font-mono font-semibold">{fmt(l.amount)}</td>
                          <td className="px-2 py-1"><Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeManualLine(i)}><Trash2 className="h-3 w-3" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {manualLines.length > 0 && (
                <div className="text-right text-[12px] font-semibold text-[#0F1B2D]">
                  Total: {fmt(manualTotal)}
                </div>
              )}
            </div>

            <Button onClick={handleSaveManual} disabled={manualSaving || !manualForm.invoice_number} className={`w-full ${BTN_PRIMARY}`}>
              {manualSaving ? "Guardando..." : "Guardar Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteInvoice} onOpenChange={o => { if (!o) setDeleteInvoice(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Invoice #{deleteInvoice?.invoice_number || "—"}?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvoicesAdmin;
