import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TH_CLASS, TD_CLASS, TR_STRIPE, TR_HOVER, fmt } from "@/lib/design-system";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  projectId: string;
  bankSovLines: any[];
  draws: any[];
  readOnly?: boolean;
}

const COLORS = [
  "#0D7377", "#E07B39", "#0F1B2D", "#6366F1", "#059669", "#DC2626",
  "#8B5CF6", "#D97706", "#2563EB", "#EC4899", "#14B8A6", "#F59E0B",
  "#7C3AED", "#10B981", "#EF4444",
];

const DrawComparison = ({ projectId, bankSovLines, draws, readOnly = false }: Props) => {
  const [allLineItems, setAllLineItems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"cumulative" | "period">("cumulative");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("draw_line_items")
        .select("*")
        .eq("project_id", projectId)
        .order("line_number");
      setAllLineItems(data ?? []);
      setLoading(false);
    };
    load();
  }, [projectId, draws]);

  const sortedDraws = useMemo(() => [...draws].sort((a, b) => a.draw_number - b.draw_number), [draws]);

  // Build comparison matrix: rows = bank SOV lines, columns = draws
  const matrix = useMemo(() => {
    return bankSovLines.map((bsov) => {
      const row: any = {
        id: bsov.id,
        line_number: bsov.line_number,
        description: bsov.description,
        scheduled_value: Number(bsov.scheduled_value) || 0,
      };

      let lastCumulative = 0;
      sortedDraws.forEach((d) => {
        const lineItem = allLineItems.find(
          (li) => li.draw_id === d.id && (li.bank_sov_line_id === bsov.id || li.line_number === bsov.line_number)
        );
        const thisPeriod = lineItem ? Number(lineItem.amount_this_draw) || 0 : 0;
        const cumulative = lineItem ? Number(lineItem.amount_cumulative) || 0 : lastCumulative;
        const pct = lineItem ? Number(lineItem.pct_complete) || 0 : 0;

        row[`draw_${d.draw_number}_period`] = thisPeriod;
        row[`draw_${d.draw_number}_cumulative`] = cumulative;
        row[`draw_${d.draw_number}_pct`] = pct;
        lastCumulative = cumulative;
      });

      // Balance = scheduled - last cumulative
      row.balance = row.scheduled_value - lastCumulative;
      row.last_cumulative = lastCumulative;
      row.last_pct = row.scheduled_value > 0 ? Math.round((lastCumulative / row.scheduled_value) * 100) : 0;
      return row;
    });
  }, [bankSovLines, sortedDraws, allLineItems]);

  // Totals row
  const totals = useMemo(() => {
    const t: any = { description: "TOTAL", scheduled_value: 0, balance: 0, last_cumulative: 0 };
    sortedDraws.forEach((d) => {
      t[`draw_${d.draw_number}_period`] = 0;
      t[`draw_${d.draw_number}_cumulative`] = 0;
    });
    matrix.forEach((row) => {
      t.scheduled_value += row.scheduled_value;
      t.balance += row.balance;
      t.last_cumulative += row.last_cumulative;
      sortedDraws.forEach((d) => {
        t[`draw_${d.draw_number}_period`] += row[`draw_${d.draw_number}_period`] || 0;
        t[`draw_${d.draw_number}_cumulative`] += row[`draw_${d.draw_number}_cumulative`] || 0;
      });
    });
    t.last_pct = t.scheduled_value > 0 ? Math.round((t.last_cumulative / t.scheduled_value) * 100) : 0;
    return t;
  }, [matrix, sortedDraws]);

  // Chart data
  const chartData = useMemo(() => {
    return sortedDraws.map((d) => {
      const item: any = { name: `#${d.draw_number}`, date: d.request_date || "" };
      let othersSum = 0;
      const topLines = [...bankSovLines].sort((a, b) => {
        const aVal = matrix.find((m) => m.id === a.id)?.[`draw_${d.draw_number}_period`] || 0;
        const bVal = matrix.find((m) => m.id === b.id)?.[`draw_${d.draw_number}_period`] || 0;
        return bVal - aVal;
      });

      topLines.forEach((bsov, i) => {
        const row = matrix.find((m) => m.id === bsov.id);
        const val = row?.[`draw_${d.draw_number}_period`] || 0;
        if (i < 15) {
          item[bsov.description.substring(0, 20)] = val;
        } else {
          othersSum += val;
        }
      });
      if (othersSum > 0) item["Otros"] = othersSum;
      return item;
    });
  }, [sortedDraws, bankSovLines, matrix]);

  const chartKeys = useMemo(() => {
    const keys = new Set<string>();
    chartData.forEach((d) => Object.keys(d).forEach((k) => { if (k !== "name" && k !== "date") keys.add(k); }));
    return Array.from(keys);
  }, [chartData]);

  if (bankSovLines.length === 0) {
    return (
      <div className="text-center text-gray-400 text-[12px] py-12">
        Configura el SOV base del banco para ver el comparativo.
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[#0F1B2D]">
          Comparativo de Draws — SOV del Banco ({bankSovLines.length} líneas)
        </h3>
        {!readOnly && (
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setViewMode("cumulative")}
              className={`px-3 py-1 text-[11px] rounded ${viewMode === "cumulative" ? "bg-white shadow-sm font-medium" : "text-gray-500"}`}
            >
              Acumulado
            </button>
            <button
              onClick={() => setViewMode("period")}
              className={`px-3 py-1 text-[11px] rounded ${viewMode === "period" ? "bg-white shadow-sm font-medium" : "text-gray-500"}`}
            >
              Por período
            </button>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto max-h-[500px]">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className={`${TH_CLASS} sticky left-0 z-30 min-w-[200px]`}>Descripción</th>
              <th className={`${TH_CLASS} text-right min-w-[90px]`}>Presupuesto</th>
              {sortedDraws.map((d) => (
                <th key={d.id} className={`${TH_CLASS} text-right min-w-[90px]`}>
                  Draw #{d.draw_number}
                </th>
              ))}
              <th className={`${TH_CLASS} text-right min-w-[90px] sticky right-0 z-30 bg-[#0F1B2D]`}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, idx) => (
              <tr key={row.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100`}>
                <td className={`${TD_CLASS} font-medium sticky left-0 bg-inherit z-10 min-w-[200px]`}>
                  <span className="text-gray-400 mr-1">{row.line_number}.</span>
                  {row.description}
                </td>
                <td className={`${TD_CLASS} text-right font-mono`}>{fmt(row.scheduled_value)}</td>
                {sortedDraws.map((d) => {
                  const val = viewMode === "cumulative"
                    ? row[`draw_${d.draw_number}_cumulative`]
                    : row[`draw_${d.draw_number}_period`];
                  const pct = row[`draw_${d.draw_number}_pct`];
                  return (
                    <td key={d.id} className={`${TD_CLASS} text-right`}>
                      {val > 0 ? (
                        <div>
                          <span className="font-mono">{fmt(val)}</span>
                          {pct > 0 && <span className="block text-[9px] text-gray-400">{pct}%</span>}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className={`${TD_CLASS} text-right font-mono sticky right-0 bg-inherit z-10 ${row.balance <= 0 ? "text-red-600 font-bold" : "text-green-600"}`}>
                  {row.balance <= 0 ? `(${fmt(Math.abs(row.balance))})` : fmt(row.balance)}
                </td>
              </tr>
            ))}
            {/* Totals */}
            <tr className="bg-[#0F1B2D] sticky bottom-0 z-20">
              <td className="px-3 py-2 text-[11px] font-bold text-white sticky left-0 z-30 bg-[#0F1B2D]">TOTAL</td>
              <td className="px-3 py-2 text-[11px] font-bold text-white text-right font-mono">{fmt(totals.scheduled_value)}</td>
              {sortedDraws.map((d) => {
                const val = viewMode === "cumulative"
                  ? totals[`draw_${d.draw_number}_cumulative`]
                  : totals[`draw_${d.draw_number}_period`];
                const pct = totals.scheduled_value > 0 ? Math.round(((totals[`draw_${d.draw_number}_cumulative`] || 0) / totals.scheduled_value) * 100) : 0;
                return (
                  <td key={d.id} className="px-3 py-2 text-[11px] font-bold text-white text-right font-mono">
                    {fmt(val)}
                    <span className="block text-[9px] text-white/60">{pct}%</span>
                  </td>
                );
              })}
              <td className={`px-3 py-2 text-[11px] font-bold text-right font-mono sticky right-0 z-30 bg-[#0F1B2D] ${totals.balance <= 0 ? "text-red-400" : "text-green-400"}`}>
                {totals.balance <= 0 ? `(${fmt(Math.abs(totals.balance))})` : fmt(totals.balance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Progress Bars */}
      {matrix.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-bold text-[#0F1B2D]">Progreso por Línea</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {matrix.filter((r) => r.scheduled_value > 0).slice(0, 12).map((row) => (
              <div key={row.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-32 truncate text-gray-600" title={row.description}>{row.description}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0D7377] rounded-full transition-all" style={{ width: `${Math.min(row.last_pct, 100)}%` }} />
                </div>
                <span className="w-10 text-right font-mono text-gray-500">{row.last_pct}%</span>
                <span className="w-28 text-right font-mono text-gray-400 hidden md:block">
                  ({fmt(row.last_cumulative)} / {fmt(row.scheduled_value)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stacked Bar Chart */}
      {sortedDraws.length > 0 && chartData.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-bold text-[#0F1B2D]">Historial de Draws</h4>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={totals.scheduled_value} stroke="#DC2626" strokeDasharray="5 5" label={{ value: `Total: ${fmt(totals.scheduled_value)}`, fontSize: 10, fill: "#DC2626" }} />
                {chartKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawComparison;
