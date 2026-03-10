import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TH_CLASS, TD_CLASS, fmt } from "@/lib/design-system";
import type { Tables } from "@/integrations/supabase/types";

type SovLine = Tables<"sov_lines">;

interface GCFeeAnalysisProps {
  sovLines: SovLine[];
  feePct: number;
  isAdmin?: boolean;
}

const GCFeeAnalysis = ({ sovLines, feePct, isAdmin = false }: GCFeeAnalysisProps) => {
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const overdueLines = sovLines
    .filter((l) => (l.budget ?? 0) > 0 && l.end_date && l.end_date < today)
    .sort((a, b) => (a.end_date ?? "").localeCompare(b.end_date ?? ""));

  if (overdueLines.length === 0 && !open) {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#0F1B2D] text-white text-[13px] font-bold"
        >
          <span className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            Ejecución Real del GC — Actividades Vencidas
          </span>
          <span className="text-[11px] font-normal text-white/60">0 actividades vencidas</span>
        </button>
      </div>
    );
  }

  const computeRow = (line: SovLine) => {
    const budget = line.budget ?? 0;
    const feeAmount = budget * (feePct / 100);
    const realCost = line.real_cost ?? 0;
    const progress = line.progress_pct ?? 0;
    const ejecutado = realCost > 0 ? realCost * (progress / 100) : null;
    const delta = ejecutado != null ? ejecutado - feeAmount : null;

    let estado: { label: string; bg: string; text: string; rowBg: string };
    if (progress >= 100) {
      estado = { label: "Completado ✓", bg: "bg-[#D1FAE5]", text: "text-[#065F46]", rowBg: "bg-[#F0FDF4]" };
    } else if (progress > 0) {
      estado = { label: "En ejecución", bg: "bg-[#FEF3C7]", text: "text-[#92400E]", rowBg: "bg-[#FFFBEB]" };
    } else {
      estado = { label: "Sin iniciar ⚠️", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", rowBg: "bg-[#FEF2F2]" };
    }

    return { budget, feeAmount, realCost, progress, ejecutado, delta, estado };
  };

  const rows = overdueLines.map((l) => ({ line: l, ...computeRow(l) }));

  const totBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totFee = rows.reduce((s, r) => s + r.feeAmount, 0);
  const totReal = rows.reduce((s, r) => s + r.realCost, 0);
  const totEjecutado = rows.reduce((s, r) => s + (r.ejecutado ?? 0), 0);
  const totDelta = rows.reduce((s, r) => s + (r.delta ?? 0), 0);
  const hasAnyEjecutado = rows.some((r) => r.ejecutado != null);

  return (
    <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0F1B2D] text-white text-[13px] font-bold hover:bg-[#1a2d4a] transition-colors"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Ejecución Real del GC — Actividades Vencidas
        </span>
        <span className="text-[11px] font-normal text-white/60">
          {overdueLines.length} actividades vencidas
        </span>
      </button>

      {open && (
        <div>
          <div className="overflow-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className={`${TH_CLASS} w-10`}>#</th>
                  <th className={TH_CLASS}>Actividad</th>
                  <th className={TH_CLASS}>Fase</th>
                  <th className={TH_CLASS}>Fecha fin</th>
                  <th className={`${TH_CLASS} text-right`}>Budget</th>
                  {isAdmin && <th className={`${TH_CLASS} text-right w-16`}>Fee %</th>}
                  <th className={`${TH_CLASS} text-right`}>Fee Amount</th>
                  {isAdmin && <th className={`${TH_CLASS} text-right`}>Costo Real</th>}
                  <th className={`${TH_CLASS} text-right`}>Ejecutado GC</th>
                  {isAdmin && <th className={`${TH_CLASS} text-right`}>Δ vs Fee</th>}
                  <th className={`${TH_CLASS} text-center`}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={r.line.id}
                    className={`${r.estado.rowBg} border-b border-gray-100 transition-colors duration-200`}
                  >
                    <td className={`${TD_CLASS} font-mono text-gray-500`}>{r.line.line_number}</td>
                    <td className={TD_CLASS}>
                      <span className="font-medium">{r.line.name}</span>
                    </td>
                    <td className={TD_CLASS}>
                      {r.line.fase && (
                        <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0 text-[10px]">
                          {r.line.fase}
                        </Badge>
                      )}
                    </td>
                    <td className={`${TD_CLASS} text-[11px]`}>{r.line.end_date}</td>
                    <td className={`${TD_CLASS} text-right font-mono`}>{fmt(r.budget)}</td>
                    {isAdmin && (
                      <td className={`${TD_CLASS} text-right font-mono text-gray-500`}>{feePct}%</td>
                    )}
                    <td className={`${TD_CLASS} text-right font-mono`}>{fmt(r.feeAmount)}</td>
                    {isAdmin && (
                      <td className={`${TD_CLASS} text-right font-mono`}>
                        {r.realCost > 0 ? fmt(r.realCost) : <span className="text-gray-300">—</span>}
                      </td>
                    )}
                    <td className={`${TD_CLASS} text-right font-mono`}>
                      {r.ejecutado != null ? fmt(r.ejecutado) : <span className="text-gray-300">—</span>}
                    </td>
                    {isAdmin && (
                      <td className={`${TD_CLASS} text-right font-mono font-semibold`}>
                        {r.delta != null ? (
                          r.delta > 0 ? (
                            <span className="text-[#065F46]">+{fmt(r.delta)}</span>
                          ) : r.delta < 0 ? (
                            <span className="text-[#991B1B]">{fmt(r.delta)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    )}
                    <td className={`${TD_CLASS} text-center`}>
                      <Badge className={`${r.estado.bg} ${r.estado.text} border-0 text-[10px]`}>
                        {r.estado.label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-[#0F1B2D] text-white font-semibold">
                  <td className={`${TD_CLASS}`}></td>
                  <td className={TD_CLASS}>TOTAL ({rows.length} actividades)</td>
                  <td className={TD_CLASS}></td>
                  <td className={TD_CLASS}></td>
                  <td className={`${TD_CLASS} text-right font-mono`}>{fmt(totBudget)}</td>
                  {isAdmin && <td className={`${TD_CLASS} text-right font-mono`}>{feePct}%</td>}
                  <td className={`${TD_CLASS} text-right font-mono`}>{fmt(totFee)}</td>
                  {isAdmin && <td className={`${TD_CLASS} text-right font-mono`}>{fmt(totReal)}</td>}
                  <td className={`${TD_CLASS} text-right font-mono`}>
                    {hasAnyEjecutado ? fmt(totEjecutado) : "—"}
                  </td>
                  {isAdmin && (
                    <td className={`${TD_CLASS} text-right font-mono font-bold`}>
                      {hasAnyEjecutado ? (
                        totDelta > 0 ? (
                          <span className="text-green-300">+{fmt(totDelta)}</span>
                        ) : totDelta < 0 ? (
                          <span className="text-red-300">{fmt(totDelta)}</span>
                        ) : (
                          "—"
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className={TD_CLASS}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary chips */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-[#0F1B2D] font-semibold">Fee total esperado</p>
                <p className="text-[18px] font-bold text-[#0D7377]">{fmt(totFee)}</p>
                <p className="text-[10px] text-gray-400">budget × {feePct}%</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-[#0F1B2D] font-semibold">Ejecutado real GC</p>
                <p className="text-[18px] font-bold text-[#0D7377]">
                  {hasAnyEjecutado ? fmt(totEjecutado) : "—"}
                </p>
                <p className="text-[10px] text-gray-400">costo_real × av%</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-[#0F1B2D] font-semibold">Diferencia</p>
                <p
                  className={`text-[18px] font-bold ${
                    totDelta > 0 ? "text-[#065F46]" : totDelta < 0 ? "text-[#991B1B]" : "text-gray-400"
                  }`}
                >
                  {hasAnyEjecutado
                    ? totDelta > 0
                      ? `+${fmt(totDelta)}`
                      : fmt(totDelta)
                    : "—"}
                </p>
                <p className="text-[10px] text-gray-400">ejecutado − fee</p>
              </div>
            </div>

            {/* Interpretation note */}
            {hasAnyEjecutado && (
              <div
                className={`rounded-lg p-3 text-[12px] ${
                  totDelta < 0
                    ? "bg-[#FFF7ED] border border-[#FDBA74] text-[#9A3412]"
                    : totDelta > 0
                    ? "bg-[#EFF6FF] border border-[#93C5FD] text-[#1E40AF]"
                    : "bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]"
                }`}
              >
                {totDelta < 0
                  ? `⚠️ El GC ha ejecutado ${fmt(Math.abs(totDelta))} menos de lo esperado según el fee pactado para actividades vencidas.`
                  : totDelta > 0
                  ? `ℹ️ El GC ha ejecutado ${fmt(totDelta)} por encima del fee pactado en actividades vencidas.`
                  : "✓ Ejecución del GC alineada con el fee."}
              </div>
            )}

            {!isAdmin && (
              <p className="text-[10px] text-gray-400 text-right italic">
                Análisis de ejecución — 360lateral
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GCFeeAnalysis;
