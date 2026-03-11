import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/design-system";

const PortfolioReconciliationClient = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [wires, setWires] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [iRes, wRes, dRes] = await Promise.all([
        supabase.from("gc_invoices").select("*"),
        supabase.from("developer_wires").select("*"),
        supabase.from("draws").select("*"),
      ]);
      setInvoices(iRes.data ?? []);
      setWires(wRes.data ?? []);
      setDraws(dRes.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const totalInv = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalWire = wires.reduce((s, w) => s + Number(w.amount || 0), 0);
  const totalDraw = draws.reduce((s, d) => s + Number(d.amount_certified || d.amount_requested || 0), 0);
  const gapInvWire = totalInv - totalWire;
  const gapWireDraw = totalWire - totalDraw;

  const unlinked = useMemo(() => {
    return invoices.filter(i => !wires.some(w => w.invoice_id === i.id)).length
      + wires.filter(w => !w.invoice_id).length
      + draws.filter(d => !wires.some(w => w.draw_id === d.id)).length;
  }, [invoices, wires, draws]);

  const deltaColor = (v: number, t: number) => Math.abs(v) < t ? "text-[#065F46]" : "text-[#DC2626]";

  if (loading) return <div className="flex items-center justify-center h-16"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[14px] font-bold text-[#0F1B2D]">Reconciliación del Portafolio</h2>
        <p className="text-[11px] text-gray-400">Invoices GC vs Wires vs Draws — todos tus proyectos</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KPI label="Total Invoices GC" value={fmt(totalInv)} color="text-[#E07B39]" />
        <KPI label="Total Wires Developer" value={fmt(totalWire)} color="text-blue-600" />
        <KPI label="Total Draws Banco" value={fmt(totalDraw)} color="text-[#0D7377]" />
        <KPI label="Gap Invoices vs Wires" value={fmt(Math.abs(gapInvWire))} color={deltaColor(gapInvWire, 1000)} icon={Math.abs(gapInvWire) < 1000 ? "🟢" : "🔴"} />
        <KPI label="Gap Wires vs Draws" value={fmt(Math.abs(gapWireDraw))} color={deltaColor(gapWireDraw, 1000)} icon={Math.abs(gapWireDraw) < 1000 ? "🟢" : "🔴"} />
        <KPI label="Sin vincular" value={String(unlinked)} color={unlinked === 0 ? "text-[#065F46]" : "text-[#E07B39]"} icon={unlinked === 0 ? "🟢" : "🟠"} />
      </div>
    </div>
  );
};

const KPI = ({ label, value, color, icon }: { label: string; value: string; color: string; icon?: string }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
    <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
    <p className={`text-[20px] font-bold mt-1 ${color}`}>{icon && `${icon} `}{value}</p>
  </div>
);

export default PortfolioReconciliationClient;
