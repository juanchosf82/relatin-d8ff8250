import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";

const fmtUSD = (n: number | null | undefined) => {
  if (n == null) return "$0";
  return n < 0 ? `($${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})` : `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

interface Props { projectId: string; }

const FinancieroClient = ({ projectId }: Props) => {
  const [fin, setFin] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [finRes, entriesRes] = await Promise.all([
        supabase.from("project_financials").select("*").eq("project_id", projectId).maybeSingle(),
        supabase.from("cashflow_entries").select("*").eq("project_id", projectId).order("entry_date"),
      ]);
      setFin(finRes.data);
      setEntries(entriesRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const totalCost = useMemo(() => {
    if (!fin) return 0;
    const base = Number(fin.land_cost || 0) + Number(fin.hard_costs || 0) + Number(fin.soft_costs || 0) + Number(fin.financing_costs || 0);
    const contingency = Number(fin.hard_costs || 0) * (Number(fin.contingency_pct || 0) / 100);
    return base + contingency;
  }, [fin]);

  const scenarios = useMemo(() => {
    if (!fin) return [];
    const equity = Number(fin.equity_invested || 0);
    return [
      { name: "Conservador", price: Number(fin.sale_price_conservative || 0), border: "border-gray-300", bg: "bg-gray-50" },
      { name: "Base", price: Number(fin.sale_price_target || 0), border: "border-[#0D7377]", bg: "bg-[#E8F4F4]" },
      { name: "Optimista", price: Number(fin.sale_price_minimum || 0), border: "border-green-400", bg: "bg-green-50" },
    ].map(s => {
      const profit = s.price - totalCost;
      const margin = s.price > 0 ? (profit / s.price) * 100 : 0;
      const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
      const roe = equity > 0 ? (profit / equity) * 100 : 0;
      return { ...s, profit, margin, roi, roe };
    });
  }, [fin, totalCost]);

  const baseProfit = scenarios[1]?.profit ?? 0;
  const baseRoi = scenarios[1]?.roi ?? 0;

  const loanDaysRemaining = fin?.loan_maturity_date ? Math.ceil((new Date(fin.loan_maturity_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const ltv = (Number(fin?.loan_amount || 0) + Number(fin?.equity_invested || 0)) > 0 ? (Number(fin?.loan_amount || 0) / (Number(fin?.loan_amount || 0) + Number(fin?.equity_invested || 0))) * 100 : 0;

  // Monthly chart
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; inflows: number; outflows: number; balance: number }>();
    let cum = 0;
    [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date)).forEach(e => {
      const m = e.entry_date.substring(0, 7);
      if (!map.has(m)) map.set(m, { month: m, inflows: 0, outflows: 0, balance: 0 });
      const item = map.get(m)!;
      const amt = Number(e.amount || 0);
      if (e.direction === "in") { item.inflows += amt; cum += amt; }
      else { item.outflows += amt; cum -= amt; }
      item.balance = cum;
    });
    return Array.from(map.values());
  }, [entries]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;
  if (!fin) return <div className="text-center text-gray-400 text-[13px] py-12">El modelo financiero aún no está configurado.</div>;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Costo total del proyecto", v: fmtUSD(totalCost) },
          { l: "Precio objetivo de venta", v: fmtUSD(fin.sale_price_target) },
          { l: "Profit proyectado (base)", v: fmtUSD(baseProfit), c: baseProfit < 0 ? "text-red-600" : "text-green-600" },
          { l: "ROI proyectado", v: fmtPct(baseRoi), c: baseRoi < 15 ? "text-orange-500" : "text-[#0D7377]" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-[11px] text-gray-400">{kpi.l}</p>
              <p className={`text-[20px] font-bold font-mono ${kpi.c || "text-[#0F1B2D]"}`}>{kpi.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scenarios */}
      <div>
        <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-3">Escenarios de Venta</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((s, i) => (
            <Card key={i} className={`border-t-4 ${s.border} ${s.bg}`}>
              <CardContent className="p-4 space-y-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase">{s.name}</p>
                <p className="text-[18px] font-bold text-[#0F1B2D]">{fmtUSD(s.price)}</p>
                <div className="space-y-1 text-[12px]">
                  <div className="flex justify-between"><span className="text-gray-500">Profit</span><span className={`font-mono ${s.profit < 0 ? "text-red-600" : "text-green-600"}`}>{fmtUSD(s.profit)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Margin</span><span className="font-mono">{fmtPct(s.margin)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">ROI</span><span className="font-mono">{fmtPct(s.roi)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">ROE</span><span className="font-mono">{fmtPct(s.roe)}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Loan Status */}
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-3">Estado del Loan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px]">
            <div><p className="text-gray-400">Monto</p><p className="font-mono font-bold">{fmtUSD(fin.loan_amount)}</p></div>
            <div>
              <p className="text-gray-400">Vencimiento</p>
              <p className="font-mono font-bold flex items-center gap-1">
                {fin.loan_maturity_date || "—"}
                {loanDaysRemaining !== null && loanDaysRemaining < 60 && <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">{loanDaysRemaining}d</Badge>}
              </p>
            </div>
            <div><p className="text-gray-400">LTV</p><p className="font-mono font-bold">{fmtPct(ltv)}</p></div>
            <div><p className="text-gray-400">ARV actual</p><p className="font-mono font-bold">{fmtUSD(fin.arv_current)}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Loan maturity warning */}
      {loanDaysRemaining !== null && loanDaysRemaining < 60 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-orange-700">⚠️ El loan vence en {loanDaysRemaining} días</p>
            <p className="text-[12px] text-orange-600 mt-0.5">360lateral está coordinando la extensión con el banco.</p>
          </div>
        </div>
      )}

      {/* Cashflow Chart */}
      {monthlyData.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-3">Flujo de Caja</h3>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmtUSD(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="inflows" name="Entradas" fill="#0D7377" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="outflows" name="Salidas" fill="#E07B39" radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="balance" name="Saldo" stroke="#0F1B2D" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-400 text-right mt-1">Actualizado por 360lateral</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FinancieroClient;
