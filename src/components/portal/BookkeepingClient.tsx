import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE, fmt } from "@/lib/design-system";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

interface BookkeepingEntry {
  id: string;
  entry_date: string;
  entry_type: string;
  category: string;
  description: string;
  vendor_payee: string | null;
  amount: number;
  payment_method: string | null;
  reference_number: string | null;
  file_url: string | null;
  linked_draw_id: string | null;
  linked_invoice_id: string | null;
  linked_wire_id: string | null;
}

const EXPENSE_CATEGORIES = [
  { value: "construction", label: "🏗 Construcción", color: "#0D7377" },
  { value: "soft_costs", label: "📋 Costos Soft", color: "#6366F1" },
  { value: "permits", label: "📜 Permisos", color: "#F59E0B" },
  { value: "closing_costs", label: "🏛 Costos de cierre", color: "#8B5CF6" },
  { value: "financing", label: "🏦 Financiamiento", color: "#E07B39" },
  { value: "insurance", label: "🛡 Seguros", color: "#EC4899" },
  { value: "marketing", label: "📣 Marketing", color: "#14B8A6" },
  { value: "operating", label: "⚙️ Operativos", color: "#64748B" },
  { value: "other_expense", label: "📦 Otros gastos", color: "#9CA3AF" },
];
const INCOME_CATEGORIES = [
  { value: "draw_bank", label: "🏦 Draw del banco", color: "#16A34A" },
  { value: "equity", label: "💰 Equity", color: "#0D7377" },
  { value: "other_income", label: "💵 Otros ingresos", color: "#6366F1" },
];
const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
const getCatInfo = (val: string) => ALL_CATEGORIES.find(c => c.value === val) || { label: val, color: "#9CA3AF" };

const BookkeepingClient = ({ projectId }: { projectId: string }) => {
  const [entries, setEntries] = useState<BookkeepingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "monthly">("list");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("bookkeeping_entries").select("*").eq("project_id", projectId).order("entry_date", { ascending: false });
      setEntries((data ?? []) as BookkeepingEntry[]);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const filtered = useMemo(() => {
    if (filterType === "income") return entries.filter(e => e.entry_type === "income");
    if (filterType === "expense") return entries.filter(e => e.entry_type === "expense");
    return entries;
  }, [entries, filterType]);

  const totalIncome = useMemo(() => filtered.filter(e => e.entry_type === "income").reduce((s, e) => s + e.amount, 0), [filtered]);
  const totalExpense = useMemo(() => filtered.filter(e => e.entry_type === "expense").reduce((s, e) => s + e.amount, 0), [filtered]);
  const netBalance = totalIncome - totalExpense;

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter(e => e.entry_type === "expense").forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([cat, amount]) => ({ name: getCatInfo(cat).label, value: amount, color: getCatInfo(cat).color })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const topCategories = expenseByCategory.slice(0, 3);

  const monthlyGroups = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    const groups: Record<string, BookkeepingEntry[]> = {};
    sorted.forEach(e => { const key = e.entry_date.slice(0, 7); if (!groups[key]) groups[key] = []; groups[key].push(e); });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const monthlyChartData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    entries.forEach(e => { const key = e.entry_date.slice(0, 7); if (!map[key]) map[key] = { income: 0, expense: 0 }; if (e.entry_type === "income") map[key].income += e.amount; else map[key].expense += e.amount; });
    let cum = 0;
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => {
      cum += data.income - data.expense;
      return { month: new Date(month + "-01").toLocaleDateString("es", { month: "short", year: "2-digit" }), balance: cum };
    });
  }, [entries]);

  const sortedForBalance = [...filtered].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const runningBalances: Record<string, number> = {};
  let cumBal = 0;
  sortedForBalance.forEach(e => { cumBal += e.entry_type === "income" ? e.amount : -e.amount; runningBalances[e.id] = cumBal; });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#0D7377]" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-[#0F1B2D]">Historial Financiero del Proyecto</h2>
        <p className="text-[11px] text-gray-400">Actualizado por Relatin</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[10px] uppercase text-gray-400 mb-1">💰 Ingresos</p>
          <p className="text-[18px] font-bold text-green-600">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[10px] uppercase text-gray-400 mb-1">💸 Gastos</p>
          <p className="text-[18px] font-bold text-red-600">{fmt(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[10px] uppercase text-gray-400 mb-1">📊 Balance</p>
          <p className={`text-[18px] font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(netBalance)}</p>
        </div>
      </div>

      {topCategories.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {topCategories.map(cat => (
            <div key={cat.name} className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] text-gray-400 mb-1">{cat.name}</p>
              <p className="text-[14px] font-bold" style={{ color: cat.color }}>{fmt(cat.value)}</p>
            </div>
          ))}
        </div>
      )}

      {expenseByCategory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[12px] font-semibold text-[#0F1B2D] mb-3">Desglose de gastos</p>
          <div className="flex items-center gap-6">
            <div className="w-48 h-48">
              <ResponsiveContainer>
                <PieChart><Pie data={expenseByCategory} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {expenseByCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie><Tooltip formatter={(v: number) => fmt(v)} /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {expenseByCategory.map(cat => (
                <div key={cat.name} className="flex items-center gap-2 text-[11px]">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1">{cat.name}</span>
                  <span className="font-mono font-medium">{fmt(cat.value)}</span>
                  <span className="text-gray-400 w-10 text-right">{totalExpense > 0 ? Math.round(cat.value / totalExpense * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[{ v: "all", l: "📋 Todas" }, { v: "income", l: "💰 Ingresos" }, { v: "expense", l: "💸 Gastos" }].map(t => (
            <button key={t.v} onClick={() => setFilterType(t.v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterType === t.v ? "bg-[#0F1B2D] text-white" : "bg-gray-100 text-gray-600"}`}>{t.l}</button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${viewMode === "list" ? "bg-[#0F1B2D] text-white" : "bg-gray-100 text-gray-600"}`}>📋 Línea por línea</button>
          <button onClick={() => setViewMode("monthly")} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${viewMode === "monthly" ? "bg-[#0F1B2D] text-white" : "bg-gray-100 text-gray-600"}`}>📅 Por mes</button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className={TH_CLASS}>Fecha</th>
                  <th className={TH_CLASS}>Tipo</th>
                  <th className={TH_CLASS}>Categoría</th>
                  <th className={TH_CLASS}>Descripción</th>
                  <th className={TH_CLASS}>Vendor</th>
                  <th className={`${TH_CLASS} text-right`}>Monto</th>
                  <th className={TH_CLASS}>Comprobante</th>
                  <th className={`${TH_CLASS} text-right`}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, idx) => {
                  const cat = getCatInfo(e.category);
                  return (
                    <tr key={e.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 ${e.entry_type === "income" ? "bg-green-50/50" : ""}`}>
                      <td className={TD_CLASS}>{e.entry_date}</td>
                      <td className={TD_CLASS}>
                        <Badge className={e.entry_type === "income" ? "bg-green-100 text-green-700 border-0 text-[10px]" : "bg-red-100 text-red-700 border-0 text-[10px]"}>
                          {e.entry_type === "income" ? "↑ Ingreso" : "↓ Gasto"}
                        </Badge>
                      </td>
                      <td className={TD_CLASS}><span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: cat.color }}>{cat.label}</span></td>
                      <td className={`${TD_CLASS} max-w-[180px] truncate`}>{e.description}</td>
                      <td className={`${TD_CLASS} text-gray-500`}>{e.vendor_payee || "—"}</td>
                      <td className={`${TD_CLASS} text-right font-mono font-medium ${e.entry_type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {e.entry_type === "income" ? "+" : "-"}{fmt(e.amount)}
                      </td>
                      <td className={TD_CLASS}>
                        {e.file_url ? <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="text-[#0D7377]"><FileText className="h-4 w-4" /></a> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`${TD_CLASS} text-right font-mono font-medium ${(runningBalances[e.id] ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmt(runningBalances[e.id] ?? 0)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Sin entradas</td></tr>}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-[#0F1B2D] text-white font-medium">
                    <td className="px-3 py-2" colSpan={5}>TOTAL</td>
                    <td className="px-3 py-2 text-right font-mono"><span className="text-green-400">+{fmt(totalIncome)}</span>{" / "}<span className="text-red-400">-{fmt(totalExpense)}</span></td>
                    <td></td>
                    <td className={`px-3 py-2 text-right font-mono ${netBalance >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(netBalance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {monthlyChartData.length > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-[12px] font-semibold text-[#0F1B2D] mb-3">Balance acumulado</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} /><Area type="monotone" dataKey="balance" stroke="#0D7377" fill="#E8F4F4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <Accordion type="multiple" defaultValue={monthlyGroups.slice(0, 2).map(([m]) => m)}>
            {monthlyGroups.map(([month, items]) => {
              const inc = items.filter(e => e.entry_type === "income").reduce((s, e) => s + e.amount, 0);
              const exp = items.filter(e => e.entry_type === "expense").reduce((s, e) => s + e.amount, 0);
              const label = new Date(month + "-01").toLocaleDateString("es", { month: "long", year: "numeric" });
              return (
                <AccordionItem key={month} value={month}>
                  <AccordionTrigger className="text-[12px] font-semibold text-[#0F1B2D] hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="capitalize">{label}</span>
                      <span className="text-green-600 font-mono">↑{fmt(inc)}</span>
                      <span className="text-red-600 font-mono">↓{fmt(exp)}</span>
                      <span className={`font-mono ${inc - exp >= 0 ? "text-green-600" : "text-red-600"}`}>Balance: {fmt(inc - exp)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {items.map(e => {
                        const cat = getCatInfo(e.category);
                        return (
                          <div key={e.id} className={`flex items-center gap-3 px-3 py-2 rounded text-[11px] ${e.entry_type === "income" ? "bg-green-50" : "bg-gray-50"}`}>
                            <span className="w-20 text-gray-500">{e.entry_date}</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] text-white" style={{ backgroundColor: cat.color }}>{cat.label}</span>
                            <span className="flex-1 truncate">{e.description}</span>
                            <span className={`font-mono font-medium ${e.entry_type === "income" ? "text-green-600" : "text-red-600"}`}>
                              {e.entry_type === "income" ? "+" : "-"}{fmt(e.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {entries.length === 0 && (
        <div className="bg-green-50 rounded-lg p-8 text-center">
          <p className="text-green-600 text-[14px] font-medium">✓ Sin movimientos registrados</p>
          <p className="text-green-500 text-[12px] mt-1">El historial financiero aparecerá aquí cuando haya entradas.</p>
        </div>
      )}
    </div>
  );
};

export default BookkeepingClient;
