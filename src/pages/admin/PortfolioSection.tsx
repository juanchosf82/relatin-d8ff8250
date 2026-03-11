import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fmt, PAGE_TITLE, TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE } from "@/lib/design-system";
import { RefreshCw, FileDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";
import PortfolioReconciliation from "@/components/admin/PortfolioReconciliation";

interface ProjectFinancial {
  id: string;
  code: string;
  address: string;
  status: string | null;
  progress_pct: number | null;
  lender_name: string | null;
  gc_name: string | null;
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



const PortfolioSection = () => {
  const [tab, setTab] = useState<"general" | "cashflow" | "reconciliacion">("general");
  const [projects, setProjects] = useState<ProjectFinancial[]>([]);
  const [cashData, setCashData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState(24);
  const [simProject, setSimProject] = useState("");
  const [simDelay, setSimDelay] = useState(0);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data: projs } = await supabase.from("projects").select("*");
    const list: ProjectFinancial[] = [];
    for (const p of projs || []) {
      const { data: fin } = await supabase.from("project_financials").select("*").eq("project_id", p.id).maybeSingle();
      const f = fin || {} as any;
      list.push({
        id: p.id, code: p.code, address: p.address, status: p.status,
        progress_pct: p.progress_pct, lender_name: p.lender_name, gc_name: p.gc_name,
        co_target_date: p.co_target_date, loan_amount: p.loan_amount,
        land_cost: Number(f.land_cost || 0), hard_costs: Number(f.hard_costs || 0),
        soft_costs: Number(f.soft_costs || 0), financing_costs: Number(f.financing_costs || 0),
        contingency_pct: Number(f.contingency_pct || 8), sale_price_target: Number(f.sale_price_target || 0),
        equity_invested: Number(f.equity_invested || 0), loan_fin: Number(f.loan_amount || p.loan_amount || 0),
        loan_maturity_date: f.loan_maturity_date,
      });
    }
    setProjects(list);

    // Cashflow data
    const { data: cf } = await supabase.from("cashflow_entries").select("*, projects(code)").order("entry_date");
    const weekMap: Record<string, any> = {};
    (cf || []).forEach((e: any) => {
      const d = new Date(e.entry_date);
      const wk = getWeekKey(d);
      if (!weekMap[wk]) weekMap[wk] = { week: wk, date: e.entry_date, inflows: 0, outflows: 0, net: 0 };
      if (e.direction === "in") weekMap[wk].inflows += Number(e.amount);
      else weekMap[wk].outflows += Number(e.amount);
    });
    const sorted = Object.values(weekMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
    let cum = 0;
    sorted.forEach((w: any) => { w.net = w.inflows - w.outflows; cum += w.net; w.cumulative = cum; });
    setCashData(sorted);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalCost = (p: ProjectFinancial) => {
    const base = p.land_cost + p.hard_costs + p.soft_costs + p.financing_costs;
    return base + p.hard_costs * (p.contingency_pct / 100);
  };
  const profit = (p: ProjectFinancial) => p.sale_price_target - totalCost(p);
  const roi = (p: ProjectFinancial) => { const tc = totalCost(p); return tc > 0 ? (profit(p) / tc) * 100 : 0; };
  const ltv = (p: ProjectFinancial) => { const t = p.loan_fin + p.equity_invested; return t > 0 ? (p.loan_fin / t) * 100 : 0; };

  const totalCapitalDeployed = projects.reduce((s, p) => s + p.loan_fin + p.equity_invested, 0);
  const totalCapitalAtRisk = projects.filter(p => p.status !== "completed").reduce((s, p) => s + p.loan_fin, 0);
  const totalCapitalRecovered = projects.filter(p => p.status === "completed").reduce((s, p) => s + p.sale_price_target, 0);
  const totalProfit = projects.reduce((s, p) => s + profit(p), 0);
  const avgRoi = projects.length ? projects.reduce((s, p) => s + roi(p), 0) / projects.length : 0;
  const avgDurationYears = 1.5;
  const irr = avgRoi / avgDurationYears;

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
  const banks = Object.entries(bankMap).map(([name, d]) => ({ name, ...d, pct: totalCapitalDeployed > 0 ? (d.exposure / projects.reduce((s, p) => s + p.loan_fin, 0)) * 100 : 0 }));
  const bankChartData = banks.map(b => ({ name: b.name, exposure: b.exposure }));

  // GC concentration
  const gcMap: Record<string, number> = {};
  projects.forEach(p => { const g = p.gc_name || "Sin GC"; gcMap[g] = (gcMap[g] || 0) + 1; });
  const gcConc = Object.entries(gcMap).map(([name, count]) => ({ name, count, pct: (count / projects.length) * 100 })).sort((a, b) => b.count - a.count);

  // Zip concentration
  const zipMap: Record<string, number> = {};
  projects.forEach(p => { const z = p.address?.match(/\b\d{5}\b/)?.[0] || "N/A"; zipMap[z] = (zipMap[z] || 0) + 1; });
  const zipConc = Object.entries(zipMap).map(([zip, count]) => ({ zip, count, pct: (count / projects.length) * 100 })).sort((a, b) => b.count - a.count).slice(0, 3);

  const concLabel = (maxPct: number) => maxPct > 70 ? { label: "Alta concentración", color: "border-red-500 text-red-700" } : maxPct > 50 ? { label: "Concentrado", color: "border-orange-400 text-orange-700" } : { label: "Diversificado", color: "border-green-500 text-green-700" };

  // Projections
  const today = new Date();
  const projectionsFor = (months: number) => {
    const horizon = new Date(today); horizon.setMonth(horizon.getMonth() + months);
    const inRange = projects.filter(p => p.co_target_date && new Date(p.co_target_date) <= horizon);
    return { count: inRange.length, recovered: inRange.reduce((s, p) => s + p.sale_price_target, 0), profit: inRange.reduce((s, p) => s + profit(p), 0) };
  };

  // Loan maturity timeline
  const loanTimeline = projects.filter(p => p.loan_maturity_date).map(p => {
    const d = new Date(p.loan_maturity_date!);
    const days = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    return { code: p.code, date: p.loan_maturity_date!, days, id: p.id };
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Liquidity gaps
  const gaps = cashData.filter((w: any) => w.cumulative < 0);

  // Scenario sim
  const simResult = (() => {
    if (!simProject || simDelay === 0) return null;
    const p = projects.find(pr => pr.id === simProject);
    if (!p || !p.co_target_date) return null;
    const newCO = new Date(p.co_target_date);
    newCO.setDate(newCO.getDate() + simDelay);
    const maturity = p.loan_maturity_date ? new Date(p.loan_maturity_date) : null;
    const exceeds = maturity ? newCO > maturity : false;
    const weeklyCost = totalCost(p) / 52;
    const gapEstimate = Math.round(weeklyCost * (simDelay / 7));
    return { newCO: newCO.toLocaleDateString(), exceeds, gapEstimate, code: p.code };
  })();

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={PAGE_TITLE}>{tab === "general" ? "Modelo Consolidado de Portafolio — Cap. 11.2" : "Flujo de Caja Consolidado — Cap. 11.4"}</h1>
          <p className="text-[12px] text-gray-400">{tab === "general" ? "Vista agregada de todos los proyectos activos" : "Liquidez semana a semana — todos los proyectos"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-gray-500 border border-gray-200 rounded hover:bg-gray-50"><RefreshCw className="h-3.5 w-3.5" /> Actualizar</button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-white bg-[#0D7377] rounded hover:bg-[#0a5c60]"><FileDown className="h-3.5 w-3.5" /> Exportar PDF</button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ k: "general", l: "Vista General" }, { k: "cashflow", l: "Flujo de Caja Consolidado" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors ${tab === t.k ? "bg-white text-[#0F1B2D] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{t.l}</button>
        ))}
      </div>

      {tab === "general" ? (
        <GeneralView
          projects={projects} totalCapitalDeployed={totalCapitalDeployed} totalCapitalAtRisk={totalCapitalAtRisk}
          totalCapitalRecovered={totalCapitalRecovered} totalProfit={totalProfit} avgRoi={avgRoi} irr={irr}
          totalCost={totalCost} profit={profit} roi={roi} ltv={ltv}
          banks={banks} bankChartData={bankChartData} gcConc={gcConc} zipConc={zipConc} concLabel={concLabel}
          projectionsFor={projectionsFor} navigate={navigate}
        />
      ) : (
        <CashflowView
          cashData={cashData} weeks={weeks} setWeeks={setWeeks} projects={projects}
          loanTimeline={loanTimeline} gaps={gaps}
          simProject={simProject} setSimProject={setSimProject} simDelay={simDelay} setSimDelay={setSimDelay} simResult={simResult}
        />
      )}
    </div>
  );
};

/* ═══ General View ═══ */
const GeneralView = ({ projects, totalCapitalDeployed, totalCapitalAtRisk, totalCapitalRecovered, totalProfit, avgRoi, irr, totalCost, profit, roi, ltv, banks, bankChartData, gcConc, zipConc, concLabel, projectionsFor, navigate }: any) => {
  const today = new Date();
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KPI label="Capital total desplegado" value={fmt(totalCapitalDeployed)} sub={`${projects.length} proyectos`} />
        <KPI label="Capital en riesgo" value={fmt(totalCapitalAtRisk)} sub="Proyectos activos" />
        <KPI label="Capital recuperado" value={fmt(totalCapitalRecovered)} sub="Proyectos completados" gray={totalCapitalRecovered === 0} />
        <KPI label="Profit proyectado total" value={fmt(totalProfit)} sub="Base scenario" />
        <KPI label="ROI promedio del portafolio" value={`${avgRoi.toFixed(1)}%`} sub="Ponderado" />
        <KPI label="IRR estimado portafolio" value={`${irr.toFixed(1)}%`} sub="(estimado)" />
      </div>

      {/* Projects Table */}
      <div>
        <h2 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Resumen por Proyecto</h2>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
          <table className="w-full text-[12px] border-collapse min-w-[900px]">
            <thead><tr>
              {["Proyecto", "Estado", "Costo Total", "Precio Objetivo", "Profit", "ROI", "Equity", "Loan", "LTV", "Venc. Loan", "Avance", ""].map(h => <th key={h} className={TH_CLASS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {projects.map((p: any, i: number) => {
                const tc = totalCost(p); const pr = profit(p); const r = roi(p); const l = ltv(p);
                const matDays = p.loan_maturity_date ? Math.ceil((new Date(p.loan_maturity_date).getTime() - today.getTime()) / 86400000) : null;
                return (
                  <tr key={p.id} className={`${TR_STRIPE(i)} ${TR_HOVER} border-b border-gray-100`}>
                    <td className={`${TD_CLASS} font-semibold`}>{p.code}</td>
                    <td className={TD_CLASS}><Badge className={`border-0 text-[10px] ${p.status === "on_track" ? "bg-[#E8F4F4] text-[#0D7377]" : p.status === "critical" ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#FEF3C7] text-[#92400E]"}`}>{p.status || "on_track"}</Badge></td>
                    <td className={TD_CLASS}>{fmt(tc)}</td>
                    <td className={TD_CLASS}>{fmt(p.sale_price_target)}</td>
                    <td className={`${TD_CLASS} font-semibold ${pr >= 0 ? "text-[#1A7A4A]" : "text-[#DC2626]"}`}>{fmt(pr)}</td>
                    <td className={`${TD_CLASS} font-semibold ${r >= 15 ? "text-[#1A7A4A]" : r >= 0 ? "text-[#E07B39]" : "text-[#DC2626]"}`}>{r.toFixed(1)}%</td>
                    <td className={TD_CLASS}>{fmt(p.equity_invested)}</td>
                    <td className={TD_CLASS}>{fmt(p.loan_fin)}</td>
                    <td className={TD_CLASS}>{l.toFixed(1)}%</td>
                    <td className={TD_CLASS}>
                      {p.loan_maturity_date ? <span className={`text-[11px] font-medium ${matDays !== null && matDays < 60 ? "text-[#DC2626]" : matDays !== null && matDays < 90 ? "text-[#E07B39]" : ""}`}>{p.loan_maturity_date}{matDays !== null && matDays < 90 && ` (${matDays}d)`}</span> : "—"}
                    </td>
                    <td className={TD_CLASS}>{p.progress_pct ?? 0}%</td>{/* Note: uses projects.progress_pct which is updated on SOV save */}
                    <td className={TD_CLASS}><button onClick={() => navigate(`/admin/proyecto/${p.id}`)} className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1"><ExternalLink className="h-3 w-3" />Ver</button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#0F1B2D] text-white text-[12px] font-semibold">
                <td className="px-3 py-2">Total</td><td className="px-3 py-2">—</td>
                <td className="px-3 py-2">{fmt(projects.reduce((s: number, p: any) => s + totalCost(p), 0))}</td>
                <td className="px-3 py-2">{fmt(projects.reduce((s: number, p: any) => s + p.sale_price_target, 0))}</td>
                <td className="px-3 py-2">{fmt(projects.reduce((s: number, p: any) => s + profit(p), 0))}</td>
                <td className="px-3 py-2">{projects.length ? (projects.reduce((s: number, p: any) => s + roi(p), 0) / projects.length).toFixed(1) : 0}%</td>
                <td className="px-3 py-2">{fmt(projects.reduce((s: number, p: any) => s + p.equity_invested, 0))}</td>
                <td className="px-3 py-2">{fmt(projects.reduce((s: number, p: any) => s + p.loan_fin, 0))}</td>
                <td className="px-3 py-2" colSpan={4}>—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bank Exposure */}
      <div>
        <h2 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Exposición por Banco Prestamista</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankChartData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="exposure" fill="#0D7377" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-[12px]">
              <thead><tr>
                {["Banco", "# Proy.", "Exposición", "% Portafolio", "Próx. Venc."].map(h => <th key={h} className={TH_CLASS}>{h}</th>)}
              </tr></thead>
              <tbody>
                {banks.map((b: any, i: number) => (
                  <tr key={b.name} className={`${TR_STRIPE(i)} ${TR_HOVER} border-b border-gray-100`}>
                    <td className={`${TD_CLASS} font-semibold`}>{b.name}</td>
                    <td className={TD_CLASS}>{b.count}</td>
                    <td className={TD_CLASS}>{fmt(b.exposure)}</td>
                    <td className={TD_CLASS}>{b.pct.toFixed(1)}%</td>
                    <td className={TD_CLASS}>{b.nextMaturity || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Risk Concentration */}
      <div>
        <h2 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Indicadores de Concentración de Riesgo</h2>
        <div className="grid grid-cols-3 gap-4">
          <ConcCard title="Por constructor (GC)" items={gcConc.map((g: any) => `${g.name}: ${g.count} proy. (${g.pct.toFixed(0)}%)`)} maxPct={gcConc[0]?.pct || 0} concLabel={concLabel} />
          <ConcCard title="Por zona geográfica" items={zipConc.map((z: any) => `ZIP ${z.zip}: ${z.count} proy. (${z.pct.toFixed(0)}%)`)} maxPct={zipConc[0]?.pct || 0} concLabel={concLabel} />
          <ConcCard title="Por banco" items={banks.map((b: any) => `${b.name}: ${b.pct.toFixed(0)}%`)} maxPct={banks[0]?.pct || 0} concLabel={concLabel} />
        </div>
      </div>

      {/* Projections */}
      <div>
        <h2 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Proyección de Retornos del Portafolio</h2>
        <div className="grid grid-cols-3 gap-4">
          {[12, 24, 36].map(m => {
            const p = projectionsFor(m);
            return (
              <div key={m} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <p className="text-[13px] font-bold text-[#0F1B2D] mb-3">{m} MESES</p>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between"><span className="text-gray-400">Proyectos completados:</span><span className="font-semibold">{p.count}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Capital recuperado:</span><span className="font-semibold text-[#0D7377]">{fmt(p.recovered)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Profit acumulado:</span><span className="font-semibold text-[#1A7A4A]">{fmt(p.profit)}</span></div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Basado en fechas estimadas de CO actuales. Sujeto a variaciones de cronograma.</p>
      </div>
    </div>
  );
};

/* ═══ Cashflow View ═══ */
const CashflowView = ({ cashData, weeks, setWeeks, projects, loanTimeline, gaps, simProject, setSimProject, simDelay, setSimDelay, simResult }: any) => {
  const sliced = cashData.slice(-weeks);
  const today = new Date();
  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-bold text-[#0F1B2D]">Liquidez Consolidada</p>
          <div className="flex gap-1">
            {[12, 24, 36].map(w => (
              <button key={w} onClick={() => setWeeks(w)} className={`px-3 py-1 text-[11px] rounded ${weeks === w ? "bg-[#0D7377] text-white" : "bg-gray-100 text-gray-500"}`}>{w} sem</button>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sliced}>
              <XAxis dataKey="week" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="inflows" name="Entradas" fill="#0D7377" stackId="a" />
              <Bar dataKey="outflows" name="Salidas" fill="#DC2626" stackId="b" />
              <Line dataKey="cumulative" name="Saldo Acum." stroke="#0F1B2D" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead><tr>
            {["Semana", "Fecha", "Entradas", "Salidas", "Neto", "Saldo Acum.", "Alerta"].map(h => <th key={h} className={TH_CLASS}>{h}</th>)}
          </tr></thead>
          <tbody>
            {sliced.map((w: any, i: number) => (
              <tr key={w.week} className={`${TR_STRIPE(i)} ${TR_HOVER} border-b border-gray-100`}>
                <td className={`${TD_CLASS} font-semibold`}>{w.week}</td>
                <td className={TD_CLASS}>{w.date}</td>
                <td className={`${TD_CLASS} text-[#1A7A4A]`}>{fmt(w.inflows)}</td>
                <td className={`${TD_CLASS} text-[#DC2626]`}>{fmt(w.outflows)}</td>
                <td className={`${TD_CLASS} font-semibold ${w.net >= 0 ? "text-[#1A7A4A]" : "text-[#DC2626]"}`}>{fmt(w.net)}</td>
                <td className={`${TD_CLASS} font-semibold ${w.cumulative >= 0 ? "" : "text-[#DC2626]"}`}>{fmt(w.cumulative)}</td>
                <td className={TD_CLASS}>{w.cumulative < 0 ? "🔴 Gap" : w.net < 0 ? "⚠️" : "✓"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Loan Maturity Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <p className="text-[13px] font-bold text-[#0F1B2D] mb-4">Timeline de Vencimiento de Loans</p>
        <div className="relative h-16">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200" />
          {loanTimeline.map((lt: any, i: number) => {
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

      {/* Scenario Simulator */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <p className="text-[13px] font-bold text-[#0F1B2D] mb-3">Simulador de Escenarios</p>
        <p className="text-[11px] text-gray-400 mb-4">¿Qué pasa si un proyecto se demora?</p>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Proyecto</label>
            <Select value={simProject} onValueChange={setSimProject}>
              <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Días de retraso: {simDelay}</label>
            <Slider value={[simDelay]} onValueChange={([v]) => setSimDelay(v)} min={0} max={180} step={7} className="mt-2" />
          </div>
          <div>
            {simResult && (
              <div className={`p-3 rounded-lg border text-[11px] ${simResult.exceeds ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
                <p className="font-semibold">{simResult.code} → Nueva CO: {simResult.newCO}</p>
                {simResult.exceeds && <p className="text-[#DC2626] font-medium mt-1">⚠️ Excede vencimiento del loan</p>}
                <p className="text-gray-500 mt-1">Gap estimado: {fmt(simResult.gapEstimate)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Liquidity Gaps */}
      {gaps.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-[13px] font-bold text-[#DC2626] mb-2">🔴 Gaps de liquidez detectados en el portafolio</p>
          {gaps.slice(0, 5).map((g: any, i: number) => (
            <p key={i} className="text-[11px] text-[#991B1B]">{g.week} ({g.date}): Gap de {fmt(Math.abs(g.cumulative))}</p>
          ))}
          <p className="text-[11px] text-gray-500 mt-2">Revisar calendario de draws con los bancos.</p>
        </div>
      )}
    </div>
  );
};

/* ═══ Helpers ═══ */
const KPI = ({ label, value, sub, gray }: { label: string; value: string; sub: string; gray?: boolean }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-5 ${gray ? "opacity-50" : ""}`}>
    <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-[24px] font-bold text-[#0D7377] mt-1">{value}</p>
    <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
  </div>
);

const ConcCard = ({ title, items, maxPct, concLabel }: any) => {
  const c = concLabel(maxPct);
  return (
    <div className={`bg-white rounded-lg border-l-4 ${c.color} border border-gray-200 shadow-sm p-4`}>
      <p className="text-[12px] font-bold text-[#0F1B2D] mb-2">{title}</p>
      {items.map((it: string, i: number) => <p key={i} className="text-[11px] text-gray-600">{it}</p>)}
      <p className={`text-[11px] font-semibold mt-2 ${c.color}`}>{maxPct > 70 ? "🔴" : maxPct > 50 ? "🟠" : "🟢"} {c.label}</p>
    </div>
  );
};

const getWeekKey = (d: Date) => {
  const y = d.getFullYear();
  const start = new Date(y, 0, 1);
  const wk = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `S${wk}/${y}`;
};

export default PortfolioSection;
