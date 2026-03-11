import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TH_CLASS, TD_CLASS, TR_HOVER, fmt } from "@/lib/design-system";

interface ReconciliationProps { projectId: string; }

type TimelineItem = {
  date: string;
  type: "invoice" | "wire" | "draw";
  ref: string;
  concept: string;
  amount: number;
  linkedTo: string | null;
  status: string;
  id: string;
  invoiceId?: string | null;
  drawId?: string | null;
};

const TYPE_CONFIG = {
  invoice: { emoji: "🧾", label: "Invoice GC", bg: "bg-orange-50" },
  wire: { emoji: "💸", label: "Wire Dev.", bg: "bg-blue-50" },
  draw: { emoji: "🏦", label: "Draw Banco", bg: "bg-[#E8F4F4]" },
};

const ReconciliationAdmin = ({ projectId }: ReconciliationProps) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [wires, setWires] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkModal, setLinkModal] = useState<{ type: "wire"; id: string; field: "invoice_id" | "draw_id" } | null>(null);
  const [linkValue, setLinkValue] = useState("");

  const load = async () => {
    setLoading(true);
    const [iRes, wRes, dRes] = await Promise.all([
      supabase.from("gc_invoices").select("*").eq("project_id", projectId),
      supabase.from("developer_wires").select("*").eq("project_id", projectId),
      supabase.from("draws").select("*").eq("project_id", projectId),
    ]);
    setInvoices(iRes.data ?? []);
    setWires(wRes.data ?? []);
    setDraws(dRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  const totals = useMemo(() => ({
    invoices: invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0),
    wires: wires.reduce((s, w) => s + Number(w.amount || 0), 0),
    draws: draws.reduce((s, d) => s + Number(d.amount_certified || d.amount_requested || 0), 0),
  }), [invoices, wires, draws]);

  const deltas = useMemo(() => ({
    invWire: totals.invoices - totals.wires,
    wireDraw: totals.wires - totals.draws,
    invDraw: totals.invoices - totals.draws,
  }), [totals]);

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];
    invoices.forEach(i => {
      const linkedWire = wires.find(w => w.invoice_id === i.id);
      items.push({
        date: i.invoice_date || i.created_at?.slice(0, 10) || "",
        type: "invoice", ref: `#${i.invoice_number || "s/n"}`,
        concept: `Invoice del GC`, amount: Number(i.total_amount || 0),
        linkedTo: linkedWire ? `Wire #${linkedWire.wire_number || "s/n"}` : null,
        status: i.status || "pending", id: i.id,
      });
    });
    wires.forEach(w => {
      const linkedInv = w.invoice_id ? invoices.find(i => i.id === w.invoice_id) : null;
      const linkedDraw = w.draw_id ? draws.find(d => d.id === w.draw_id) : null;
      const links = [
        linkedInv ? `Invoice #${linkedInv.invoice_number || "s/n"}` : null,
        linkedDraw ? `Draw #${linkedDraw.draw_number}` : null,
      ].filter(Boolean).join(", ");
      items.push({
        date: w.wire_date, type: "wire", ref: `#${w.wire_number || "s/n"}`,
        concept: w.concept || w.beneficiary || "Wire", amount: Number(w.amount || 0),
        linkedTo: links || null, status: w.status || "sent", id: w.id,
        invoiceId: w.invoice_id, drawId: w.draw_id,
      });
    });
    draws.forEach(d => {
      const linkedWire = wires.find(w => w.draw_id === d.id);
      items.push({
        date: d.request_date || "", type: "draw", ref: `#${d.draw_number}`,
        concept: `Draw bancario`, amount: Number(d.amount_certified || d.amount_requested || 0),
        linkedTo: linkedWire ? `Wire #${linkedWire.wire_number || "s/n"}` : null,
        status: d.status || "pending", id: d.id,
      });
    });
    items.sort((a, b) => a.date.localeCompare(b.date));
    return items;
  }, [invoices, wires, draws]);

  // Running balance: + draws, - wires
  const timelineWithBalance = useMemo(() => {
    let bal = 0;
    return timeline.map(item => {
      if (item.type === "draw") bal += item.amount;
      else if (item.type === "wire") bal -= item.amount;
      return { ...item, balance: bal };
    });
  }, [timeline]);

  // Unlinked counts
  const unlinkedInvoices = invoices.filter(i => !wires.some(w => w.invoice_id === i.id)).length;
  const unlinkedWires = wires.filter(w => !w.invoice_id).length;
  const unlinkedDraws = draws.filter(d => !wires.some(w => w.draw_id === d.id)).length;
  const hasUnlinked = unlinkedInvoices > 0 || unlinkedWires > 0 || unlinkedDraws > 0;

  const saveLinkage = async () => {
    if (!linkModal || !linkValue) return;
    await supabase.from("developer_wires").update({ [linkModal.field]: linkValue === "none" ? null : linkValue }).eq("id", linkModal.id);
    toast.success("Vinculación actualizada");
    setLinkModal(null);
    setLinkValue("");
    load();
  };

  const deltaColor = (v: number, threshold = 100) => Math.abs(v) < threshold ? "text-[#065F46]" : "text-[#DC2626]";
  const deltaIcon = (v: number, threshold = 100) => Math.abs(v) < threshold ? "🟢" : "🔴";

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-[#0F1B2D]">Reconciliación Financiera — Cap. 11</h2>
        <p className="text-[12px] text-gray-400">Invoices GC vs Wires Developer vs Draws Banco</p>
      </div>

      {/* Three summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard emoji="🧾" title="INVOICES GC" total={totals.invoices} count={invoices.length} label="invoices" color="text-[#E07B39]" />
        <SummaryCard emoji="💸" title="WIRES DEV." total={totals.wires} count={wires.length} label="wires" color="text-blue-600" />
        <SummaryCard emoji="🏦" title="DRAWS BANCO" total={totals.draws} count={draws.length} label="draws" color="text-[#0D7377]" />
      </div>

      {/* Delta row */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-2">
        {[
          { label: "Invoices vs Wires", val: deltas.invWire },
          { label: "Wires vs Draws", val: deltas.wireDraw },
          { label: "Invoices vs Draws", val: deltas.invDraw },
        ].map(d => (
          <div key={d.label} className="flex items-center gap-3 text-[12px]">
            <span className="text-gray-500 w-40">{d.label}:</span>
            <span className={`font-semibold ${deltaColor(d.val)}`}>{fmt(Math.abs(d.val))}</span>
            <span>{deltaIcon(d.val)} {Math.abs(d.val) < 100 ? "Balanceado" : "Gap"}</span>
          </div>
        ))}
      </div>

      {/* Unlinked alerts */}
      {hasUnlinked && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-[13px] font-bold text-[#92400E] mb-2">⚠️ Movimientos sin vincular</p>
          {unlinkedInvoices > 0 && <p className="text-[11px] text-[#92400E]">• {unlinkedInvoices} invoice(s) sin wire asociado</p>}
          {unlinkedWires > 0 && <p className="text-[11px] text-[#92400E]">• {unlinkedWires} wire(s) sin invoice asociado</p>}
          {unlinkedDraws > 0 && <p className="text-[11px] text-[#92400E]">• {unlinkedDraws} draw(s) sin wire asociado</p>}
          <p className="text-[11px] text-gray-500 mt-2">Revisa y vincula para completar la reconciliación.</p>
        </div>
      )}

      {/* Timeline table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
        <table className="w-full text-[12px] border-collapse min-w-[900px]">
          <thead><tr>
            {["Fecha", "Tipo", "# Referencia", "Concepto", "Monto", "Vinculado a", "Estado", "Balance acum."].map(h =>
              <th key={h} className={TH_CLASS}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {timelineWithBalance.map((item, i) => {
              const cfg = TYPE_CONFIG[item.type];
              return (
                <tr key={`${item.type}-${item.id}`} className={`${cfg.bg} ${TR_HOVER} border-b border-gray-100`}>
                  <td className={TD_CLASS}>{item.date || "—"}</td>
                  <td className={TD_CLASS}><Badge className="border-0 text-[10px] bg-white/80">{cfg.emoji} {cfg.label}</Badge></td>
                  <td className={`${TD_CLASS} font-mono`}>{item.ref}</td>
                  <td className={`${TD_CLASS} max-w-[200px] truncate`}>{item.concept}</td>
                  <td className={`${TD_CLASS} text-right font-mono font-semibold`}>{fmt(item.amount)}</td>
                  <td className={TD_CLASS}>
                    {item.linkedTo ? (
                      <span className="text-[11px] text-[#0D7377]">{item.linkedTo}</span>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[10px]">⚠️ Sin vincular</Badge>
                    )}
                  </td>
                  <td className={TD_CLASS}><span className="text-[11px]">{item.status}</span></td>
                  <td className={`${TD_CLASS} text-right font-mono font-semibold ${item.balance < 0 ? "text-[#DC2626]" : ""}`}>{fmt(item.balance)}</td>
                </tr>
              );
            })}
            {timeline.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-[12px]">Sin movimientos</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Link modal */}
      <Dialog open={!!linkModal} onOpenChange={() => setLinkModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Vincular wire</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {linkModal?.field === "invoice_id" ? (
              <Select value={linkValue} onValueChange={setLinkValue}>
                <SelectTrigger><SelectValue placeholder="Seleccionar invoice" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {invoices.map(i => <SelectItem key={i.id} value={i.id}>Invoice #{i.invoice_number || "s/n"} — {fmt(i.total_amount)}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={linkValue} onValueChange={setLinkValue}>
                <SelectTrigger><SelectValue placeholder="Seleccionar draw" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {draws.map(d => <SelectItem key={d.id} value={d.id}>Draw #{d.draw_number} — {fmt(d.amount_certified || d.amount_requested)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button onClick={saveLinkage} className="w-full bg-[#0D7377] hover:bg-[#0a5c60] text-white">Vincular</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryCard = ({ emoji, title, total, count, label, color }: any) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
    <p className="text-[11px] text-gray-400 uppercase tracking-wide">{emoji} {title}</p>
    <p className={`text-[22px] font-bold mt-1 ${color}`}>{fmt(total)}</p>
    <p className="text-[11px] text-gray-400 mt-1">{count} {label}</p>
  </div>
);

export default ReconciliationAdmin;
