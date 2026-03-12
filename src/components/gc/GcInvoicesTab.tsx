import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, ExternalLink } from "lucide-react";
import FileUploadSource from "@/components/FileUploadSource";

interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  status: string | null;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
}

const GcInvoicesTab = ({ projectId }: { projectId: string }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ invoice_number: "", invoice_date: "", total_amount: "", notes: "" });
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState("");

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("gc_invoices")
      .select("id, invoice_number, invoice_date, total_amount, status, notes, pdf_url, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setInvoices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, [projectId]);

  const handleFileSelected = async (file: File) => {
    const path = `project_files/gc_invoices/${projectId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("project_files").upload(path, file);
    if (error) { toast.error("Error subiendo archivo"); return; }
    const { data } = supabase.storage.from("project_files").getPublicUrl(path);
    setUploadedUrl(data.publicUrl);
    setUploadedFilename(file.name);
    toast.success("✓ Archivo adjuntado");
  };

  const handleSubmit = async () => {
    if (!form.invoice_number.trim()) { toast.error("Número de factura requerido"); return; }
    setSaving(true);

    const { error } = await supabase.from("gc_invoices").insert({
      project_id: projectId,
      invoice_number: form.invoice_number,
      invoice_date: form.invoice_date || null,
      total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
      notes: form.notes || null,
      pdf_url: uploadedUrl || null,
      pdf_filename: uploadedFilename || null,
      status: "submitted",
      extraction_method: "gc_upload",
      visible_to_client: false,
    } as any);

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("✓ Invoice enviada");
      setForm({ invoice_number: "", invoice_date: "", total_amount: "", notes: "" });
      setUploadedUrl("");
      setUploadedFilename("");
      setModalOpen(false);
      fetchInvoices();
    }
    setSaving(false);
  };

  const statusStyle: Record<string, string> = {
    submitted: "bg-blue-50 text-blue-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
    pending: "bg-gray-100 text-gray-500",
    paid: "bg-[#E07B39]/10 text-[#E07B39]",
  };

  const fmt = (n: number | null) => n != null ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E07B39]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-gray-400">Sube tus facturas para revisión por 360lateral.</p>
        <Button onClick={() => setModalOpen(true)} size="sm" className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
          <Plus className="h-3.5 w-3.5 mr-1" /> Nueva Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-[13px]">No hay invoices registradas</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#0F1B2D] text-white">
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Invoice #</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Fecha</th>
                <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Monto</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Estado</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className="px-3 py-2 font-medium text-[#0F1B2D]">{inv.invoice_number || "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{inv.invoice_date || "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmt(inv.total_amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${statusStyle[inv.status || "pending"]}`}>
                      {inv.status === "submitted" ? "Enviada" : inv.status === "approved" ? "Aprobada ✓" : inv.status === "rejected" ? "Rechazada" : inv.status || "pending"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-[#E07B39] hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Ver
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#E07B39]" /> Nueva Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[11px] text-gray-500">Número de factura *</Label>
              <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="text-[12px] h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-500">Fecha</Label>
                <Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} className="text-[12px] h-9" />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Monto total</Label>
                <Input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className="text-[12px] h-9" placeholder="$0.00" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-[12px] min-h-[50px]" />
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Adjuntar PDF</Label>
              <FileUploadSource
                onFileSelected={handleFileSelected}
                accept="pdf"
                projectId={projectId}
                storagePath={`project_files/gc_invoices/${projectId}/`}
              />
              {uploadedFilename && <p className="text-[11px] text-emerald-600 mt-1">✓ {uploadedFilename}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-[11px]">Cancelar</Button>
              <Button size="sm" onClick={handleSubmit} disabled={saving} className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
                {saving ? "Enviando..." : "Enviar Invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GcInvoicesTab;
