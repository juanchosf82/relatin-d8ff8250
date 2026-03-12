import { useMemo, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/design-system";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { Printer } from "lucide-react";

interface Entry {
  id: string;
  entry_date: string;
  entry_type: string;
  category: string;
  subcategory: string | null;
  description: string;
  vendor_payee: string | null;
  amount: number;
}

const EXPENSE_CATEGORIES = [
  { value: "construction", label: "Construcción", color: "#0D7377" },
  { value: "soft_costs", label: "Costos Soft", color: "#6366F1" },
  { value: "permits", label: "Permisos", color: "#F59E0B" },
  { value: "closing_costs", label: "Costos de cierre", color: "#8B5CF6" },
  { value: "financing", label: "Financiamiento", color: "#E07B39" },
  { value: "insurance", label: "Seguros", color: "#EC4899" },
  { value: "marketing", label: "Marketing", color: "#14B8A6" },
  { value: "operating", label: "Operativos", color: "#64748B" },
  { value: "other_expense", label: "Otros gastos", color: "#9CA3AF" },
];

const getCatColor = (val: string) => EXPENSE_CATEGORIES.find(c => c.value === val)?.color || "#9CA3AF";
const getCatLabel = (val: string) => EXPENSE_CATEGORIES.find(c => c.value === val)?.label || val;

interface Props {
  open: boolean;
  onClose: () => void;
  entries: Entry[];
  projectName: string;
  projectAddress: string;
  dateFrom: string;
  dateTo: string;
}

const BookkeepingGraphicReport = ({ open, onClose, entries, projectName, projectAddress, dateFrom, dateTo }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() =>
    entries.filter(e => e.entry_date >= dateFrom && e.entry_date <= dateTo),
    [entries, dateFrom, dateTo]
  );

  const totalIncome = useMemo(() => filtered.filter(e => e.entry_type === "income").reduce((s, e) => s + e.amount, 0), [filtered]);
  const totalExpense = useMemo(() => filtered.filter(e => e.entry_type === "expense").reduce((s, e) => s + e.amount, 0), [filtered]);
  const netBalance = totalIncome - totalExpense;
  const incomeCount = filtered.filter(e => e.entry_type === "income").length;
  const expenseCount = filtered.filter(e => e.entry_type === "expense").length;

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter(e => e.entry_type === "expense").forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([cat, amount]) => ({
      name: getCatLabel(cat),
      value: amount,
      color: getCatColor(cat),
    })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    filtered.forEach(e => {
      const key = e.entry_date.slice(0, 7);
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      if (e.entry_type === "income") map[key].income += e.amount;
      else map[key].expense += e.amount;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({
      month: new Date(month + "-01").toLocaleDateString("es", { month: "short", year: "2-digit" }),
      Ingresos: data.income,
      Gastos: data.expense,
    }));
  }, [filtered]);

  const cumulativeData = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    const map: Record<string, number> = {};
    let cum = 0;
    sorted.forEach(e => {
      cum += e.entry_type === "income" ? e.amount : -e.amount;
      map[e.entry_date] = cum;
    });
    return Object.entries(map).map(([date, balance]) => ({
      date: new Date(date).toLocaleDateString("es", { day: "numeric", month: "short" }),
      balance,
    }));
  }, [filtered]);

  const topExpenses = useMemo(() =>
    [...filtered].filter(e => e.entry_type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 5),
    [filtered]
  );

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        <div ref={printRef} className="p-6 space-y-6 print:p-4" id="graphic-report-print">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#0D7377] font-semibold">360lateral</p>
              <h1 className="text-[20px] font-bold text-[#0F1B2D]">Reporte Financiero</h1>
              <p className="text-[12px] text-gray-500">{projectName} — {projectAddress}</p>
              <p className="text-[11px] text-gray-400">Período: {dateFrom} — {dateTo} | Generado: {new Date().toLocaleDateString("es")}</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button size="sm" variant="outline" onClick={handlePrint} className="text-[11px]">
                <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-[10px] uppercase text-gray-400 mb-1">💰 Ingresos</p>
              <p className="text-[22px] font-bold text-green-600">{fmt(totalIncome)}</p>
              <p className="text-[10px] text-gray-400">{incomeCount} entradas</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-[10px] uppercase text-gray-400 mb-1">💸 Gastos</p>
              <p className="text-[22px] font-bold text-red-600">{fmt(totalExpense)}</p>
              <p className="text-[10px] text-gray-400">{expenseCount} entradas</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-[10px] uppercase text-gray-400 mb-1">📊 Balance Neto</p>
              <p className={`text-[22px] font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(netBalance)}</p>
              <p className="text-[10px] text-gray-400">{netBalance >= 0 ? "▲ Positivo" : "▼ Negativo"}</p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Donut */}
            {expenseByCategory.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
                <p className="text-[12px] font-semibold text-[#0F1B2D] mb-3">Gastos por Categoría</p>
                <div className="flex items-center gap-4">
                  <div className="w-44 h-44">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={expenseByCategory} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2}>
                          {expenseByCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {expenseByCategory.map(cat => (
                      <div key={cat.name} className="flex items-center gap-2 text-[10px]">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="flex-1 truncate">{cat.name}</span>
                        <span className="font-mono font-medium">{fmt(cat.value)}</span>
                        <span className="text-gray-400 w-8 text-right">{totalExpense > 0 ? Math.round(cat.value / totalExpense * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bar chart */}
            {monthlyData.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
                <p className="text-[12px] font-semibold text-[#0F1B2D] mb-3">Ingresos vs Gastos por Mes</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="Ingresos" fill="#16A34A" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Gastos" fill="#DC2626" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Cumulative balance area chart */}
          {cumulativeData.length > 1 && (
            <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-[12px] font-semibold text-[#0F1B2D] mb-3">Balance Acumulado del Proyecto</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#0D7377"
                    fill="#E8F4F4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top 5 expenses */}
          {topExpenses.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-[12px] font-semibold text-[#0F1B2D] mb-3">Top 5 Gastos</p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="text-left py-1.5 font-medium">#</th>
                    <th className="text-left py-1.5 font-medium">Categoría</th>
                    <th className="text-left py-1.5 font-medium">Descripción</th>
                    <th className="text-left py-1.5 font-medium">Vendor</th>
                    <th className="text-left py-1.5 font-medium">Fecha</th>
                    <th className="text-right py-1.5 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {topExpenses.map((e, i) => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-400">{i + 1}</td>
                      <td className="py-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] text-white" style={{ backgroundColor: getCatColor(e.category) }}>
                          {getCatLabel(e.category)}
                        </span>
                      </td>
                      <td className="py-1.5 max-w-[200px] truncate">{e.description}</td>
                      <td className="py-1.5 text-gray-500">{e.vendor_payee || "—"}</td>
                      <td className="py-1.5 text-gray-500">{e.entry_date}</td>
                      <td className="py-1.5 text-right font-mono font-medium text-red-600">{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expense breakdown bars */}
          {expenseByCategory.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-[12px] font-semibold text-[#0F1B2D] mb-3">Desglose de Gastos</p>
              <div className="space-y-2">
                {expenseByCategory.map(cat => {
                  const pct = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-3 text-[11px]">
                      <span className="w-28 truncate text-gray-600">{cat.name}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                      </div>
                      <span className="w-20 text-right font-mono font-medium">{fmt(cat.value)}</span>
                      <span className="w-10 text-right text-gray-400">{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-3 text-center">
            <p className="text-[10px] text-gray-400">Generado por 360lateral — relatin.co</p>
            <p className="text-[9px] text-gray-300">{new Date().toLocaleString("es")}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookkeepingGraphicReport;
