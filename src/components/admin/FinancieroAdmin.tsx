import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, ComposedChart } from "recharts";
import { BTN_PRIMARY, BTN_SUCCESS, BTN_SECONDARY, TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE } from "@/lib/design-system";

const fmtUSD = (n: number | null | undefined) => {
  if (n == null) return "$0";
  return n < 0 ? `($${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})` : `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const COST_COLORS = ["#0F1B2D", "#0D7377", "#E07B39", "#1A7A4A", "#9CA3AF"];

const INFLOW_TYPES = ["Draw del banco", "Equity del cliente", "Otro ingreso"];
const OUTFLOW_TYPES = ["Pago a GC", "Pago a subcontratista", "Soft cost", "Interés del loan", "Cierre/legal", "Otro egreso"];
const CATEGORIES = ["construction", "financing", "soft_costs", "equity", "sale", "other"];

interface Props { projectId: string; }

const FinancieroAdmin = ({ projectId }: Props) => {
  const [fin, setFin] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState<any>({ entry_date: "", direction: "out", entry_type: "", category: "construction", description: "", amount: "", is_projected: false, draw_id: null, notes: "" });

  // Sensitivity sliders
  const [costVar, setCostVar] = useState(0);
  const [priceVar, setPriceVar] = useState(0);
  const [timeVar, setTimeVar] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    const [finRes, entriesRes, drawsRes] = await Promise.all([
      supabase.from("project_financials").select("*").eq("project_id", projectId).maybeSingle(),
      supabase.from("cashflow_entries").select("*").eq("project_id", projectId).order("entry_date"),
      supabase.from("draws").select("*").eq("project_id", projectId).order("draw_number"),
    ]);
    setFin(finRes.data);
    setEntries(entriesRes.data ?? []);
    setDraws(drawsRes.data ?? []);
    if (finRes.data) setEditForm(finRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  // Computed values
  const totalCost = useMemo(() => {
    if (!fin) return 0;
    const base = Number(fin.land_cost || 0) + Number(fin.hard_costs || 0) + Number(fin.soft_costs || 0) + Number(fin.financing_costs || 0);
    const contingency = Number(fin.hard_costs || 0) * (Number(fin.contingency_pct || 0) / 100);
    return base + contingency;
  }, [fin]);

  const contingencyAmt = useMemo(() => fin ? Number(fin.hard_costs || 0) * (Number(fin.contingency_pct || 0) / 100) : 0, [fin]);

  const scenarios = useMemo(() => {
    if (!fin) return [];
    const equity = Number(fin.equity_invested || 0);
    return [
      { name: "CONSERVADOR", price: Number(fin.sale_price_conservative || 0), border: "border-gray-300", bg: "bg-gray-50" },
      { name: "BASE", price: Number(fin.sale_price_target || 0), border: "border-[#0D7377]", bg: "bg-[#E8F4F4]" },
      { name: "OPTIMISTA", price: Number(fin.sale_price_minimum || 0), border: "border-green-400", bg: "bg-green-50" },
    ].map(s => {
      const profit = s.price - totalCost;
      const margin = s.price > 0 ? (profit / s.price) * 100 : 0;
      const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
      const roe = equity > 0 ? (profit / equity) * 100 : 0;
      return { ...s, profit, margin, roi, roe };
    });
  }, [fin, totalCost]);

  // Sensitivity
  const sensitivityResult = useMemo(() => {
    if (!fin) return null;
    const adjCost = totalCost * (1 + costVar / 100);
    const basePrice = Number(fin.sale_price_target || 0);
    const adjPrice = basePrice * (1 + priceVar / 100);
    const profit = adjPrice - adjCost;
    const roi = adjCost > 0 ? (profit / adjCost) * 100 : 0;
    const label = profit < 0 ? "PÉRDIDA" : roi < 15 ? "REVISAR" : "VIABLE";
    const color = profit < 0 ? "text-red-600 bg-red-50 border-red-200" : roi < 15 ? "text-orange-600 bg-orange-50 border-orange-200" : "text-green-600 bg-green-50 border-green-200";
    return { adjCost, adjPrice, profit, roi, label, color };
  }, [fin, totalCost, costVar, priceVar]);

  const costDonutData = useMemo(() => {
    if (!fin) return [];
    return [
      { name: "Land", value: Number(fin.land_cost || 0) },
      { name: "Hard Costs", value: Number(fin.hard_costs || 0) },
      { name: "Soft Costs", value: Number(fin.soft_costs || 0) },
      { name: "Financing", value: Number(fin.financing_costs || 0) },
      { name: "Contingencia", value: contingencyAmt },
    ].filter(d => d.value > 0);
  }, [fin, contingencyAmt]);

  // Cashflow chart data
  const cashflowChartData = useMemo(() => {
    const weekMap = new Map<number, { week: string; inflows: number; outflows: number; balance: number }>();
    let cumBalance = 0;
    const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    sorted.forEach(e => {
      const wk = e.week_number || 0;
      const label = `S${wk}`;
      if (!weekMap.has(wk)) weekMap.set(wk, { week: label, inflows: 0, outflows: 0, balance: 0 });
      const item = weekMap.get(wk)!;
      const amt = Number(e.amount || 0);
      if (e.direction === "in") { item.inflows += amt; cumBalance += amt; }
      else { item.outflows += amt; cumBalance -= amt; }
      item.balance = cumBalance;
    });
    return Array.from(weekMap.values()).sort((a, b) => parseInt(a.week.slice(1)) - parseInt(b.week.slice(1)));
  }, [entries]);

  // Negative weeks
  const negativeWeeks = useMemo(() => {
    let cum = 0;
    const neg: { week: string; balance: number }[] = [];
    const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    sorted.forEach(e => {
      const amt = Number(e.amount || 0);
      cum += e.direction === "in" ? amt : -amt;
      if (cum < 0) neg.push({ week: `S${e.week_number || 0} (${e.entry_date})`, balance: cum });
    });
    return neg;
  }, [entries]);

  // Cashflow totals
  const cfTotals = useMemo(() => {
    const actual = entries.filter(e => !e.is_projected);
    const inflows = actual.filter(e => e.direction === "in").reduce((s, e) => s + Number(e.amount || 0), 0);
    const outflows = actual.filter(e => e.direction === "out").reduce((s, e) => s + Number(e.amount || 0), 0);
    return { inflows, outflows, balance: inflows - outflows };
  }, [entries]);

  // Save financial model
  const saveModel = async () => {
    const { id, created_at, updated_at, ...data } = editForm;
    if (fin) {
      await supabase.from("project_financials").update({ ...data, updated_at: new Date().toISOString() }).eq("id", fin.id);
    } else {
      await supabase.from("project_financials").insert([{ ...data, project_id: projectId }]);
    }
    toast.success("Modelo actualizado ✓");
    setEditOpen(false);
    fetchAll();
  };

  // Add cashflow entry
  const addEntry = async () => {
    if (!entryForm.entry_date || !entryForm.amount || !entryForm.entry_type) return;
    await supabase.from("cashflow_entries").insert([{
      project_id: projectId,
      entry_date: entryForm.entry_date,
      week_number: entryForm.week_number ? parseInt(entryForm.week_number) : null,
      entry_type: entryForm.entry_type,
      category: entryForm.category,
      description: entryForm.description,
      amount: parseFloat(entryForm.amount),
      direction: entryForm.direction,
      is_projected: entryForm.is_projected,
      draw_id: entryForm.draw_id || null,
      notes: entryForm.notes,
    }]);
    toast.success("Entrada agregada");
    setEntryOpen(false);
    setEntryForm({ entry_date: "", direction: "out", entry_type: "", category: "construction", description: "", amount: "", is_projected: false, draw_id: null, notes: "" });
    fetchAll();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("cashflow_entries").delete().eq("id", id);
    toast.success("Entrada eliminada");
    fetchAll();
  };

  // Generate projection
  const generateProjection = async () => {
    const pendingDraws = draws.filter(d => d.status === "pending" || d.status === "review");
    const projected: any[] = [];
    pendingDraws.forEach((d, i) => {
      projected.push({
        project_id: projectId,
        entry_date: d.request_date || new Date().toISOString().split("T")[0],
        week_number: entries.length + i + 1,
        entry_type: "Draw del banco",
        category: "financing",
        description: `Draw #${d.draw_number} (proyectado)`,
        amount: Number(d.amount_requested || 0),
        direction: "in",
        is_projected: true,
        draw_id: d.id,
      });
    });
    if (projected.length > 0) {
      await supabase.from("cashflow_entries").insert(projected);
      toast.success(`Proyección generada — ${projected.length} entradas`);
      fetchAll();
    } else {
      toast.info("No hay draws pendientes para proyectar");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  // Loan days remaining
  const loanDaysRemaining = fin?.loan_maturity_date ? Math.ceil((new Date(fin.loan_maturity_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const ltv = (Number(fin?.loan_amount || 0) + Number(fin?.equity_invested || 0)) > 0 ? (Number(fin?.loan_amount || 0) / (Number(fin?.loan_amount || 0) + Number(fin?.equity_invested || 0))) * 100 : 0;
  const ltvArv = Number(fin?.arv_current || 0) > 0 ? (Number(fin?.loan_amount || 0) / Number(fin?.arv_current || 0)) * 100 : 0;
  const coverage = totalCost > 0 ? Number(fin?.arv_current || 0) / totalCost : 0;
  const arvDelta = Number(fin?.arv_current || 0) - Number(fin?.arv_original || 0);

  // Running balance for table
  let runningBalance = 0;

  return (
    <Tabs defaultValue="modelo">
      <TabsList className="bg-white border border-gray-200 mb-4">
        <TabsTrigger value="modelo" className="text-[12px]">Modelo Financiero</TabsTrigger>
        <TabsTrigger value="cashflow" className="text-[12px]">Flujo de Caja</TabsTrigger>
      </TabsList>

      {/* ═══ MODELO FINANCIERO ═══ */}
      <TabsContent value="modelo">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#0F1B2D]">Modelo Financiero — Cap. 11.1</h2>
              <p className="text-[11px] text-gray-400">Estructura de costos, escenarios y análisis de sensibilidad</p>
            </div>
            <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={() => { if (!fin) setEditForm({ project_id: projectId }); setEditOpen(true); }}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar modelo
            </Button>
          </div>

          {!fin ? (
            <Card><CardContent className="py-12 text-center text-gray-400 text-[13px]">No hay modelo financiero. Haz clic en "Editar modelo" para crear uno.</CardContent></Card>
          ) : (
            <>
              {/* SECTION A — Cost Structure */}
              <Card className="border border-gray-200">
                <CardContent className="p-5">
                  <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-4">ESTRUCTURA DE COSTOS</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2 text-[12px]">
                      {[
                        { l: "Land cost", v: fin.land_cost },
                        { l: "Hard costs", v: fin.hard_costs },
                        { l: "Soft costs", v: fin.soft_costs },
                        { l: "Financing costs", v: fin.financing_costs },
                      ].map((r, i) => (
                        <div key={i} className="flex justify-between py-1.5 border-b border-gray-100">
                          <span className="text-gray-500">{r.l}</span>
                          <span className="font-mono font-medium">{fmtUSD(r.v)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-500">Contingencia ({fin.contingency_pct}%)</span>
                        <span className="font-mono font-medium">{fmtUSD(contingencyAmt)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-t-2 border-[#0F1B2D]">
                        <span className="font-bold text-[#0F1B2D]">COSTO TOTAL</span>
                        <span className="font-mono font-bold text-[#0F1B2D]">{fmtUSD(totalCost)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={costDonutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                            {costDonutData.map((_, i) => <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmtUSD(v)} />
                          <Legend formatter={(value) => <span className="text-[11px]">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION B — Scenarios */}
              <div>
                <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-3">PROYECCIONES DE VENTA</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {scenarios.map((s, i) => (
                    <Card key={i} className={`border-t-4 ${s.border} ${s.bg}`}>
                      <CardContent className="p-4 space-y-3">
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{s.name}</p>
                        <p className="text-[20px] font-bold text-[#0F1B2D]">{fmtUSD(s.price)}</p>
                        <div className="space-y-1 text-[12px]">
                          <div className="flex justify-between"><span className="text-gray-500">Profit</span><span className={`font-mono font-medium ${s.profit < 0 ? "text-red-600" : "text-green-600"}`}>{fmtUSD(s.profit)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Margin</span><span className="font-mono">{fmtPct(s.margin)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">ROI</span><span className="font-mono">{fmtPct(s.roi)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">ROE</span><span className="font-mono">{fmtPct(s.roe)}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* SECTION C — Loan Structure */}
              <Card className="border border-gray-200">
                <CardContent className="p-5">
                  <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-4">ESTRUCTURA DEL LOAN</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-[12px]">
                    <div className="space-y-2">
                      {[
                        { l: "Monto del loan", v: fmtUSD(fin.loan_amount) },
                        { l: "Equity invertido", v: fmtUSD(fin.equity_invested) },
                        { l: "LTV", v: fmtPct(ltv) },
                        { l: "Tasa de interés", v: `${fin.interest_rate}%` },
                        { l: "Plazo", v: `${fin.loan_term_months} meses` },
                        { l: "Vencimiento", v: fin.loan_maturity_date || "—" },
                      ].map((r, i) => (
                        <div key={i} className="flex justify-between py-1.5 border-b border-gray-100">
                          <span className="text-gray-500">{r.l}</span>
                          <span className="font-mono font-medium">{r.v}</span>
                        </div>
                      ))}
                      {loanDaysRemaining !== null && (
                        <div className="flex justify-between py-1.5">
                          <span className="text-gray-500">Días restantes</span>
                          <span className={`font-mono font-bold ${loanDaysRemaining < 60 ? "text-red-600" : ""}`}>{loanDaysRemaining} días</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {[
                        { l: "ARV original", v: fmtUSD(fin.arv_original) },
                        { l: "ARV actual", v: fmtUSD(fin.arv_current) },
                      ].map((r, i) => (
                        <div key={i} className="flex justify-between py-1.5 border-b border-gray-100">
                          <span className="text-gray-500">{r.l}</span>
                          <span className="font-mono font-medium">{r.v}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-500">Δ ARV</span>
                        <span className={`font-mono font-medium flex items-center gap-1 ${arvDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {arvDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {fmtUSD(arvDelta)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-500">Actualizado</span>
                        <span className="font-mono">{fin.arv_updated_at || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-500">LTV sobre ARV</span>
                        <span className="font-mono font-medium">{fmtPct(ltvArv)}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500">Cobertura</span>
                        <span className="font-mono font-medium">{coverage.toFixed(2)}x</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION D — Sensitivity */}
              <Card className="border border-gray-200">
                <CardContent className="p-5">
                  <h3 className="text-[13px] font-bold text-[#0F1B2D] mb-4">¿Qué pasa si...?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <div>
                      <Label className="text-[11px] text-gray-500">Costo de construcción ± {costVar}%</Label>
                      <Slider value={[costVar]} onValueChange={(v) => setCostVar(v[0])} min={-30} max={30} step={1} className="mt-2" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-500">Precio de venta ± {priceVar}%</Label>
                      <Slider value={[priceVar]} onValueChange={(v) => setPriceVar(v[0])} min={-30} max={30} step={1} className="mt-2" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-500">Tiempo de venta ± {timeVar} meses</Label>
                      <Slider value={[timeVar]} onValueChange={(v) => setTimeVar(v[0])} min={-6} max={12} step={1} className="mt-2" />
                    </div>
                  </div>
                  {sensitivityResult && (
                    <div className={`rounded-lg border p-4 ${sensitivityResult.color}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-4 text-[12px]">
                          <span>Costo total: <strong className="font-mono">{fmtUSD(sensitivityResult.adjCost)}</strong></span>
                          <span>Profit: <strong className="font-mono">{fmtUSD(sensitivityResult.profit)}</strong></span>
                          <span>ROI: <strong className="font-mono">{fmtPct(sensitivityResult.roi)}</strong></span>
                        </div>
                        <Badge className={`border-0 ${sensitivityResult.color} font-bold`}>
                          {sensitivityResult.label === "PÉRDIDA" ? "🔴" : sensitivityResult.label === "REVISAR" ? "⚠️" : "✓"} {sensitivityResult.label}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Edit Model Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Editar Modelo Financiero</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-[12px]">
                {[
                  { key: "land_cost", label: "Land cost ($)" },
                  { key: "hard_costs", label: "Hard costs ($)" },
                  { key: "soft_costs", label: "Soft costs ($)" },
                  { key: "financing_costs", label: "Financing costs ($)" },
                  { key: "contingency_pct", label: "Contingencia (%)" },
                  { key: "sale_price_target", label: "Precio venta (Base) $" },
                  { key: "sale_price_minimum", label: "Precio venta (Optimista) $" },
                  { key: "sale_price_conservative", label: "Precio venta (Conservador) $" },
                  { key: "loan_amount", label: "Monto del loan ($)" },
                  { key: "equity_invested", label: "Equity invertido ($)" },
                  { key: "interest_rate", label: "Tasa de interés (%)" },
                  { key: "loan_term_months", label: "Plazo (meses)" },
                  { key: "arv_original", label: "ARV original ($)" },
                  { key: "arv_current", label: "ARV actual ($)" },
                  { key: "estimated_days_to_sell", label: "Días est. para venta" },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[11px] text-gray-400">{f.label}</Label>
                    <Input type="number" value={editForm[f.key] ?? ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} />
                  </div>
                ))}
                {[
                  { key: "loan_start_date", label: "Inicio del loan" },
                  { key: "loan_maturity_date", label: "Vencimiento del loan" },
                  { key: "arv_updated_at", label: "ARV actualizado" },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[11px] text-gray-400">{f.label}</Label>
                    <Input type="date" value={editForm[f.key] ?? ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Exit strategy</Label>
                  <Select value={editForm.exit_strategy || "sale"} onValueChange={v => setEditForm({ ...editForm, exit_strategy: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Venta</SelectItem>
                      <SelectItem value="rent">Renta</SelectItem>
                      <SelectItem value="refinance">Refinanciamiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className={`w-full mt-4 ${BTN_PRIMARY}`} onClick={saveModel}>Guardar modelo</Button>
            </DialogContent>
          </Dialog>
        </div>
      </TabsContent>

      {/* ═══ FLUJO DE CAJA ═══ */}
      <TabsContent value="cashflow">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#0F1B2D]">Flujo de Caja — Cap. 11.3</h2>
              <p className="text-[11px] text-gray-400">Control semanal de entradas y salidas por proyecto</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className={`h-8 ${BTN_SUCCESS}`} onClick={() => setEntryOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar entrada
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={generateProjection}>
                Generar proyección
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-[11px] text-gray-400">Total entradas</p><p className="text-[20px] font-bold text-green-600 font-mono">{fmtUSD(cfTotals.inflows)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-[11px] text-gray-400">Total salidas</p><p className="text-[20px] font-bold text-red-500 font-mono">{fmtUSD(cfTotals.outflows)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-[11px] text-gray-400">Saldo actual</p><p className={`text-[20px] font-bold font-mono ${cfTotals.balance < 0 ? "text-red-600" : "text-[#0F1B2D]"}`}>{fmtUSD(cfTotals.balance)}</p></CardContent></Card>
          </div>

          {/* Chart */}
          {cashflowChartData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={cashflowChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtUSD(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="inflows" name="Entradas" fill="#0D7377" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="outflows" name="Salidas" fill="#E07B39" radius={[2, 2, 0, 0]} />
                    <Line type="monotone" dataKey="balance" name="Saldo" stroke="#0F1B2D" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Negative cash alert */}
          {negativeWeeks.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700 font-bold text-[13px] mb-2">
                <AlertTriangle className="h-4 w-4" /> Semanas con caja negativa detectadas
              </div>
              {negativeWeeks.slice(0, 3).map((w, i) => (
                <p key={i} className="text-[12px] text-red-600">{w.week}: <span className="font-mono">{fmtUSD(w.balance)}</span></p>
              ))}
              <p className="text-[11px] text-red-500 mt-1">Revisar calendario de draws con el banco.</p>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-[12px] border-collapse">
              <thead><tr>
                <th className={TH_CLASS}>Fecha</th>
                <th className={TH_CLASS}>Sem</th>
                <th className={TH_CLASS}>Tipo</th>
                <th className={TH_CLASS}>Categoría</th>
                <th className={TH_CLASS}>Descripción</th>
                <th className={`${TH_CLASS} text-right`}>Entrada</th>
                <th className={`${TH_CLASS} text-right`}>Salida</th>
                <th className={`${TH_CLASS} text-right`}>Saldo</th>
                <th className={TH_CLASS}>Proy.</th>
                <th className={`${TH_CLASS} w-12`}></th>
              </tr></thead>
              <tbody>
                {entries.map((e, idx) => {
                  const amt = Number(e.amount || 0);
                  runningBalance += e.direction === "in" ? amt : -amt;
                  return (
                    <tr key={e.id} className={`${e.is_projected ? "bg-blue-50 italic" : TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100`}>
                      <td className={TD_CLASS}>{e.entry_date}</td>
                      <td className={TD_CLASS}>S{e.week_number || "—"}</td>
                      <td className={TD_CLASS}>{e.entry_type}</td>
                      <td className={TD_CLASS}>{e.category}</td>
                      <td className={`${TD_CLASS} max-w-[200px] truncate`}>{e.description || "—"}</td>
                      <td className={`${TD_CLASS} text-right font-mono text-green-600`}>{e.direction === "in" ? fmtUSD(amt) : ""}</td>
                      <td className={`${TD_CLASS} text-right font-mono text-red-500`}>{e.direction === "out" ? fmtUSD(amt) : ""}</td>
                      <td className={`${TD_CLASS} text-right font-mono ${runningBalance < 0 ? "text-red-600 font-bold" : ""}`}>{fmtUSD(runningBalance)}</td>
                      <td className={TD_CLASS}>{e.is_projected && <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Proy</Badge>}</td>
                      <td className={TD_CLASS}>
                        <button onClick={() => deleteEntry(e.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3 w-3 text-red-400" /></button>
                      </td>
                    </tr>
                  );
                })}
                {entries.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-gray-400 text-[12px]">Sin entradas de cashflow</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Add Entry Dialog */}
          <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Agregar Entrada de Cashflow</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Fecha</Label>
                  <Input type="date" value={entryForm.entry_date} onChange={e => setEntryForm({ ...entryForm, entry_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Semana #</Label>
                  <Input type="number" value={entryForm.week_number || ""} onChange={e => setEntryForm({ ...entryForm, week_number: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Dirección</Label>
                  <Select value={entryForm.direction} onValueChange={v => setEntryForm({ ...entryForm, direction: v, entry_type: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrada</SelectItem>
                      <SelectItem value="out">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Tipo</Label>
                  <Select value={entryForm.entry_type} onValueChange={v => setEntryForm({ ...entryForm, entry_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(entryForm.direction === "in" ? INFLOW_TYPES : OUTFLOW_TYPES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Categoría</Label>
                  <Select value={entryForm.category} onValueChange={v => setEntryForm({ ...entryForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Descripción</Label>
                  <Input value={entryForm.description} onChange={e => setEntryForm({ ...entryForm, description: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Monto ($)</Label>
                  <Input type="number" value={entryForm.amount} onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={entryForm.is_projected} onCheckedChange={v => setEntryForm({ ...entryForm, is_projected: v })} />
                  <Label className="text-[11px] text-gray-400">¿Es proyección?</Label>
                </div>
                {draws.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Draw relacionado</Label>
                    <Select value={entryForm.draw_id || "none"} onValueChange={v => setEntryForm({ ...entryForm, draw_id: v === "none" ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguno</SelectItem>
                        {draws.map(d => <SelectItem key={d.id} value={d.id}>Draw #{d.draw_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Notas</Label>
                  <Textarea value={entryForm.notes} onChange={e => setEntryForm({ ...entryForm, notes: e.target.value })} />
                </div>
                <Button className={`w-full ${BTN_PRIMARY}`} onClick={addEntry} disabled={!entryForm.entry_date || !entryForm.amount || !entryForm.entry_type}>
                  Agregar entrada
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default FinancieroAdmin;
