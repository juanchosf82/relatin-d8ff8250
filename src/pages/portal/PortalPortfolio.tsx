import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmt, PAGE_TITLE, TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE } from "@/lib/design-system";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { PieChart, Pie, Cell, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";

interface ProjectFinancial {
  id: string;
  code: string;
  address: string;
  status: string | null;
  progress_pct: number | null;
  lender_name: string | null;
  co_target_date: string | null;
  loan_amount: number | null;
  land_cost: number;
  hard_costs: number;
  soft_costs: number;
  financing_costs: number;
  contingency_pct: number;
  sale_price_target: number;
  equity_invested: number;
  loan_fin: number;
  loan_maturity_date: string | null;
}

const PortalPortfolio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"general" | "cashflow">("general");
  const [projects, setProjects] = useState<ProjectFinancial[]>([]);
  const [cashData, setCashData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState(24);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      // RLS scopes to client_user_id = auth.uid()
      const { data: projs } = await supabase.from("projects").select("*");
      const list: ProjectFinancial[] = [];
      for (const p of projs || []) {
        const { data: fin } = await supabase.from("project_financials").select("*").eq("project_id", p.id).maybeSingle();
        const f = (fin || {}) as any;
        list.push({
          id: p.id, code: p.code, address: p.address, status: p.status,
          progress_pct: p.progress_pct, lender_name: p.lender_name,
          co_target_date: p.co_target_date, loan_amount: p.loan_amount,
          land_cost: Number(f.land_cost || 0), hard_costs: Number(f.hard_costs || 0),
          soft_costs: Number(f.soft_costs || 0), financing_costs: Number(f.financing_costs || 0),
          contingency_pct: Number(f.contingency_pct || 8), sale_price_target: Number(f.sale_price_target || 0),
          equity_invested: Number(f.equity_invested || 0), loan_fin: Number(f.loan_amount || p.loan_amount || 0),
          loan_maturity_date: f.loan_maturity_date,
        });
      }
      setProjects(list);

      // Cashflow
      const { data: cf } = await supabase.from("cashflow_entries").select("*, projects(code)").order("entry_date");
      const monthMap: Record<string, any> = {};
      (cf || []).forEach((e: any) => {
        const d = new Date(e.entry_date);
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("es", { month: "short", year: "2-digit" });
        if (!monthMap[mk]) monthMap[mk] = { month: mk, label, inflows: 0, outflows: 0, net: 0 };
        if (e.direction === "in") monthMap[mk].inflows += Number(e.amount);
        else monthMap[mk].outflows += Number(e.amount);
      });
      const sorted = Object.values(monthMap).sort((a: any, b: any) => a.month.localeCompare(b.month));
      let cum = 0;
      sorted.forEach((w: any) => { w.net = w.inflows - w.outflows; cum += w.net; w.cumulative = cum; });
      setCashData(sorted);
      setLoading(false);
    };
    load();
  }, [user]);

  // If only 1 project, redirect
  useEffect(() => {
    if (!loading && projects.length < 2) navigate("/portal", { replace: true });
  }, [loading, projects.length, navigate]);

  const totalCost = (p: ProjectFinancial) => {
    const base = p.land_cost + p.hard_costs + p.soft_costs + p.financing_costs;
    return base + p.hard_costs * (p.contingency_pct / 100);
  };
  const profit = (p: ProjectFinancial) => p.sale_price_target - totalCost(p);
  const roi = (p: ProjectFinancial) => { const tc = totalCost(p); return tc > 0 ? (profit(p) / tc) * 100 : 0; };

  const totalCapitalDeployed = projects.reduce((s, p) => s + p.loan_fin + p.equity_invested, 0);
  const totalCapitalActive = projects.filter(p => p.status !== "completed").reduce((s, p) => s + p.loan_fin, 0);
  const totalCapitalRecovered = projects.filter(p => p.status === "completed").reduce((s, p) => s + p.sale_price_target, 0);
  const totalProfit = projects.reduce((s, p) => s + profit(p), 0);
  const avgRoi = projects.length ? projects.reduce((s, p) => s + roi(p), 0) / projects.length : 0;
  const avgDurationYears = 1.5;
  const irr = avgRoi / avgDurationYears;

  const today = new Date();

  // Bank exposure
  const bankMap: Record<string, { count: number; exposure: number; nextMaturity: string | null }> = {};
  projects.forEach(p => {
    const b = p.lender_name || "Sin banco";
    if (!bankMap[b]) bankMap[b] = { count: 0, exposure: 0, nextMaturity: null };
    bankMap[b].count++;
    bankMap[b].exposure += p.loan_fin;
    if (p.loan_maturity_date && (!bankMap[b].nextMaturity || p.loan_maturity_date < bankMap[b].nextMaturity))
      bankMap[b].nextMaturity = p.loan_maturity_date;
  });
  const totalLoanExposure = projects.reduce((s, p) => s + p.loan_fin, 0);
  const banks = Object.entries(bankMap).map(([name, d]) => ({ name, ...d, pct: totalLoanExposure > 0 ? (d.exposure / totalLoanExposure) * 100 : 0 }));

  // Projections
  const projectionsFor = (months: number) => {
    const horizon = new Date(today); horizon.setMonth(horizon.getMonth() + months);
    const inRange = projects.filter(p => p.co_target_date && new Date(p.co_target_date) <= horizon);
    return { count: inRange.length, recovered: inRange.reduce((s, p) => s + p.sale_price_target, 0), profit: inRange.reduce((s, p) => s + profit(p), 0) };
  };

  // Loan timeline
  const loanTimeline = projects.filter(p => p.loan_maturity_date).map(p => {
    const d = new Date(p.loan_maturity_date!);
    const days = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    return { code: p.code, date: p.loan_maturity_date!, days, id: p.id };
  }).sort((a, b) => a.date.localeCompare(b.date));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={PAGE_TITLE}>Mi Portafolio de Proyectos</h1>
        <p className="text-[12px] text-gray-400">Vista consolidada — actualizada por 360lateral</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ k: "general", l: "Vista General" }, { k: "cashflow", l: "Flujo de Caja" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors ${tab === t.k ? "bg-white text-[#0F1B2D] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{t.l}</button>
        ))}
      </div>

      {tab === "general" ? (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <KPI label="Capital total invertido" value={fmt(totalCapitalDeployed)} sub={`${projects.length} proyectos`} />
            <KPI label="Capital activo" value={fmt(totalCapitalActive)} sub="Proyectos en curso" />
            <KPI label="Capital recuperado" value={fmt(totalCapitalRecovered)} sub="Proyectos completados" gray={totalCapitalRecovered === 0} />
            <KPI label="Profit proyectado total" value={fmt(totalProfit)} sub="Base scenario" />
            <KPI label="ROI promedio" value={`${avgRoi.toFixed(1)}%`} sub="Ponderado" />
            <KPI label="IRR estimado" value={`${irr.toFixed(1)}%`} sub="(estimado)" />
          </div>

          {/* Projects Table */}
          <div>
            <h2 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Resumen de Proyectos</h2>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
              <table className="w-full text-[12px] border-collapse min-w-[800px]">
                <thead><tr>
                  {["Proyecto", "Estado", "Costo Total", "Precio Objetivo", "Profit", "ROI", "Venc. Loan", "Avance %", "Ver"].map(h => <th key={h} className={TH_CLASS}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {projects.map((p, i) => {
                    const tc = totalCost(p); const pr = profit(p); const r = roi(p);
                    const matDays = p.loan_maturity_date ? Math.ceil((new Date(p.loan_maturity_date).getTime() - today.getTime()) / 86400000) : null;
                    return (
                      <tr key={p.id} className={`${TR_STRIPE(i)} ${TR_HOVER} border-b border-gray-100`}>
                        <td className={`${TD_CLASS} font-semibold`}>{p.code}</td>
                        <td className={TD_CLASS}><Badge className={`border-0 text-[10px] ${p.status === "on_track" ? "bg-[#E8F4F4] text-[#0D7377]" : p.status === "critical" ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#FEF3C7] text-[#92400E]"}`}>{p.status || "on_track"}</Badge></td>
                        <td className={TD_CLASS}>{fmt(tc)}</td>
                        <td className={TD_CLASS}>{fmt(p.sale_price_target)}</td>
                        <td className={`${TD_CLASS} font-semibold ${pr >= 0 ? "text-[#1A7A4A]" : "text-[#DC2626]"}`}>{fmt(pr)}</td>
                        <td className={`${TD_CLASS} font-semibold ${r >= 15 ? "text-[#1A7A4A]" : r >= 0 ? "text-[#E07B39]" : "text-[#DC2626]"}`}>{r.toFixed(1)}%</td>
                        <td className={TD_CLASS}>
                          {p.loan_maturity_date ? <span className={`text-[11px] font-medium ${matDays !== null && matDays < 60 ? "text-[#DC2626]" : matDays !== null && matDays < 90 ? "text-[#E07B39]" : ""}`}>{p.loan_maturity_date}{matDays !== null && matDays < 90 && ` (${matDays}d)`}</span> : "—"}
                        </td>
                        <td className={TD_CLASS}>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#0D7377]" style={{ width: `${Math.min(p.progress_pct ?? 0, 100)}%` }} />
                            </div>
                            <span className="text-[11px]">{p.progress_pct ?? 0}%</span>
                          </div>
                        </td>
                        <td className={TD_CLASS}><button onClick={() => navigate(`/portal/proyecto/${p.id}`)} className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1"><ExternalLink className="h-3 w-3" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#0F1B2D] text-white text-[12px] font-semibold">
                    <td className="px-3 py-2">Total</td><td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">{fmt(projects.reduce((s, p) => s + totalCost(p), 0))}</td>
                    <td className="px-3 py-2">{fmt(projects.reduce((s, p) => s + p.sale_price_target, 0))}</td>
                    <td className="px-3 py-2">{fmt(projects.reduce((s, p) => s + profit(p), 0))}</td>
                    <td className="px-3 py-2">{projects.length ? (projects.reduce((s, p) => s + roi(p), 0) / projects.length).toFixed(1) : 0}%</td>
                    <td className="px-3 py-2" colSpan={3}>—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bank Exposure */}
          <div>
            <h2 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Mis Préstamos por Banco</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {banks.map(b => (
                <div key={b.name} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <p className="text-[13px] font-bold text-[#0F1B2D]">{b.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{b.count} proyecto{b.count !== 1 ? "s" : ""}</p>
                  <p className="text-[14px] font-bold text-[#0D7377] mt-2">Exposición: {fmt(b.exposure)}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Próximo vencimiento: {b.nextMaturity || "—"}</p>
                  <div className="mt-3 h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#0D7377]" style={{ width: `${Math.min(b.pct, 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{b.pct.toFixed(0)}% del portafolio</p>
                </div>
              ))}
            </div>
          </div>

          {/* Projections */}
          <div>
            <h2 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Proyección de Retornos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[12, 24, 36].map(m => {
                const p = projectionsFor(m);
                return (
                  <div key={m} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                    <p className="text-[13px] font-bold text-[#0F1B2D] mb-3">{m} MESES</p>
                    <div className="space-y-2 text-[12px]">
                      <div className="flex justify-between"><span className="text-gray-400">Proyectos a completar:</span><span className="font-semibold">{p.count}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Capital a recuperar:</span><span className="font-semibold text-[#0D7377]">{fmt(p.recovered)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Profit estimado:</span><span className="font-semibold text-[#1A7A4A]">{fmt(p.profit)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Basado en fechas estimadas de CO actuales. Sujeto a variaciones de cronograma.</p>
          </div>
        </div>
      ) : (
        /* ═══ Cashflow Tab ═══ */
        <div className="space-y-6">
          <div>
            <h2 className="text-[14px] font-bold text-[#0F1B2D]">Flujo de Caja Consolidado</h2>
            <p className="text-[12px] text-gray-400">Movimientos de capital — todos tus proyectos</p>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-[#0F1B2D]">Liquidez Consolidada</p>
              <div className="flex gap-1">
                {[6, 12, 24].map(m => (
                  <button key={m} onClick={() => setWeeks(m)} className={`px-3 py-1 text-[11px] rounded ${weeks === m ? "bg-[#0D7377] text-white" : "bg-gray-100 text-gray-500"}`}>{m} meses</button>
                ))}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashData.slice(-weeks)}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="inflows" name="Entradas" fill="#0D7377" />
                  <Bar dataKey="outflows" name="Salidas" fill="#DC2626" />
                  <Line dataKey="cumulative" name="Saldo Acum." stroke="#0F1B2D" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead><tr>
                {["Mes", "Entradas", "Salidas", "Neto", "Saldo Acum."].map(h => <th key={h} className={TH_CLASS}>{h}</th>)}
              </tr></thead>
              <tbody>
                {cashData.slice(-weeks).map((w: any, i: number) => (
                  <tr key={w.month} className={`${TR_STRIPE(i)} ${TR_HOVER} border-b border-gray-100`}>
                    <td className={`${TD_CLASS} font-semibold`}>{w.label}</td>
                    <td className={`${TD_CLASS} text-[#1A7A4A]`}>{fmt(w.inflows)}</td>
                    <td className={`${TD_CLASS} text-[#DC2626]`}>{fmt(w.outflows)}</td>
                    <td className={`${TD_CLASS} font-semibold ${w.net >= 0 ? "text-[#1A7A4A]" : "text-[#DC2626]"}`}>{fmt(w.net)}</td>
                    <td className={`${TD_CLASS} font-semibold ${w.cumulative >= 0 ? "" : "text-[#DC2626]"}`}>{fmt(w.cumulative)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Loan Maturity Timeline */}
          {loanTimeline.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <p className="text-[13px] font-bold text-[#0F1B2D] mb-4">Vencimiento de Préstamos</p>
              <div className="relative h-16">
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200" />
                {loanTimeline.map((lt, i) => {
                  const pos = Math.min(90, Math.max(5, (i / Math.max(loanTimeline.length - 1, 1)) * 85 + 5));
                  const color = lt.days < 60 ? "bg-[#DC2626]" : lt.days < 90 ? "bg-[#E07B39]" : "bg-[#0D7377]";
                  return (
                    <div key={lt.id} className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${pos}%` }}>
                      <div className={`w-3 h-3 rounded-full ${color} border-2 border-white shadow`} />
                      <span className="text-[9px] font-semibold text-[#0F1B2D] mt-1 whitespace-nowrap">{lt.code}</span>
                      <span className="text-[8px] text-gray-400 whitespace-nowrap">{lt.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loan maturity warning */}
          {loanTimeline.filter(lt => lt.days < 90 && lt.days > 0).length > 0 && (
            <div className="bg-[#FEF3C7] border border-[#E07B39]/30 rounded-lg p-4">
              <p className="text-[13px] font-bold text-[#92400E] mb-1">⚠️ Vencimiento de préstamo próximo</p>
              {loanTimeline.filter(lt => lt.days < 90 && lt.days > 0).map(lt => (
                <p key={lt.id} className="text-[11px] text-[#92400E]">{lt.code} — vence en {lt.days} días ({lt.date})</p>
              ))}
              <p className="text-[11px] text-gray-500 mt-1">360lateral está coordinando con el banco.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const KPI = ({ label, value, sub, gray }: { label: string; value: string; sub: string; gray?: boolean }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-5 ${gray ? "opacity-50" : ""}`}>
    <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-[24px] font-bold text-[#0D7377] mt-1">{value}</p>
    <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
  </div>
);

export default PortalPortfolio;
