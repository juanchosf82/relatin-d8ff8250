import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE, badgeClass,
} from "@/lib/design-system";

const PHASES_ORDER = ["Pre-Construction", "Foundation", "Framing", "MEP", "Enclosure", "Finishes", "Closeout"];

const PHASE_COLORS: Record<string, { badge: string; bar: string }> = {
  "Pre-Construction": { badge: "bg-slate-100 text-slate-700", bar: "bg-slate-400" },
  "Foundation": { badge: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  "Framing": { badge: "bg-orange-100 text-orange-700", bar: "bg-orange-400" },
  "MEP": { badge: "bg-purple-100 text-purple-700", bar: "bg-purple-400" },
  "Enclosure": { badge: "bg-blue-100 text-blue-700", bar: "bg-blue-400" },
  "Finishes": { badge: "bg-teal-100 text-teal-700", bar: "bg-teal-400" },
  "Closeout": { badge: "bg-green-100 text-green-700", bar: "bg-green-400" },
};

const STATUS_COLORS: Record<string, { badge: string; label: string; bar: string }> = {
  pending: { badge: "bg-[#F3F4F6] text-[#6B7280]", label: "Pendiente", bar: "bg-gray-200" },
  in_progress: { badge: "bg-blue-100 text-blue-700", label: "En progreso", bar: "bg-blue-500" },
  complete: { badge: "bg-[#D1FAE5] text-[#065F46]", label: "Completado ✓", bar: "bg-[#0D7377]" },
  delayed: { badge: "bg-[#FEE2E2] text-[#991B1B]", label: "Atrasado", bar: "bg-red-500" },
  at_risk: { badge: "bg-[#FFEDD5] text-[#9A3412]", label: "En riesgo", bar: "bg-orange-500" },
};

interface Milestone {
  id: string;
  name: string;
  phase: string;
  sequence: number;
  baseline_start: string | null;
  baseline_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string | null;
  is_critical_path: boolean | null;
}

export default function CronogramaClient({ projectId }: { projectId: string }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("milestones")
        .select("id, name, phase, sequence, baseline_start, baseline_end, actual_start, actual_end, status, is_critical_path")
        .eq("project_id", projectId)
        .order("sequence");
      setMilestones((data as Milestone[]) ?? []);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const { earliestStart, projectedCO, baselineCO, delayedCount, deltaLabel, deltaColor, timelineRange } = useMemo(() => {
    if (milestones.length === 0) return { earliestStart: "—", projectedCO: "—", baselineCO: "—", delayedCount: 0, deltaLabel: "—", deltaColor: "", timelineRange: null };

    const starts = milestones.map(m => m.actual_start || m.baseline_start).filter(Boolean) as string[];
    const earliestStart = starts.length ? starts.sort()[0] : "—";

    const closeoutMs = milestones.filter(m => m.phase === "Closeout").sort((a, b) => b.sequence - a.sequence);
    const lastCloseout = closeoutMs[0];
    const projectedCO = lastCloseout?.actual_end || lastCloseout?.baseline_end || "—";
    const baselineCO = lastCloseout?.baseline_end || "—";

    const delayedCount = milestones.filter(m => m.status === "delayed" || m.status === "at_risk").length;

    let deltaLabel = "—";
    let deltaColor = "";
    if (baselineCO !== "—" && projectedCO !== "—") {
      const diff = Math.round((new Date(projectedCO).getTime() - new Date(baselineCO).getTime()) / 86400000);
      if (diff > 0) { deltaLabel = `+${diff} días`; deltaColor = "text-[#991B1B]"; }
      else if (diff < 0) { deltaLabel = `${diff} días`; deltaColor = "text-[#1A7A4A]"; }
      else { deltaLabel = "0 días"; deltaColor = "text-gray-400"; }
    }

    // Compute timeline range
    const allDates = milestones.flatMap(m => [m.baseline_start, m.baseline_end, m.actual_start, m.actual_end].filter(Boolean)) as string[];
    let timelineRange = null;
    if (allDates.length >= 2) {
      const sorted = allDates.sort();
      timelineRange = { min: new Date(sorted[0]).getTime(), max: new Date(sorted[sorted.length - 1]).getTime() };
      // Add 5% padding
      const pad = (timelineRange.max - timelineRange.min) * 0.05 || 86400000 * 7;
      timelineRange.min -= pad;
      timelineRange.max += pad;
    }

    return { earliestStart, projectedCO, baselineCO, delayedCount, deltaLabel, deltaColor, timelineRange };
  }, [milestones]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;
  if (milestones.length === 0) return <p className="text-gray-400 text-[12px] py-8 text-center">No hay hitos configurados para este proyecto.</p>;

  const grouped = PHASES_ORDER.map(phase => ({
    phase,
    items: milestones.filter(m => m.phase === phase),
  })).filter(g => g.items.length > 0);

  const today = Date.now();
  const toPercent = (dateStr: string) => {
    if (!timelineRange) return 0;
    const t = new Date(dateStr).getTime();
    return Math.max(0, Math.min(100, ((t - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100));
  };
  const todayPct = timelineRange ? Math.max(0, Math.min(100, ((today - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100)) : null;

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <Chip label="Inicio de obra" value={earliestStart} />
        <Chip label="CO proyectado" value={projectedCO} />
        <Chip label="Δ vs baseline" value={deltaLabel} valueColor={deltaColor} large />
      </div>

      {/* Visual Timeline */}
      {timelineRange && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-[#0F1B2D] mb-4">Timeline</h3>
          <div className="relative">
            {/* Today marker */}
            {todayPct !== null && todayPct >= 0 && todayPct <= 100 && (
              <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-[#0F1B2D] z-10" style={{ left: `${todayPct}%` }}>
                <span className="absolute -top-5 -translate-x-1/2 text-[9px] bg-[#0F1B2D] text-white px-1.5 py-0.5 rounded">Hoy</span>
              </div>
            )}

            {grouped.map(({ phase, items }) => (
              <div key={phase} className="mb-4">
                <div className="mb-1">
                  <Badge className={`${PHASE_COLORS[phase]?.badge || "bg-gray-100 text-gray-600"} border-0 text-[10px]`}>{phase}</Badge>
                </div>
                {items.map(m => {
                  const st = STATUS_COLORS[m.status || "pending"] || STATUS_COLORS.pending;
                  const hasBaseline = m.baseline_start && m.baseline_end;
                  const hasActual = m.actual_start && (m.actual_end || m.status === "in_progress");

                  return (
                    <div key={m.id} className="flex items-center gap-3 py-1.5">
                      <div className="w-[200px] shrink-0 text-[11px] text-[#0F1B2D] truncate flex items-center gap-1">
                        {m.is_critical_path && <span className="text-[10px]">🔴</span>}
                        {m.name}
                      </div>
                      <div className="flex-1 relative h-4">
                        {/* Baseline bar */}
                        {hasBaseline && (
                          <div
                            className="absolute top-[6px] h-[4px] bg-gray-300 rounded-full"
                            style={{
                              left: `${toPercent(m.baseline_start!)}%`,
                              width: `${Math.max(toPercent(m.baseline_end!) - toPercent(m.baseline_start!), 0.5)}%`,
                            }}
                          />
                        )}
                        {/* Actual bar */}
                        {hasActual && (() => {
                          const startPct = toPercent(m.actual_start!);
                          const endDate = m.actual_end || new Date().toISOString().split("T")[0];
                          const endPct = toPercent(endDate);
                          const baselineEndPct = m.baseline_end ? toPercent(m.baseline_end) : endPct;
                          const overflows = endPct > baselineEndPct && m.baseline_end;

                          return (
                            <>
                              <div
                                className={`absolute top-[2px] h-[8px] rounded-full ${st.bar}`}
                                style={{
                                  left: `${startPct}%`,
                                  width: `${Math.max((overflows ? baselineEndPct : endPct) - startPct, 0.5)}%`,
                                }}
                              />
                              {overflows && (
                                <div
                                  className="absolute top-[2px] h-[8px] rounded-r-full bg-red-500"
                                  style={{
                                    left: `${baselineEndPct}%`,
                                    width: `${Math.max(endPct - baselineEndPct, 0.3)}%`,
                                  }}
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="w-[90px] shrink-0">
                        <Badge className={`${st.badge} border-0 text-[9px]`}>{st.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compact table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className={TH_CLASS}>Hito</th>
              <th className={TH_CLASS}>Fin Baseline</th>
              <th className={TH_CLASS}>Fin Real</th>
              <th className={TH_CLASS}>Δ Días</th>
              <th className={TH_CLASS}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, idx) => {
              const st = STATUS_COLORS[m.status || "pending"] || STATUS_COLORS.pending;
              const delta = m.baseline_end && m.actual_end
                ? Math.round((new Date(m.actual_end).getTime() - new Date(m.baseline_end).getTime()) / 86400000)
                : null;
              return (
                <tr key={m.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                  <td className={`${TD_CLASS} font-medium`}>
                    {m.is_critical_path && <span className="mr-1">🔴</span>}
                    {m.name}
                  </td>
                  <td className={`${TD_CLASS} text-[11px]`}>{m.baseline_end || "—"}</td>
                  <td className={`${TD_CLASS} text-[11px]`}>{m.actual_end || "—"}</td>
                  <td className={`${TD_CLASS} font-mono ${delta !== null ? (delta > 0 ? "text-[#991B1B]" : delta < 0 ? "text-[#1A7A4A]" : "text-gray-400") : ""}`}>
                    {delta !== null ? (delta > 0 ? `+${delta} días` : delta < 0 ? `${delta} días` : "0") : "—"}
                  </td>
                  <td className={TD_CLASS}><Badge className={`${st.badge} border-0 text-[10px]`}>{st.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Loan Impact Callout */}
      {delayedCount > 0 && baselineCO !== "—" && projectedCO !== "—" && (
        <div className="border-2 border-orange-300 bg-orange-50 rounded-lg p-4">
          <p className="text-[13px] font-bold text-[#9A3412] mb-1">⚠️ Impacto en loan term</p>
          <p className="text-[12px] text-[#9A3412]">
            {delayedCount} hito{delayedCount > 1 ? "s" : ""} muestra{delayedCount > 1 ? "n" : ""} atraso.
            Proyección actual de CO: <strong>{projectedCO}</strong>.
            Baseline original: <strong>{baselineCO}</strong>.
            Δ: <strong>{deltaLabel}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, valueColor, large }: { label: string; value: string; valueColor?: string; large?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-2">
      <p className="text-[10px] uppercase text-gray-400">{label}</p>
      <p className={`${large ? "text-[18px]" : "text-[14px]"} font-bold text-[#0F1B2D] ${valueColor || ""}`}>{value}</p>
    </div>
  );
}
