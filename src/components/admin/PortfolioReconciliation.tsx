import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE, fmt } from "@/lib/design-system";
import { ExternalLink } from "lucide-react";
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";

const PortfolioReconciliation = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [wires, setWires] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"consolidated" | "project">("consolidated");
  const [period, setPeriod] = useState<"monthly" | "quarterly">("monthly");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pRes, iRes, wRes, dRes] = await Promise.all([
        supabase.from("projects").select("id, code"),
        supabase.from("gc_invoices").select("*"),
        supabase.from("developer_wires").select("*"),
        supabase.from("draws").select("*"),
      ]);
      setProjects(pRes.data ?? []);
      setInvoices(iRes.data ?? []);
      setWires(wRes.data ?? []);
      setDraws(dRes.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const totalInv = useMemo(() => invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0), [invoices]);
  const totalWire = useMemo(() => wires.reduce((s, w) => s + Number(w.amount || 0), 0), [wires]);
  const totalDraw = useMemo(() => draws.reduce((s, d) => s + Number(d.amount_certified || d.amount_requested || 0), 0), [draws]);

  const gapInvWire = totalInv - totalWire;
  const gapWireDraw = totalWire - totalDraw;
  const totalUnlinked = useMemo(() => {
    const unlinkedInv = invoices.filter(i => !wires.some(w => w.invoice_id === i.id)).length;
    const unlinkedWires = wires.filter(w => !w.invoice_id).length;
    const unlinkedDraws = draws.filter(d => !wires.some(w => w.draw_id === d.id)).length;
    return unlinkedInv + unlinkedWires + unlinkedDraws;
  }, [invoices, wires, draws]);

  // Per-project data
  const perProject = useMemo(() => projects.map(p => {
    const pInv = invoices.filter(i => i.project_id === p.id);
    const pWire = wires.filter(w => w.project_id === p.id);
    const pDraw = draws.filter(d => d.project_id === p.id);
    const tInv = pInv.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const tWire = pWire.reduce((s, w) => s + Number(w.amount || 0), 0);
    const tDraw = pDraw.reduce((s, d) => s + Number(d.amount_certified || d.amount_requested || 0), 0);
    const dInvWire = tInv - tWire;
    const dWireDraw = tWire - tDraw;
    const unlinked = pInv.filter(i => !pWire.some(w => w.invoice_id === i.id)).length
      + pWire.filter(w => !w.invoice_id).length
      + pDraw.filter(d => !pWire.some(w => w.draw_id === d.id)).length;
    const maxDelta = Math.max(Math.abs(dInvWire), Math.abs(dWireDraw));
    const status = maxDelta > 10000 ? "critical" : (maxDelta > 1000 || unlinked > 0) ? "review" : "balanced";
    return { ...p, tInv, tWire, tDraw, dInvWire, dWireDraw, unlinked, status };
  }), [projects, invoices, wires, draws]);

  // Chart data
  const chartData = useMemo(() => {
    const map: Record<string, { month: string; invoices: number; wires: number; draws: number }> = {};
    const getKey = (dateStr: string) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (period === "quarterly") {
        const q = Math.floor(d.getMonth() / 3) + 1;
        return `Q${q}/${d.getFullYear()}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    invoices.forEach(i => {
      const k = getKey(i.invoice_date || i.created_at?.slice(0, 10));
      if (!k) return;
      if (!map[k]) map[k] = { month: k, invoices: 0, wires: 0, draws: 0 };
      map[k].invoices += Number(i.total_amount || 0);
    });
    wires.forEach(w => {
      const k = getKey(w.wire_date);
      if (!k) return;
      if (!map[k]) map[k] = { month: k, invoices: 0, wires: 0, draws: 0 };
      map[k].wires += Number(w.amount || 0);
    });
    draws.forEach(d => {
      const k = getKey(d.request_date);
      if (!k) return;
      if (!map[k]) map[k] = { month: k, invoices: 0, wires: 0, draws: 0 };
      map[k].draws += Number(d.amount_certified || d.amount_requested || 0);
    });
    const sorted = Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
    let cumInv = 0, cumWire = 0, cumDraw = 0;
    return sorted.map(s => {
      cumInv += s.invoices; cumWire += s.wires; cumDraw += s.draws;
      return { ...s, cumInv, cumWire, cumDraw };
    });
  }, [invoices, wires, draws, period]);

  const deltaColor = (v: number, threshold: number) => Math.abs(v) < threshold ? "text-[#065F46]" : "text-[#DC2626]";

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[16px] font-bold text-[#0F1B2D]">Reconciliación del Portafolio</h2>
        <p className="text-[12px] text-gray-400">Invoices GC vs Wires Developer vs Draws Banco — todos los proyectos</p>
      </div>

      {/* 6 KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPI label="Total Invoices GC" value={fmt(totalInv)} color="text-[#E07B39]" />
        <KPI label="Total Wires Developer" value={fmt(totalWire)} color="text-blue-600" />
        <KPI label="Total Draws Banco" value={fmt(totalDraw)} color="text-[#0D7377]" />
        <KPI label="Gap Invoices vs Wires" value={fmt(Math.abs(gapInvWire))} color={deltaColor(gapInvWire, 1000)} icon={Math.abs(gapInvWire) < 1000 ? "🟢" : "🔴"} />
        <KPI label="Gap Wires vs Draws" value={fmt(Math.abs(gapWireDraw))} color={deltaColor(gapWireDraw, 1000)} icon={Math.abs(gapWireDraw) < 1000 ? "🟢" : "🔴"} />
        <KPI label="Movimientos sin vincular" value={String(totalUnlinked)} color={totalUnlinked === 0 ? "text-[#065F46]" : "text-[#E07B39]"} icon={totalUnlinked === 0 ? "🟢" : "🟠"} />
      </div>

      {/* Per project table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
        <table className="w-full text-[12px] border-collapse min-w-[800px]">
          <thead><tr>
            {["Proyecto", "Invoices GC", "Wires Dev.", "Draws Banco", "Δ Inv-Wire", "Δ Wire-Draw", "Sin vincular", "Estado", ""].map(h =>
              <th key={h} className={TH_CLASS}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {perProject.map((p, i) => (
              <tr key={p.id} className={`${TR_STRIPE(i)} ${TR_HOVER} border-b border-gray-100`}>
                <td className={`${TD_CLASS} font-semibold`}>{p.code}</td>
                <td className={`${TD_CLASS} text-right font-mono`}>{fmt(p.tInv)}</td>
                <td className={`${TD_CLASS} text-right font-mono`}>{fmt(p.tWire)}</td>
                <td className={`${TD_CLASS} text-right font-mono`}>{fmt(p.tDraw)}</td>
                <td className={`${TD_CLASS} text-right font-mono ${deltaColor(p.dInvWire, 1000)}`}>{fmt(Math.abs(p.dInvWire))}</td>
                <td className={`${TD_CLASS} text-right font-mono ${deltaColor(p.dWireDraw, 1000)}`}>{fmt(Math.abs(p.dWireDraw))}</td>
                <td className={`${TD_CLASS} text-center`}>{p.unlinked > 0 ? <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px]">{p.unlinked}</Badge> : "—"}</td>
                <td className={TD_CLASS}>
                  <Badge className={`border-0 text-[10px] ${p.status === "balanced" ? "bg-[#D1FAE5] text-[#065F46]" : p.status === "critical" ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#FEF3C7] text-[#92400E]"}`}>
                    {p.status === "balanced" ? "Balanceado" : p.status === "critical" ? "Gap crítico" : "Revisar"}
                  </Badge>
                </td>
                <td className={TD_CLASS}><button onClick={() => navigate(`/admin/proyecto/${p.id}`)} className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1"><ExternalLink className="h-3 w-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-bold text-[#0F1B2D]">Timeline Consolidado</p>
          <div className="flex gap-2">
            <div className="flex gap-1">
              {(["consolidated", "project"] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1 text-[11px] rounded ${viewMode === v ? "bg-[#0D7377] text-white" : "bg-gray-100 text-gray-500"}`}>
                  {v === "consolidated" ? "Consolidado" : "Por proyecto"}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["monthly", "quarterly"] as const).map(v => (
                <button key={v} onClick={() => setPeriod(v)} className={`px-3 py-1 text-[11px] rounded ${period === v ? "bg-[#0F1B2D] text-white" : "bg-gray-100 text-gray-500"}`}>
                  {v === "monthly" ? "Mensual" : "Trimestral"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Area dataKey="cumInv" name="Invoices GC" fill="#E07B39" fillOpacity={0.3} stroke="#E07B39" />
              <Area dataKey="cumWire" name="Wires Dev." fill="#3B82F6" fillOpacity={0.3} stroke="#3B82F6" />
              <Line dataKey="cumDraw" name="Draws Banco" stroke="#0D7377" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const KPI = ({ label, value, color, icon }: { label: string; value: string; color: string; icon?: string }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
    <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
    <p className={`text-[22px] font-bold mt-1 ${color}`}>{icon && `${icon} `}{value}</p>
  </div>
);

export default PortfolioReconciliation;
