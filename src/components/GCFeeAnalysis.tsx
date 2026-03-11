import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TH_CLASS, TD_CLASS, fmt } from "@/lib/design-system";
import type { Tables } from "@/integrations/supabase/types";

type SovLine = Tables<"sov_lines">;

interface GCFeeAnalysisProps {
  sovLines: SovLine[];
  feePct: number;
  isAdmin?: boolean;
}

interface Filters {
  search: string;
  fase: string;
  estado: string;
  progressMin: string;
  progressMax: string;
  budgetMin: string;
  budgetMax: string;
}

const emptyFilters: Filters = {
  search: "",
  fase: "",
  estado: "",
  progressMin: "",
  progressMax: "",
  budgetMin: "",
  budgetMax: "",
};

const GCFeeAnalysis = ({ sovLines, feePct, isAdmin = false }: GCFeeAnalysisProps) => {
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [searchInput, setSearchInput] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Base filter: budget > 0, progress > 1%, NOT excluded
  const overdueLines = useMemo(
    () =>
      sovLines
        .filter((l) => (l.budget ?? 0) > 0 && (l.progress_pct ?? 0) > 1 && !l.excluded_from_total)
        .sort((a, b) => (a.end_date ?? "").localeCompare(b.end_date ?? "")),
    [sovLines]
  );

  // Count excluded lines that WOULD have matched the base filter
  const excludedCount = useMemo(
    () => sovLines.filter((l) => (l.budget ?? 0) > 0 && (l.progress_pct ?? 0) > 1 && !!l.excluded_from_total).length,
    [sovLines]
  );
  const excludedBudgetSum = useMemo(
    () => sovLines.filter((l) => (l.budget ?? 0) > 0 && (l.progress_pct ?? 0) > 1 && !!l.excluded_from_total).reduce((s, l) => s + (l.budget ?? 0), 0),
    [sovLines]
  );

  // Unique phases from filtered lines
  const phases = useMemo(
    () => [...new Set(overdueLines.map((l) => l.fase).filter(Boolean))] as string[],
    [overdueLines]
  );

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.search) c++;
    if (filters.fase) c++;
    if (filters.estado) c++;
    if (filters.progressMin || filters.progressMax) c++;
    if (filters.budgetMin || filters.budgetMax) c++;
    return c;
  }, [filters]);

  const handleSearchChange = useCallback(
    (val: string) => {
      setSearchInput(val);
      if (debounceTimer) clearTimeout(debounceTimer);
      const t = setTimeout(() => setFilters((f) => ({ ...f, search: val })), 300);
      setDebounceTimer(t);
    },
    [debounceTimer]
  );

  // Apply sub-filters on overdue lines
  const filteredLines = useMemo(() => {
    let result = overdueLines;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) => l.name.toLowerCase().includes(q) || (l.subfase ?? "").toLowerCase().includes(q)
      );
    }
    if (filters.fase) {
      result = result.filter((l) => l.fase === filters.fase);
    }
    if (filters.estado) {
      if (filters.estado === "en_ejecucion") result = result.filter((l) => (l.progress_pct ?? 0) > 1 && (l.progress_pct ?? 0) < 100);
      if (filters.estado === "completado") result = result.filter((l) => (l.progress_pct ?? 0) >= 100);
    }
    if (filters.progressMin) {
      const min = parseFloat(filters.progressMin);
      if (!isNaN(min)) result = result.filter((l) => (l.progress_pct ?? 0) >= min);
    }
    if (filters.progressMax) {
      const max = parseFloat(filters.progressMax);
      if (!isNaN(max)) result = result.filter((l) => (l.progress_pct ?? 0) <= max);
    }
    if (filters.budgetMin) {
      const min = parseFloat(filters.budgetMin);
      if (!isNaN(min)) result = result.filter((l) => (l.budget ?? 0) >= min);
    }
    if (filters.budgetMax) {
      const max = parseFloat(filters.budgetMax);
      if (!isNaN(max)) result = result.filter((l) => (l.budget ?? 0) <= max);
    }
    return result;
  }, [overdueLines, filters]);

  const hasActiveFilters = activeFilterCount > 0;
  const isFiltered = filteredLines.length !== overdueLines.length;

  // Active filter pills
  const filterPills = useMemo(() => {
    const pills: { label: string; key: keyof Filters; clear: Partial<Filters> }[] = [];
    if (filters.search) pills.push({ label: `"${filters.search}"`, key: "search", clear: { search: "" } });
    if (filters.fase) pills.push({ label: `Fase: ${filters.fase}`, key: "fase", clear: { fase: "" } });
    if (filters.estado) {
      const lbl = filters.estado === "en_ejecucion" ? "En ejecución" : "Completado";
      pills.push({ label: lbl, key: "estado", clear: { estado: "" } });
    }
    if (filters.progressMin || filters.progressMax) {
      const parts = [];
      if (filters.progressMin) parts.push(`≥${filters.progressMin}%`);
      if (filters.progressMax) parts.push(`≤${filters.progressMax}%`);
      pills.push({ label: `Av. ${parts.join(" ")}`, key: "progressMin", clear: { progressMin: "", progressMax: "" } });
    }
    if (filters.budgetMin || filters.budgetMax) {
      const parts = [];
      if (filters.budgetMin) parts.push(`≥$${filters.budgetMin}`);
      if (filters.budgetMax) parts.push(`≤$${filters.budgetMax}`);
      pills.push({ label: `Budget ${parts.join(" ")}`, key: "budgetMin", clear: { budgetMin: "", budgetMax: "" } });
    }
    return pills;
  }, [filters]);

  if (overdueLines.length === 0 && !open) {
    return (
      <div className="mt-4 rounded-lg border border-border overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[hsl(216,50%,12%)] text-white text-[13px] font-bold"
        >
          <span className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            Ejecución Real del GC — Actividades en Progreso
          </span>
          <span className="text-[11px] font-normal text-white/60">0 actividades con ejecución &gt; 1%</span>
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
      estado = { label: "Completado ✓", bg: "bg-emerald-100", text: "text-emerald-800", rowBg: "bg-emerald-50/50" };
    } else if (progress > 0) {
      estado = { label: "En ejecución", bg: "bg-amber-100", text: "text-amber-800", rowBg: "bg-amber-50/30" };
    } else {
      estado = { label: "Sin iniciar ⚠️", bg: "bg-red-100", text: "text-red-800", rowBg: "bg-red-50/30" };
    }

    return { budget, feeAmount, realCost, progress, ejecutado, delta, estado };
  };

  const rows = filteredLines.map((l) => ({ line: l, ...computeRow(l) }));

  const totBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totFee = rows.reduce((s, r) => s + r.feeAmount, 0);
  const totReal = rows.reduce((s, r) => s + r.realCost, 0);
  const totEjecutado = rows.reduce((s, r) => s + (r.ejecutado ?? 0), 0);
  const totDelta = rows.reduce((s, r) => s + (r.delta ?? 0), 0);
  const hasAnyEjecutado = rows.some((r) => r.ejecutado != null);

  const clearFilters = () => {
    setFilters(emptyFilters);
    setSearchInput("");
  };

  const removePill = (clear: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...clear }));
    if ("search" in clear) setSearchInput("");
  };

  return (
    <div className="mt-4 rounded-lg border border-border overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[hsl(216,50%,12%)] text-white text-[13px] font-bold hover:bg-[hsl(216,40%,18%)] transition-colors"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Ejecución Real del GC — Actividades en Progreso
        </span>
        <span className="flex items-center gap-2">
          {overdueLines.length} actividades con ejecución &gt; 1%
          {excludedCount > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/50 cursor-pointer hover:bg-white/20 transition-colors"
              title="Click para ver líneas excluidas en la tabla SOV"
              onClick={(e) => {
                e.stopPropagation();
                const sovTable = document.getElementById("sov-table-container");
                if (sovTable) sovTable.scrollIntoView({ behavior: "smooth" });
              }}
            >
              ⊘ {excludedCount} excluidas del cálculo
            </span>
          )}
        </span>
      </button>

      {open && (
        <div>
          {/* Filter bar */}
          <div className="border-b border-border">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Filtrar
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="px-4 pb-4 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Buscar actividad..."
                    className="pl-9 h-8 text-[12px]"
                  />
                </div>

                {/* Filter grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Fase */}
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Fase</label>
                    <select
                      value={filters.fase}
                      onChange={(e) => setFilters((f) => ({ ...f, fase: e.target.value }))}
                      className="w-full h-8 text-[12px] rounded-md border border-input bg-background px-2"
                    >
                      <option value="">Todas</option>
                      {phases.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Estado</label>
                    <select
                      value={filters.estado}
                      onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                      className="w-full h-8 text-[12px] rounded-md border border-input bg-background px-2"
                    >
                      <option value="">Todos</option>
                      <option value="en_ejecucion">En ejecución</option>
                      <option value="completado">Completado</option>
                    </select>
                  </div>

                  {/* Av. Físico range */}
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Av. Físico %</label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.progressMin}
                        onChange={(e) => setFilters((f) => ({ ...f, progressMin: e.target.value }))}
                        className="h-8 text-[12px] w-1/2"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.progressMax}
                        onChange={(e) => setFilters((f) => ({ ...f, progressMax: e.target.value }))}
                        className="h-8 text-[12px] w-1/2"
                      />
                    </div>
                  </div>

                  {/* Budget range */}
                  <div className="col-span-2 md:col-span-3">
                    <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Budget $</label>
                    <div className="flex gap-1 max-w-xs">
                      <Input
                        type="number"
                        placeholder="Min $"
                        value={filters.budgetMin}
                        onChange={(e) => setFilters((f) => ({ ...f, budgetMin: e.target.value }))}
                        className="h-8 text-[12px] w-1/2"
                      />
                      <Input
                        type="number"
                        placeholder="Max $"
                        value={filters.budgetMax}
                        onChange={(e) => setFilters((f) => ({ ...f, budgetMax: e.target.value }))}
                        className="h-8 text-[12px] w-1/2"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom row: clear + count */}
                <div className="flex items-center justify-between">
                  {hasActiveFilters ? (
                    <button onClick={clearFilters} className="text-[11px] font-medium text-[hsl(216,50%,12%)] hover:underline">
                      Limpiar filtros
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {filteredLines.length} de {overdueLines.length} resultados
                  </span>
                </div>

                {/* Active filter pills */}
                {filterPills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {filterPills.map((pill) => (
                      <span
                        key={pill.key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[hsl(180,80%,95%)] border border-[hsl(183,80%,26%)] text-[hsl(183,80%,26%)]"
                      >
                        {pill.label}
                        <button onClick={() => removePill(pill.clear)} className="hover:bg-[hsl(180,80%,90%)] rounded-full p-0.5">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table */}
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
                {rows.map((r) => (
                  <tr
                    key={r.line.id}
                    className={`${r.estado.rowBg} border-b border-border/50 transition-colors duration-200 hover:bg-accent/30`}
                  >
                    <td className={`${TD_CLASS} font-mono text-muted-foreground`}>{r.line.line_number}</td>
                    <td className={TD_CLASS}>
                      <span className="font-medium">{r.line.name}</span>
                    </td>
                    <td className={TD_CLASS}>
                      {r.line.fase && (
                        <Badge className="bg-[hsl(180,80%,95%)] text-[hsl(183,80%,26%)] border-0 text-[10px]">
                          {r.line.fase}
                        </Badge>
                      )}
                    </td>
                    <td className={`${TD_CLASS} text-[11px]`}>{r.line.end_date}</td>
                    <td className={`${TD_CLASS} text-right font-mono`}>{fmt(r.budget)}</td>
                    {isAdmin && (
                      <td className={`${TD_CLASS} text-right font-mono text-muted-foreground`}>{feePct}%</td>
                    )}
                    <td className={`${TD_CLASS} text-right font-mono`}>{fmt(r.feeAmount)}</td>
                    {isAdmin && (
                      <td className={`${TD_CLASS} text-right font-mono`}>
                        {r.realCost > 0 ? fmt(r.realCost) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    )}
                    <td className={`${TD_CLASS} text-right font-mono`}>
                      {r.ejecutado != null ? fmt(r.ejecutado) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    {isAdmin && (
                      <td className={`${TD_CLASS} text-right font-mono font-semibold`}>
                        {r.delta != null ? (
                          r.delta > 0 ? (
                            <span className="text-emerald-700">+{fmt(r.delta)}</span>
                          ) : r.delta < 0 ? (
                            <span className="text-destructive">{fmt(r.delta)}</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
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
              <tfoot>
                <tr className="bg-[hsl(216,50%,12%)] text-white font-semibold">
                  <td className={TD_CLASS}></td>
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
                          <span className="text-emerald-300">+{fmt(totDelta)}</span>
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
                {isFiltered && (
                  <tr className="bg-[hsl(216,45%,15%)]">
                    <td
                      colSpan={isAdmin ? 11 : 8}
                      className="px-3 py-1.5 text-[10px] italic text-muted-foreground/60"
                    >
                      * Totales sobre {filteredLines.length} actividades filtradas de {overdueLines.length} totales
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Summary chips */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background border border-border rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-foreground font-semibold">Fee total esperado</p>
                <p className="text-[18px] font-bold text-[hsl(183,80%,26%)]">{fmt(totFee)}</p>
                <p className="text-[10px] text-muted-foreground">budget × {feePct}%</p>
              </div>
              <div className="bg-background border border-border rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-foreground font-semibold">Ejecutado real GC</p>
                <p className="text-[18px] font-bold text-[hsl(183,80%,26%)]">
                  {hasAnyEjecutado ? fmt(totEjecutado) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">costo_real × av%</p>
              </div>
              <div className="bg-background border border-border rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-foreground font-semibold">Diferencia</p>
                <p
                  className={`text-[18px] font-bold ${
                    totDelta > 0 ? "text-emerald-700" : totDelta < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {hasAnyEjecutado
                    ? totDelta > 0
                      ? `+${fmt(totDelta)}`
                      : fmt(totDelta)
                    : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">ejecutado − fee</p>
              </div>
            </div>

            {hasAnyEjecutado && (
              <div
                className={`rounded-lg p-3 text-[12px] ${
                  totDelta < 0
                    ? "bg-orange-50 border border-orange-300 text-orange-900"
                    : totDelta > 0
                    ? "bg-blue-50 border border-blue-300 text-blue-900"
                    : "bg-emerald-50 border border-emerald-300 text-emerald-900"
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
              <p className="text-[10px] text-muted-foreground text-right italic">
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
