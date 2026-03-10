import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Download, ChevronLeft, ChevronRight, Plus, Save, Layers } from "lucide-react";
import * as XLSX from "xlsx";
import SovEditableRow from "@/components/admin/SovEditableRow";
import { COLOR_PRESETS, FONT_COLOR_PRESETS } from "@/components/admin/SovColorPicker";
import SovColorLegend, { loadColorLabels } from "@/components/admin/SovColorLegend";
import {
  TH_CLASS, TD_CLASS, TR_STRIPE,
} from "@/lib/design-system";

const ROWS_PER_PAGE = 50;
const INSERT_CHUNK = 50;

const FASE_COLORS = [
  { bg: "bg-teal-100 text-teal-800" },
  { bg: "bg-blue-950/10 text-blue-950" },
  { bg: "bg-orange-100 text-orange-800" },
  { bg: "bg-purple-100 text-purple-800" },
  { bg: "bg-green-100 text-green-800" },
  { bg: "bg-slate-200 text-slate-700" },
];

const parseDate = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    return null;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m4) return `${m4[3]}-${m4[1].padStart(2, "0")}-${m4[2].padStart(2, "0")}`;
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m2) {
    const yr = Number(m2[3]);
    const fullYear = yr >= 50 ? 1900 + yr : 2000 + yr;
    return `${fullYear}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  }
  return null;
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

const parseNumericValue = (val: any): number => {
  if (val == null || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const cleaned = String(val).replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const normalizeHeader = (value: any) =>
  String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const formatShortDate = (d: string | null) => {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`;
};

const fmtCurrency = (v: number | null) =>
  v != null ? v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }) : "—";

const calcBudgetProgress = (realCost: number, progressPct: number, budget: number) => {
  if (budget <= 0) return 0;
  return Math.round(((realCost || 0) * (progressPct / 100)) / budget * 100 * 100) / 100;
};

const isOverdue = (endDate: string | null, progressPct: number) => {
  if (!endDate || progressPct >= 100) return false;
  const today = new Date().toISOString().split("T")[0];
  return endDate < today;
};

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-1.5">
    <div className="h-2 flex-1 bg-[#E5E7EB] rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <span className="text-[11px] font-semibold w-10 text-right tabular-nums">{value}%</span>
  </div>
);

const budgetBarColor = (v: number) =>
  v > 100 ? "bg-[#DC2626]" : v > 85 ? "bg-[#E07B39]" : "bg-[#1A7A4A]";

interface SOVTableProps {
  projectId: string;
  canEdit: boolean;
  showUpload: boolean;
  showExport: boolean;
  gcFeePct?: number;
}

const SOVTable = ({ projectId, canEdit, showUpload, showExport, gcFeePct = 0 }: SOVTableProps) => {
  const [sovLines, setSovLines] = useState<any[]>([]);
  const [dbRowCount, setDbRowCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [page, setPage] = useState(0);
  const [newRows, setNewRows] = useState<any[]>([]);
  const [editedRowIds, setEditedRowIds] = useState<Set<string>>(new Set());
  const [groupByFase, setGroupByFase] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [colorLabels, setColorLabels] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectId && canEdit) setColorLabels(loadColorLabels(projectId));
  }, [projectId, canEdit]);

  const faseColorMap = useMemo(() => {
    const unique = [...new Set(sovLines.map((l) => l.fase).filter(Boolean))];
    const map: Record<string, string> = {};
    unique.forEach((f, i) => { map[f] = FASE_COLORS[i % FASE_COLORS.length].bg; });
    return map;
  }, [sovLines]);

  const fetchLines = async (pid: string) => {
    let all: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("sov_lines").select("*").eq("project_id", pid)
        .order("line_number").range(from, from + 999);
      if (data) all = all.concat(data);
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    setSovLines(all);
    setPage(0);
    setNewRows([]);
    setEditedRowIds(new Set());
  };

  const fetchDbCount = async (pid: string) => {
    const { count } = await supabase
      .from("sov_lines").select("id", { count: "exact", head: true }).eq("project_id", pid);
    setDbRowCount(count ?? 0);
  };

  useEffect(() => {
    if (projectId) {
      void Promise.all([fetchLines(projectId), fetchDbCount(projectId)]);
    } else {
      setSovLines([]);
      setDbRowCount(0);
    }
  }, [projectId]);

  const totalBudget = useMemo(() =>
    sovLines.reduce((a, c) => a + (c.budget || 0), 0) + newRows.reduce((a, c) => a + (c.budget || 0), 0),
    [sovLines, newRows]
  );

  const updateProjectProgress = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase.from("sov_lines").select("progress_pct, budget").eq("project_id", projectId);
    if (data && data.length > 0) {
      const linesWithBudget = data.filter(l => (l.budget || 0) > 0);
      const totalB = linesWithBudget.reduce((a, c) => a + (c.budget || 0), 0);
      const avg = totalB > 0
        ? Math.round(linesWithBudget.reduce((a, c) => a + ((c.progress_pct || 0) * (c.budget || 0)), 0) / totalB)
        : Math.round(data.reduce((a, c) => a + (c.progress_pct || 0), 0) / data.length);
      await supabase.from("projects").update({ progress_pct: avg }).eq("id", projectId);
    }
  }, [projectId]);

  const recalcAllBudgetProgress = useCallback(async (pid: string) => {
    const { data: lines } = await supabase.from("sov_lines").select("id, budget, progress_pct, real_cost").eq("project_id", pid);
    if (!lines || lines.length === 0) return;
    for (const l of lines) {
      const bp = (l.budget || 0) > 0
        ? Math.round(((l.real_cost || 0) * ((l.progress_pct || 0) / 100)) / (l.budget || 1) * 100 * 100) / 100
        : 0;
      await supabase.from("sov_lines").update({ budget_progress_pct: bp }).eq("id", l.id);
    }
  }, []);

  const handleSaveRow = useCallback(async (line: any) => {
    const isNewRow = !line.id || line.id.startsWith("new-");
    const record = {
      project_id: projectId,
      line_number: line.line_number,
      name: line.name,
      fase: line.fase,
      subfase: line.subfase,
      start_date: line.start_date,
      end_date: line.end_date,
      progress_pct: line.progress_pct,
      budget: line.budget,
      real_cost: line.real_cost,
      budget_progress_pct: line.budget_progress_pct,
      updated_at: new Date().toISOString(),
    };
    if (isNewRow) {
      const { error } = await supabase.from("sov_lines").insert(record);
      if (error) { toast.error("Error: " + error.message); throw error; }
    } else {
      const { error } = await supabase.from("sov_lines").update(record).eq("id", line.id);
      if (error) { toast.error("Error: " + error.message); throw error; }
    }
    toast.success("✓ Guardado", { duration: 2000 });
    await recalcAllBudgetProgress(projectId);
    await updateProjectProgress();
    await Promise.all([fetchLines(projectId), fetchDbCount(projectId)]);
  }, [projectId, updateProjectProgress, recalcAllBudgetProgress]);

  const handleDeleteRow = useCallback(async (id: string) => {
    const { error } = await supabase.from("sov_lines").delete().eq("id", id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Línea eliminada", { duration: 2000 });
    await recalcAllBudgetProgress(projectId);
    await updateProjectProgress();
    await Promise.all([fetchLines(projectId), fetchDbCount(projectId)]);
  }, [projectId, updateProjectProgress, recalcAllBudgetProgress]);

  const handleAddRow = () => {
    const allLines = [...sovLines, ...newRows];
    const lastLine = allLines.length > 0 ? allLines[allLines.length - 1].line_number : "0";
    const nextNum = (parseFloat(lastLine) + 0.1).toFixed(1);
    setNewRows((prev) => [...prev, {
      id: `new-${Date.now()}`,
      project_id: projectId,
      line_number: nextNum,
      name: "", fase: null, subfase: null,
      start_date: null, end_date: null,
      progress_pct: 0, budget: 0, real_cost: 0, budget_progress_pct: 0,
    }]);
    const totalWithNew = sovLines.length + newRows.length + 1;
    setPage(Math.max(0, Math.ceil(totalWithNew / ROWS_PER_PAGE) - 1));
  };

  const handleEditStateChange = useCallback((lineId: string, isEditing: boolean) => {
    setEditedRowIds((prev) => {
      const next = new Set(prev);
      if (isEditing) next.add(lineId); else next.delete(lineId);
      return next;
    });
  }, []);

  const handleColorChange = useCallback(async (lineId: string, color: string | null) => {
    if (lineId.startsWith("new-")) {
      setNewRows((prev) => prev.map((r) => r.id === lineId ? { ...r, row_color: color } : r));
      return;
    }
    await supabase.from("sov_lines").update({ row_color: color }).eq("id", lineId);
    setSovLines((prev) => prev.map((l) => l.id === lineId ? { ...l, row_color: color } : l));
  }, []);

  const handleFontColorChange = useCallback(async (lineId: string, color: string | null) => {
    if (lineId.startsWith("new-")) {
      setNewRows((prev) => prev.map((r) => r.id === lineId ? { ...r, font_color: color } : r));
      return;
    }
    await supabase.from("sov_lines").update({ font_color: color }).eq("id", lineId);
    setSovLines((prev) => prev.map((l) => l.id === lineId ? { ...l, font_color: color } : l));
  }, []);

  const handleBulkColor = useCallback(async (color: string | null) => {
    const ids = [...selectedIds].filter((id) => !id.startsWith("new-"));
    if (ids.length > 0) {
      for (const id of ids) {
        await supabase.from("sov_lines").update({ row_color: color }).eq("id", id);
      }
    }
    setSovLines((prev) => prev.map((l) => selectedIds.has(l.id) ? { ...l, row_color: color } : l));
    setNewRows((prev) => prev.map((r) => selectedIds.has(r.id) ? { ...r, row_color: color } : r));
    setSelectedIds(new Set());
    toast.success(`Color aplicado a ${selectedIds.size} líneas`);
  }, [selectedIds]);

  const handleBulkFontColor = useCallback(async (color: string | null) => {
    const ids = [...selectedIds].filter((id) => !id.startsWith("new-"));
    if (ids.length > 0) {
      for (const id of ids) {
        await supabase.from("sov_lines").update({ font_color: color }).eq("id", id);
      }
    }
    setSovLines((prev) => prev.map((l) => selectedIds.has(l.id) ? { ...l, font_color: color } : l));
    setNewRows((prev) => prev.map((r) => selectedIds.has(r.id) ? { ...r, font_color: color } : r));
    toast.success(`Color de texto aplicado a ${selectedIds.size} líneas`);
  }, [selectedIds]);

  const handleSelectToggle = useCallback((lineId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId); else next.add(lineId);
      return next;
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setUploading(true);
    setUploadProgress("Leyendo archivo...");
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false, raw: false });
      const requiredHeaders = ["linea","nombre_actividad","fase","subfase","fecha_inicio","fecha_fin","avance_fisico","budget","costo_real","avance_presupuesto"];
      const normalizedHeaders = (rows[0] ?? []).map(normalizeHeader);
      const headerIndex = Object.fromEntries(requiredHeaders.map((k) => [k, normalizedHeaders.indexOf(k)])) as Record<string, number>;
      const missing = requiredHeaders.filter((k) => headerIndex[k] === -1);
      if (missing.length) { toast.error(`Faltan columnas: ${missing.join(", ")}`); return; }

      const dataRows = rows.slice(1).filter((r) => r.some((c: any) => c != null && String(c).trim() !== ""));

      // Detect if avance columns are in decimal (0-1) or percentage (0-100) format
      let maxAvanceFisico = 0;
      let maxAvancePresupuesto = 0;
      for (const r of dataRows) {
        const af = parseNumericValue(r[headerIndex.avance_fisico]);
        const ap = parseNumericValue(r[headerIndex.avance_presupuesto]);
        if (af > maxAvanceFisico) maxAvanceFisico = af;
        if (ap > maxAvancePresupuesto) maxAvancePresupuesto = ap;
      }
      const afIsDecimal = maxAvanceFisico > 0 && maxAvanceFisico <= 1;
      const apIsDecimal = maxAvancePresupuesto > 0 && maxAvancePresupuesto <= 1;

      if (afIsDecimal) toast.info("Avance físico detectado como decimal (0-1). Convertido a porcentaje (0-100).");
      if (apIsDecimal) toast.info("Avance presupuesto detectado como decimal (0-1). Convertido a porcentaje (0-100).");

      const recordsByLine = new Map<string, any>();
      for (const r of dataRows) {
        const ln = String(r[headerIndex.linea] ?? "").trim();
        if (!ln) continue;
        let rawAF = parseNumericValue(r[headerIndex.avance_fisico]);
        if (afIsDecimal && rawAF <= 1) rawAF = rawAF * 100;
        recordsByLine.set(ln, {
          project_id: projectId, line_number: ln,
          name: String(r[headerIndex.nombre_actividad] ?? "").trim(),
          fase: r[headerIndex.fase] != null ? String(r[headerIndex.fase]).trim() : null,
          subfase: r[headerIndex.subfase] != null ? String(r[headerIndex.subfase]).trim() : null,
          start_date: parseDate(r[headerIndex.fecha_inicio]),
          end_date: parseDate(r[headerIndex.fecha_fin]),
          progress_pct: clamp(Math.round(rawAF)),
          budget: parseNumericValue(r[headerIndex.budget]),
          real_cost: parseNumericValue(r[headerIndex.costo_real]),
          budget_progress_pct: 0,
          updated_at: new Date().toISOString(),
        });
      }
      const records = Array.from(recordsByLine.values());
      const dupes = dataRows.length - records.length;
      if (!records.length) { toast.error("No se encontraron líneas válidas."); return; }

      for (const r of records) {
        if ((r.budget || 0) > 0) {
          r.budget_progress_pct = Math.round(((r.real_cost || 0) * (r.progress_pct / 100)) / r.budget * 100 * 100) / 100;
        } else {
          r.budget_progress_pct = 0;
        }
      }

      setUploadProgress("Eliminando líneas anteriores...");
      const { error: delErr } = await supabase.from("sov_lines").delete().eq("project_id", projectId);
      if (delErr) throw new Error(delErr.message);

      let inserted = 0;
      const totalB = Math.ceil(records.length / INSERT_CHUNK);
      for (let i = 0; i < records.length; i += INSERT_CHUNK) {
        const chunk = records.slice(i, i + INSERT_CHUNK);
        setUploadProgress(`Cargando lote ${Math.floor(i / INSERT_CHUNK) + 1} de ${totalB}...`);
        const { error } = await supabase.from("sov_lines").upsert(chunk, { onConflict: "project_id,line_number", ignoreDuplicates: true });
        if (error) throw error;
        inserted += chunk.length;
      }

      const avg = Math.round(records.reduce((a, c) => a + c.progress_pct, 0) / records.length);
      await supabase.from("projects").update({ progress_pct: avg }).eq("id", projectId);
      await Promise.all([fetchLines(projectId), fetchDbCount(projectId)]);
      toast.success(dupes > 0 ? `${inserted} líneas cargadas (${dupes} duplicadas reemplazadas)` : `${inserted} líneas cargadas`);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExport = () => {
    if (!sovLines.length) return;
    const data = sovLines.map((l) => ({
      linea: l.line_number, nombre_actividad: l.name, fase: l.fase || "", subfase: l.subfase || "",
      fecha_inicio: l.start_date || "", fecha_fin: l.end_date || "",
      avance_fisico: l.progress_pct || 0, budget: l.budget || 0,
      costo_real: l.real_cost || 0, avance_presupuesto: l.budget_progress_pct || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wbOut = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbOut, ws, "SOV");
    XLSX.writeFile(wbOut, `SOV_export.xlsx`);
  };

  // Build display list
  const allDisplayLines = [...sovLines, ...newRows];

  const groupedDisplayData = useMemo(() => {
    if (!groupByFase) return null;
    const groups: { fase: string; lines: any[]; avgFisico: number; count: number }[] = [];
    const faseMap = new Map<string, any[]>();
    for (const l of allDisplayLines) {
      const f = l.fase || "Sin Fase";
      if (!faseMap.has(f)) faseMap.set(f, []);
      faseMap.get(f)!.push(l);
    }
    for (const [fase, lines] of faseMap) {
      const avg = lines.length > 0 ? Math.round(lines.reduce((a, c) => a + (c.progress_pct || 0), 0) / lines.length) : 0;
      groups.push({ fase, lines, avgFisico: avg, count: lines.length });
    }
    return groups;
  }, [groupByFase, sovLines, newRows]);

  const totalPages = Math.max(1, Math.ceil(allDisplayLines.length / ROWS_PER_PAGE));
  const pagedLines = groupByFase ? allDisplayLines : allDisplayLines.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const totalReal = sovLines.reduce((a, c) => a + (c.real_cost || 0), 0);
  const linesWithBudget = sovLines.filter(l => (l.budget || 0) > 0);
  const totalBudgetPositive = linesWithBudget.reduce((a, c) => a + (c.budget || 0), 0);
  const avgFisico = totalBudgetPositive > 0
    ? Math.round(linesWithBudget.reduce((a, c) => a + ((c.progress_pct || 0) * (c.budget || 0)), 0) / totalBudgetPositive * 100) / 100
    : 0;
  const sumBudgetProgress = totalBudgetPositive > 0
    ? Math.round(linesWithBudget.reduce((a, c) => a + ((c.real_cost || 0) * ((c.progress_pct || 0) / 100)), 0) / totalBudgetPositive * 100 * 100) / 100
    : 0;

  const totalFeeAmount = sovLines.reduce((a, c) => a + ((c.budget || 0) * (gcFeePct / 100)), 0);

  // Column count for colSpan calculations
  // Cols: # | 🎨(admin)/dot(portal) | Actividad | Fase | Inicio | Fin | Av.Físico | Budget | Constr.Fee | CostoReal(admin) | Av.Presup | Actions(admin)
  const colCount = canEdit ? 12 : 10;

  const renderRow = (l: any, idx: number) => {
    if (canEdit) {
      return (
        <SovEditableRow
          key={l.id || l.line_number}
          line={l}
          isNew={String(l.id).startsWith("new-")}
          faseColor={faseColorMap[l.fase] || "bg-slate-200 text-slate-700"}
          totalBudget={totalBudget}
          gcFeePct={gcFeePct}
          onSave={handleSaveRow}
          onCancel={() => setNewRows((prev) => prev.filter((r) => r.id !== l.id))}
          onDelete={handleDeleteRow}
          onColorChange={handleColorChange}
          formatShortDate={formatShortDate}
          fmt={fmtCurrency}
          onEditStateChange={handleEditStateChange}
          selected={selectedIds.has(l.id || l.line_number)}
          onSelectToggle={handleSelectToggle}
          onFontColorChange={handleFontColorChange}
          legendLabels={colorLabels}
        />
      );
    }

    // Read-only row for portal
    const bp = calcBudgetProgress(l.real_cost || 0, l.progress_pct || 0, l.budget || 0);
    const feeAmount = (l.budget || 0) * (gcFeePct / 100);
    const overdueEnd = isOverdue(l.end_date, l.progress_pct || 0);

    return (
      <tr key={l.id || l.line_number} className={`${l.row_color ? '' : TR_STRIPE(idx)} border-b border-gray-100 transition-colors duration-200`} style={l.row_color ? { backgroundColor: l.row_color } : undefined}>
        <td className={`${TD_CLASS} font-mono text-gray-500 text-center`} style={{ width: 50 }}>{l.line_number}</td>
        <td className={TD_CLASS} style={{ width: 30 }}>
          {l.row_color ? (
            <div className="w-3 h-3 rounded-full border border-gray-300 mx-auto" style={{ backgroundColor: l.row_color }} />
          ) : (
            <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300 mx-auto" />
          )}
        </td>
        <td className={TD_CLASS} style={{ minWidth: 200 }}>
          <div className="leading-tight">
            <span className="font-medium" style={{ color: l.font_color || undefined }}>{l.name}</span>
            {l.subfase && <div className="text-[11px] text-gray-400 mt-0.5">{l.subfase}</div>}
          </div>
        </td>
        <td className={TD_CLASS} style={{ width: 100 }}>
          {l.fase ? (
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${faseColorMap[l.fase] || "bg-slate-200 text-slate-700"}`}>
              {l.fase}
            </span>
          ) : "—"}
        </td>
        <td className={`${TD_CLASS} text-gray-600 tabular-nums text-center`} style={{ width: 90 }}>{formatShortDate(l.start_date)}</td>
        <td className={`${TD_CLASS} tabular-nums text-center`} style={{ width: 90, color: overdueEnd ? "#DC2626" : undefined, fontWeight: overdueEnd ? 600 : undefined }}>{formatShortDate(l.end_date)}</td>
        <td className={`${TD_CLASS} text-center`} style={{ width: 80 }}><ProgressBar value={l.progress_pct || 0} color="bg-[#0D7377]" /></td>
        <td className={`${TD_CLASS} text-right text-gray-700 tabular-nums`} style={{ width: 110 }}>{fmtCurrency(l.budget)}</td>
        <td className={`${TD_CLASS} text-right tabular-nums`} style={{ width: 110 }}>{fmtCurrency(feeAmount)}</td>
        <td className={`${TD_CLASS}`} style={{ width: 100 }}>
          <ProgressBar value={Math.round(bp)} color={budgetBarColor(bp)} />
        </td>
      </tr>
    );
  };

  const renderFaseGroupHeader = (fase: string, count: number, avgPct: number) => (
    <tr key={`fase-${fase}`} className="bg-[#E8F4F4]">
      <td colSpan={colCount} className="px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase font-bold text-[#0D7377] tracking-wide">
            {fase} <span className="font-normal text-[#0D7377]/60 ml-2">{count} actividades</span>
          </span>
          <span className="text-[11px] font-semibold text-[#0D7377]">Av. Físico: {avgPct}%</span>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {showUpload && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-[#0F1B2D] text-white hover:bg-[#0F1B2D]/90 text-xs font-semibold uppercase tracking-wider rounded px-3 py-2">
              <Upload className="w-4 h-4 mr-2" />{uploading ? "Cargando..." : "Cargar SOV"}
            </Button>
          </>
        )}
        {showExport && sovLines.length > 0 && (
          <Button variant="outline" onClick={handleExport} className="text-xs font-semibold uppercase tracking-wider rounded px-3 py-2">
            <Download className="w-4 h-4 mr-2" />Exportar
          </Button>
        )}
        <Button
          variant={groupByFase ? "default" : "outline"}
          onClick={() => setGroupByFase(!groupByFase)}
          className={`text-xs font-semibold uppercase tracking-wider rounded px-3 py-2 ${groupByFase ? "bg-[#0D7377] text-white hover:bg-[#0a5c60]" : ""}`}
        >
          <Layers className="w-4 h-4 mr-2" />Agrupar por Fase
        </Button>
        {canEdit && (
          <SovColorLegend projectId={projectId} labels={colorLabels} onChange={setColorLabels} />
        )}
        {canEdit && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
            <span className="text-[11px] text-slate-600 font-medium">{selectedIds.size} seleccionados</span>
            <span className="text-[10px] text-slate-400">Colorear:</span>
            <div className="flex gap-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex || "none"}
                  onClick={() => handleBulkColor(c.hex)}
                  className="w-4 h-4 rounded border border-slate-300 hover:scale-125 transition-transform"
                  style={{ backgroundColor: c.hex || "#FFFFFF" }}
                  title={c.label}
                />
              ))}
            </div>
            <div className="border-l border-slate-300 mx-1 h-4" />
            <span className="text-[10px] text-slate-400">Texto:</span>
            <div className="flex gap-1">
              {FONT_COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex || "default"}
                  onClick={() => handleBulkFontColor(c.hex)}
                  className="w-4 h-4 rounded border border-slate-300 hover:scale-125 transition-transform flex items-center justify-center"
                  style={{ backgroundColor: c.hex || "#111827" }}
                  title={c.label}
                >
                  <span className="text-[7px] font-bold" style={{ color: c.hex === "#FFFFFF" ? "#333" : "#FFF" }}>A</span>
                </button>
              ))}
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-slate-400 hover:text-slate-600 ml-1">✕</button>
          </div>
        )}
      </div>

      {uploading && uploadProgress && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          {uploadProgress}
        </div>
      )}

      {/* Summary progress bar (portal only) */}
      {!canEdit && sovLines.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-[14px] font-bold text-[#0F1B2D] mb-2">Avance General del Proyecto</p>
          <div className="h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#0D7377] transition-all" style={{ width: `${Math.min(avgFisico, 100)}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {sovLines.filter(l => (l.progress_pct ?? 0) >= 100).length} de {sovLines.length} actividades completadas (100%) · Promedio: {avgFisico}%
          </p>
        </div>
      )}

      {!uploading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col" style={{ maxHeight: canEdit ? "calc(100vh - 220px)" : "none" }}>
          {/* Info bar */}
          <div className="px-4 py-1.5 text-[11px] text-gray-400 border-b border-gray-200 shrink-0">
            {dbRowCount} líneas en BD
            {allDisplayLines.length > 0 && !groupByFase && (
              <> · Mostrando {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, allDisplayLines.length)} de {allDisplayLines.length}</>
            )}
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1 relative">
            <table className="w-full text-[12px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={`${TH_CLASS} text-center`} style={{ width: 50 }}>#</th>
                  <th className={TH_CLASS} style={{ width: canEdit ? 60 : 30 }}>{canEdit ? "🎨" : ""}</th>
                  <th className={TH_CLASS} style={{ minWidth: 200 }}>Actividad</th>
                  <th className={TH_CLASS} style={{ width: 100 }}>Fase</th>
                  <th className={`${TH_CLASS} text-center`} style={{ width: 90 }}>Inicio</th>
                  <th className={`${TH_CLASS} text-center`} style={{ width: 90 }}>Fin</th>
                  <th className={`${TH_CLASS} text-center`} style={{ width: 80 }}>Av. Físico</th>
                  <th className={`${TH_CLASS} text-right`} style={{ width: 110 }}>Budget</th>
                  <th className={`${TH_CLASS} text-right`} style={{ width: 110, background: "rgba(13,115,119,0.08)" }}>
                    <span className="text-[#0D7377]">Constr. Fee</span>
                  </th>
                  {canEdit && <th className={`${TH_CLASS} text-right`} style={{ width: 110, background: "rgba(107,114,128,0.1)" }}>Costo Real</th>}
                  <th className={TH_CLASS} style={{ width: 100 }}>
                    <span className="flex items-center gap-1">Av. Presup. {canEdit && <span className="text-[10px] text-white/50 font-normal italic">ƒ auto</span>}</span>
                  </th>
                  {canEdit && <th className={TH_CLASS} style={{ width: 60 }}></th>}
                </tr>
              </thead>
              <tbody>
                {groupByFase && groupedDisplayData ? (
                  groupedDisplayData.map((group) => (
                    <>
                      {renderFaseGroupHeader(group.fase, group.count, group.avgFisico)}
                      {group.lines.map((l, idx) => renderRow(l, idx))}
                    </>
                  ))
                ) : (
                  pagedLines.map((l, idx) => renderRow(l, idx + page * ROWS_PER_PAGE))
                )}
                {allDisplayLines.length === 0 && (
                  <tr><td colSpan={colCount} className="text-center py-8 text-gray-400 text-[12px]">
                    {canEdit ? "No hay líneas SOV. Sube un archivo Excel para comenzar." : "Sin partidas"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary row */}
          {sovLines.length > 0 && (
            <div className="shrink-0 bg-[#0F1B2D] text-white text-[12px] font-bold">
              <div className="flex items-center">
                <div className="px-2 py-2 text-center" style={{ width: 50 }}>TOTAL</div>
                <div className="px-2 py-2" style={{ width: canEdit ? 60 : 30 }}>—</div>
                <div className="px-2 py-2" style={{ minWidth: 200 }}>—</div>
                <div className="px-2 py-2" style={{ width: 100 }}>—</div>
                <div className="px-2 py-2 text-center" style={{ width: 90 }}>—</div>
                <div className="px-2 py-2 text-center" style={{ width: 90 }}>—</div>
                <div className="px-2 py-2" style={{ width: 80 }}>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-teal-400" style={{ width: `${Math.min(avgFisico, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right tabular-nums text-[11px]">{avgFisico}%</span>
                  </div>
                </div>
                <div className="px-2 py-2 text-right tabular-nums" style={{ width: 110 }}>{fmtCurrency(totalBudget)}</div>
                <div className="px-2 py-2 text-right tabular-nums text-teal-300" style={{ width: 110 }}>{fmtCurrency(totalFeeAmount)}</div>
                {canEdit && <div className="px-2 py-2 text-right tabular-nums" style={{ width: 110 }}>{fmtCurrency(totalReal)}</div>}
                <div className="px-2 py-2" style={{ width: 100 }}>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${sumBudgetProgress > 100 ? "bg-red-400" : sumBudgetProgress > 85 ? "bg-orange-400" : "bg-green-400"}`} style={{ width: `${Math.min(sumBudgetProgress, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right tabular-nums text-[11px]">{sumBudgetProgress}%</span>
                  </div>
                </div>
                {canEdit && <div className="px-2 py-2" style={{ width: 60 }}></div>}
              </div>
            </div>
          )}

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-xs text-gray-500 shrink-0">
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" className="h-7 text-xs text-[#0D7377] border-[#0D7377]/30 hover:bg-[#E8F4F4]" onClick={handleAddRow}>
                    <Plus className="w-3.5 h-3.5 mr-1" />Agregar línea
                  </Button>
                  {editedRowIds.size >= 2 && (
                    <Button size="sm" className="h-7 text-xs bg-[#0D7377] hover:bg-[#0a5c60] text-white">
                      <Save className="w-3.5 h-3.5 mr-1" />Guardar todos los cambios
                    </Button>
                  )}
                </>
              )}
            </div>
            {!groupByFase && totalPages > 1 && (
              <div className="flex items-center gap-3">
                <span>{allDisplayLines.length} líneas totales</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-7 px-2 text-xs">
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />Anterior
                  </Button>
                  <span className="font-medium text-gray-700">Página {page + 1} de {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="h-7 px-2 text-xs">
                    Siguiente<ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SOVTable;
