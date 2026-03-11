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
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
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

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (w: Wire) => {
    setEditingId(w.id);
    setForm({
      wire_number: w.wire_number || "", wire_date: w.wire_date, amount: String(w.amount),
      beneficiary: w.beneficiary || "", bank_reference: w.bank_reference || "",
      concept: w.concept || "", invoice_id: w.invoice_id || "", draw_id: w.draw_id || "",
      status: w.status || "sent", visible_to_client: w.visible_to_client !== false, notes: w.notes || "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    const data: any = {
      project_id: projectId, wire_number: form.wire_number || null, wire_date: form.wire_date,
      amount: parseFloat(form.amount) || 0, beneficiary: form.beneficiary || null,
      bank_reference: form.bank_reference || null, concept: form.concept || null,
      invoice_id: form.invoice_id || null, draw_id: form.draw_id || null,
      status: form.status, visible_to_client: form.visible_to_client, notes: form.notes || null,
    };
    if (editingId) {
      await supabase.from("developer_wires").update(data).eq("id", editingId);
      toast.success("Wire actualizado");
    } else {
      await supabase.from("developer_wires").insert([data]);
      toast.success("Wire creado");
    }
    setFormOpen(false);
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
        <table className="w-full text-[12px] border-collapse min-w-[900px]">
          <thead><tr>
            {["# Wire", "Fecha", "Monto", "Beneficiario", "Referencia", "Concepto", "Invoice", "Draw", "Estado", "Acciones"].map(h =>
              <th key={h} className={TH_CLASS}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {wires.map((w, i) => {
              const st = WIRE_STATUS[w.status || "sent"] || WIRE_STATUS.sent;
              const invLbl = invoiceLabel(w.invoice_id);
              const drwLbl = drawLabel(w.draw_id);
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
            {wires.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-gray-400 text-[12px]">Sin wires registrados</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Wire" : "Nuevo Wire"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px] text-gray-400">Wire #</Label><Input value={form.wire_number} onChange={e => setForm({ ...form, wire_number: e.target.value })} /></div>
              <div><Label className="text-[11px] text-gray-400">Fecha</Label><Input type="date" value={form.wire_date} onChange={e => setForm({ ...form, wire_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px] text-gray-400">Monto ($)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label className="text-[11px] text-gray-400">Beneficiario</Label><Input value={form.beneficiary} onChange={e => setForm({ ...form, beneficiary: e.target.value })} /></div>
            </div>
            <div><Label className="text-[11px] text-gray-400">Referencia bancaria</Label><Input value={form.bank_reference} onChange={e => setForm({ ...form, bank_reference: e.target.value })} /></div>
            <div><Label className="text-[11px] text-gray-400">Concepto</Label><Textarea value={form.concept} onChange={e => setForm({ ...form, concept: e.target.value })} rows={2} /></div>
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
              <Label className="text-[11px] text-gray-400">Estado</Label>
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
            <Button onClick={save} disabled={!form.wire_date || !form.amount} className={`w-full ${BTN_SUCCESS}`}>
              {editingId ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WiresAdmin;
