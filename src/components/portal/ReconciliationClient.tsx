import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { TH_CLASS, TD_CLASS, TR_HOVER, fmt } from "@/lib/design-system";

const TYPE_CONFIG = {
  invoice: { emoji: "🧾", label: "Invoice GC", bg: "bg-orange-50" },
  wire: { emoji: "💸", label: "Wire Dev.", bg: "bg-blue-50" },
  draw: { emoji: "🏦", label: "Draw Banco", bg: "bg-[#E8F4F4]" },
};

const ReconciliationClient = ({ projectId }: { projectId: string }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [wires, setWires] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    load();
  }, [projectId]);

  const totals = useMemo(() => ({
    invoices: invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0),
    wires: wires.reduce((s, w) => s + Number(w.amount || 0), 0),
    draws: draws.reduce((s, d) => s + Number(d.amount_certified || d.amount_requested || 0), 0),
  }), [invoices, wires, draws]);

  const isBalanced = Math.abs(totals.invoices - totals.wires) < 100 && Math.abs(totals.wires - totals.draws) < 100;

  const timeline = useMemo(() => {
    const items: any[] = [];
    invoices.forEach(i => items.push({
      date: i.invoice_date || i.created_at?.slice(0, 10) || "", type: "invoice",
      concept: `Invoice #${i.invoice_number || "s/n"}`, amount: Number(i.total_amount || 0), status: i.status, id: i.id,
    }));
    wires.forEach(w => items.push({
      date: w.wire_date, type: "wire",
      concept: w.concept || `Wire #${w.wire_number || "s/n"}`, amount: Number(w.amount || 0), status: w.status, id: w.id,
    }));
    draws.forEach(d => items.push({
      date: d.request_date || "", type: "draw",
      concept: `Draw #${d.draw_number}`, amount: Number(d.amount_certified || d.amount_requested || 0), status: d.status, id: d.id,
    }));
    items.sort((a, b) => a.date.localeCompare(b.date));
    return items;
  }, [invoices, wires, draws]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard emoji="🧾" title="Invoices GC" total={totals.invoices} color="text-[#E07B39]" />
        <SummaryCard emoji="💸" title="Wires Dev." total={totals.wires} color="text-blue-600" />
        <SummaryCard emoji="🏦" title="Draws Banco" total={totals.draws} color="text-[#0D7377]" />
      </div>

      {/* Balance status */}
      {isBalanced ? (
        <div className="bg-[#D1FAE5] border border-[#065F46]/20 rounded-lg p-5">
          <p className="text-[14px] font-bold text-[#065F46]">✅ Flujo financiero balanceado</p>
          <p className="text-[12px] text-[#065F46]/80 mt-1">Los movimientos del proyecto están correctamente reconciliados.</p>
          <p className="text-[11px] text-gray-500 mt-1">Actualizado por 360lateral.</p>
        </div>
      ) : (
        <div className="bg-[#FEF3C7] border border-[#E07B39]/20 rounded-lg p-5">
          <p className="text-[14px] font-bold text-[#92400E]">⚠️ Revisión en proceso</p>
          <p className="text-[12px] text-[#92400E]/80 mt-1">360lateral está reconciliando los movimientos financieros.</p>
          <p className="text-[11px] text-gray-500 mt-1">Te notificaremos cuando esté resuelto.</p>
        </div>
      )}

      {/* Timeline table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead><tr>
            {["Fecha", "Tipo", "Descripción", "Monto", "Estado"].map(h =>
              <th key={h} className={TH_CLASS}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {timeline.map((item, i) => {
              const cfg = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG];
              return (
                <tr key={`${item.type}-${item.id}`} className={`${cfg.bg} ${TR_HOVER} border-b border-gray-100`}>
                  <td className={TD_CLASS}>{item.date || "—"}</td>
                  <td className={TD_CLASS}><Badge className="border-0 text-[10px] bg-white/80">{cfg.emoji} {cfg.label}</Badge></td>
                  <td className={TD_CLASS}>{item.concept}</td>
                  <td className={`${TD_CLASS} text-right font-mono font-semibold`}>{fmt(item.amount)}</td>
                  <td className={TD_CLASS}><span className="text-[11px]">{item.status}</span></td>
                </tr>
              );
            })}
            {timeline.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-[12px]">Sin movimientos financieros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SummaryCard = ({ emoji, title, total, color }: any) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
    <p className="text-[11px] text-gray-400 uppercase tracking-wide">{emoji} {title}</p>
    <p className={`text-[20px] font-bold mt-1 ${color}`}>{fmt(total)}</p>
  </div>
);

export default ReconciliationClient;
