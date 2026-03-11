import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Download, ChevronLeft, ChevronRight, Plus, Save, Layers, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, Search } from "lucide-react";
import * as XLSX from "xlsx";
import SovEditableRow from "@/components/admin/SovEditableRow";
import { COLOR_PRESETS, FONT_COLOR_PRESETS } from "@/components/admin/SovColorPicker";
import SovColorLegend, { loadColorLabels } from "@/components/admin/SovColorLegend";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
// Design tokens are defined inline (thBase, tdCell) for table-specific styling

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

const parsePercent = (value: any): { result: number; status: "normal" | "converted" | "capped" } => {
  if (value === null || value === undefined || value === "") return { result: 0, status: "normal" };
  const num = parseFloat(value);
  if (isNaN(num)) return { result: 0, status: "normal" };
  if (num >= 0 && num <= 1) return { result: Math.round(num * 100 * 10) / 10, status: num === 0 ? "normal" : "converted" };
  if (num > 1 && num <= 100) return { result: Math.round(num * 10) / 10, status: "normal" };
  if (num > 100) return { result: 100, status: "capped" };
  return { result: 0, status: "normal" };
};

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
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-[11px] font-semibold tabular-nums">{value}%</span>
    <div className="h-1 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  </div>
);


const budgetBarColor = (v: number) =>
  v > 100 ? "bg-[#DC2626]" : v > 85 ? "bg-[#E07B39]" : "bg-[#1A7A4A]";

// Sort types
type SortKey = "line_number" | "name" | "fase" | "start_date" | "end_date" | "progress_pct" | "budget" | "fee" | "real_cost" | "budget_progress_pct";
type SortDir = "asc" | "desc" | null;

interface SOVTableProps {
  projectId: string;
  canEdit: boolean;
  showUpload: boolean;
  showExport: boolean;
  gcFeePct?: number;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
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

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);
  const [selectedFases, setSelectedFases] = useState<Set<string>>(new Set());
  const [estadoAvance, setEstadoAvance] = useState<string>("todos");
  const [inicioDesde, setInicioDesde] = useState<Date | undefined>();
  const [inicioHasta, setInicioHasta] = useState<Date | undefined>();
  const [finDesde, setFinDesde] = useState<Date | undefined>();
  const [finHasta, setFinHasta] = useState<Date | undefined>();
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [avFisicoMin, setAvFisicoMin] = useState("");
  const [avFisicoMax, setAvFisicoMax] = useState("");

  useEffect(() => {
    if (projectId && canEdit) setColorLabels(loadColorLabels(projectId));
  }, [projectId, canEdit]);

  const faseColorMap = useMemo(() => {
    const unique = [...new Set(sovLines.map((l) => l.fase).filter(Boolean))];
    const map: Record<string, string> = {};
    unique.forEach((f, i) => { map[f] = FASE_COLORS[i % FASE_COLORS.length].bg; });
    return map;
  }, [sovLines]);

  const allFases = useMemo(() => [...new Set(sovLines.map(l => l.fase).filter(Boolean))].sort(), [sovLines]);

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
    let progressPct = line.progress_pct;
    if (progressPct > 0 && progressPct <= 1) {
      progressPct = Math.round(progressPct * 100);
      toast.info(`Valor convertido a ${progressPct}% (formato %)`);
    }
    progressPct = Math.max(0, Math.min(100, progressPct));
    const record = {
      project_id: projectId,
      line_number: line.line_number,
      name: line.name,
      fase: line.fase,
      subfase: line.subfase,
      start_date: line.start_date,
      end_date: line.end_date,
      progress_pct: progressPct,
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
      // Skip note rows at top (yellow instruction rows in template)
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const normalized = (rows[i] ?? []).map(normalizeHeader);
        if (normalized.includes("linea") && normalized.includes("nombre_actividad")) {
          headerRowIdx = i;
          break;
        }
      }
      const normalizedHeaders = (rows[headerRowIdx] ?? []).map(normalizeHeader);
      // Also match headers with "(0-100)" suffix
      const headerIndex = Object.fromEntries(requiredHeaders.map((k) => {
        let idx = normalizedHeaders.indexOf(k);
        if (idx === -1) idx = normalizedHeaders.findIndex(h => h.startsWith(k));
        return [k, idx];
      })) as Record<string, number>;
      const missing = requiredHeaders.filter((k) => headerIndex[k] === -1);
      if (missing.length) { toast.error(`Faltan columnas: ${missing.join(", ")}`); return; }

      const dataRows = rows.slice(headerRowIdx + 1).filter((r) => r.some((c: any) => c != null && String(c).trim() !== ""));

      let anyConverted = false;
      let anyCapped = false;

      const recordsByLine = new Map<string, any>();
      for (const r of dataRows) {
        const ln = String(r[headerIndex.linea] ?? "").trim();
        if (!ln) continue;
        const afParsed = parsePercent(r[headerIndex.avance_fisico]);
        const apParsed = parsePercent(r[headerIndex.avance_presupuesto]);
        if (afParsed.status === "converted" || apParsed.status === "converted") anyConverted = true;
        if (afParsed.status === "capped" || apParsed.status === "capped") anyCapped = true;
        recordsByLine.set(ln, {
          project_id: projectId, line_number: ln,
          name: String(r[headerIndex.nombre_actividad] ?? "").trim(),
          fase: r[headerIndex.fase] != null ? String(r[headerIndex.fase]).trim() : null,
          subfase: r[headerIndex.subfase] != null ? String(r[headerIndex.subfase]).trim() : null,
          start_date: parseDate(r[headerIndex.fecha_inicio]),
          end_date: parseDate(r[headerIndex.fecha_fin]),
          progress_pct: clamp(Math.round(afParsed.result)),
          budget: parseNumericValue(r[headerIndex.budget]),
          real_cost: parseNumericValue(r[headerIndex.costo_real]),
          budget_progress_pct: clamp(Math.round(apParsed.result)),
          updated_at: new Date().toISOString(),
        });
      }
      const records = Array.from(recordsByLine.values());
      const dupes = dataRows.length - records.length;
      if (!records.length) { toast.error("No se encontraron líneas válidas."); return; }

      if (anyConverted) toast.info("⚠️ Valores decimales (0-1) convertidos automáticamente a porcentaje (0-100).");
      if (anyCapped) toast.warning("⚠️ Algunos valores > 100% fueron ajustados a 100%.");

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
      "avance_fisico (0-100)": l.progress_pct || 0, budget: l.budget || 0,
      costo_real: l.real_cost || 0, "avance_presupuesto (0-100)": l.budget_progress_pct || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wbOut = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbOut, ws, "SOV");
    XLSX.writeFile(wbOut, `SOV_export.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const noteRow = {
      linea: "IMPORTANTE: Ingresa el avance como número entre 0 y 100. Ejemplo: 85 = 85%",
      nombre_actividad: "", fase: "", subfase: "",
      fecha_inicio: "", fecha_fin: "",
      "avance_fisico (0-100)": "", budget: "",
      costo_real: "", "avance_presupuesto (0-100)": "",
    };
    const exampleRow = {
      linea: "1", nombre_actividad: "Ejemplo Actividad", fase: "Estructura", subfase: "",
      fecha_inicio: "2025-01-15", fecha_fin: "2025-03-30",
      "avance_fisico (0-100)": 85, budget: 50000,
      costo_real: 42000, "avance_presupuesto (0-100)": 0,
    };
    const ws = XLSX.utils.json_to_sheet([noteRow, exampleRow]);
    // Style note row yellow
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
      if (cell) cell.s = { fill: { fgColor: { rgb: "FFFF00" } }, font: { bold: true } };
    }
    const wbOut = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbOut, ws, "SOV");
    XLSX.writeFile(wbOut, "SOV_plantilla.xlsx");
  };

  // ── Sorting logic ──
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="w-3 h-3 text-gray-400 ml-1 inline shrink-0" />;
    if (sortDir === "asc") return <ArrowUp className="w-3 h-3 text-white ml-1 inline shrink-0" />;
    return <ArrowDown className="w-3 h-3 text-white ml-1 inline shrink-0" />;
  };

  // ── Filter logic ──
  const todayStr = new Date().toISOString().split("T")[0];

  const hasActiveFilters = useMemo(() => {
    return debouncedSearch !== "" ||
      selectedFases.size > 0 ||
      estadoAvance !== "todos" ||
      !!inicioDesde || !!inicioHasta ||
      !!finDesde || !!finHasta ||
      budgetMin !== "" || budgetMax !== "" ||
      avFisicoMin !== "" || avFisicoMax !== "";
  }, [debouncedSearch, selectedFases, estadoAvance, inicioDesde, inicioHasta, finDesde, finHasta, budgetMin, budgetMax, avFisicoMin, avFisicoMax]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count++;
    if (selectedFases.size > 0) count++;
    if (estadoAvance !== "todos") count++;
    if (inicioDesde || inicioHasta) count++;
    if (finDesde || finHasta) count++;
    if (budgetMin || budgetMax) count++;
    if (avFisicoMin || avFisicoMax) count++;
    return count;
  }, [debouncedSearch, selectedFases, estadoAvance, inicioDesde, inicioHasta, finDesde, finHasta, budgetMin, budgetMax, avFisicoMin, avFisicoMax]);

  const clearAllFilters = () => {
    setSearchText("");
    setSelectedFases(new Set());
    setEstadoAvance("todos");
    setInicioDesde(undefined);
    setInicioHasta(undefined);
    setFinDesde(undefined);
    setFinHasta(undefined);
    setBudgetMin("");
    setBudgetMax("");
    setAvFisicoMin("");
    setAvFisicoMax("");
    setPage(0);
  };

  const toggleFase = (fase: string) => {
    setSelectedFases(prev => {
      const next = new Set(prev);
      if (next.has(fase)) next.delete(fase); else next.add(fase);
      return next;
    });
    setPage(0);
  };

  // Active filter pills
  const activeFilterPills = useMemo(() => {
    const pills: { label: string; clear: () => void }[] = [];
    if (debouncedSearch) pills.push({ label: `Buscar: "${debouncedSearch}"`, clear: () => setSearchText("") });
    if (selectedFases.size > 0) pills.push({ label: `Fase: ${[...selectedFases].join(", ")}`, clear: () => setSelectedFases(new Set()) });
    if (estadoAvance !== "todos") {
      const labels: Record<string, string> = { sin_iniciar: "Sin iniciar", en_progreso: "En progreso", completado: "Completado", vencido: "Vencido" };
      pills.push({ label: labels[estadoAvance] || estadoAvance, clear: () => setEstadoAvance("todos") });
    }
    if (inicioDesde || inicioHasta) pills.push({ label: `Inicio: ${inicioDesde ? format(inicioDesde, "MM/dd/yy") : "..."} – ${inicioHasta ? format(inicioHasta, "MM/dd/yy") : "..."}`, clear: () => { setInicioDesde(undefined); setInicioHasta(undefined); } });
    if (finDesde || finHasta) pills.push({ label: `Fin: ${finDesde ? format(finDesde, "MM/dd/yy") : "..."} – ${finHasta ? format(finHasta, "MM/dd/yy") : "..."}`, clear: () => { setFinDesde(undefined); setFinHasta(undefined); } });
    if (budgetMin || budgetMax) pills.push({ label: `Budget: ${budgetMin ? `$${budgetMin}` : "..."} – ${budgetMax ? `$${budgetMax}` : "..."}`, clear: () => { setBudgetMin(""); setBudgetMax(""); } });
    if (avFisicoMin || avFisicoMax) pills.push({ label: `Av. Físico: ${avFisicoMin || "0"}% – ${avFisicoMax || "100"}%`, clear: () => { setAvFisicoMin(""); setAvFisicoMax(""); } });
    return pills;
  }, [debouncedSearch, selectedFases, estadoAvance, inicioDesde, inicioHasta, finDesde, finHasta, budgetMin, budgetMax, avFisicoMin, avFisicoMax]);

  // ── Build filtered + sorted display list ──
  const allRawLines = useMemo(() => [...sovLines, ...newRows], [sovLines, newRows]);

  const filteredLines = useMemo(() => {
    let lines = allRawLines;

    // Text search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      lines = lines.filter(l => (l.name || "").toLowerCase().includes(q) || (l.subfase || "").toLowerCase().includes(q));
    }

    // Fase filter
    if (selectedFases.size > 0) {
      lines = lines.filter(l => selectedFases.has(l.fase || ""));
    }

    // Estado avance
    if (estadoAvance === "sin_iniciar") lines = lines.filter(l => (l.progress_pct || 0) === 0);
    else if (estadoAvance === "en_progreso") lines = lines.filter(l => (l.progress_pct || 0) > 0 && (l.progress_pct || 0) < 100);
    else if (estadoAvance === "completado") lines = lines.filter(l => (l.progress_pct || 0) >= 100);
    else if (estadoAvance === "vencido") lines = lines.filter(l => l.end_date && l.end_date < todayStr && (l.progress_pct || 0) < 100);

    // Inicio range
    if (inicioDesde) {
      const ds = format(inicioDesde, "yyyy-MM-dd");
      lines = lines.filter(l => l.start_date && l.start_date >= ds);
    }
    if (inicioHasta) {
      const ds = format(inicioHasta, "yyyy-MM-dd");
      lines = lines.filter(l => l.start_date && l.start_date <= ds);
    }

    // Fin range
    if (finDesde) {
      const ds = format(finDesde, "yyyy-MM-dd");
      lines = lines.filter(l => l.end_date && l.end_date >= ds);
    }
    if (finHasta) {
      const ds = format(finHasta, "yyyy-MM-dd");
      lines = lines.filter(l => l.end_date && l.end_date <= ds);
    }

    // Budget range
    if (budgetMin) {
      const min = parseFloat(budgetMin);
      if (!isNaN(min)) lines = lines.filter(l => (l.budget || 0) >= min);
    }
    if (budgetMax) {
      const max = parseFloat(budgetMax);
      if (!isNaN(max)) lines = lines.filter(l => (l.budget || 0) <= max);
    }

    // Av Fisico range
    if (avFisicoMin) {
      const min = parseFloat(avFisicoMin);
      if (!isNaN(min)) lines = lines.filter(l => (l.progress_pct || 0) >= min);
    }
    if (avFisicoMax) {
      const max = parseFloat(avFisicoMax);
      if (!isNaN(max)) lines = lines.filter(l => (l.progress_pct || 0) <= max);
    }

    return lines;
  }, [allRawLines, debouncedSearch, selectedFases, estadoAvance, inicioDesde, inicioHasta, finDesde, finHasta, budgetMin, budgetMax, avFisicoMin, avFisicoMax, todayStr]);

  const sortedLines = useMemo(() => {
    if (!sortKey || !sortDir) return filteredLines;
    const sorted = [...filteredLines];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "line_number": va = parseFloat(a.line_number) || 0; vb = parseFloat(b.line_number) || 0; break;
        case "name": va = (a.name || "").toLowerCase(); vb = (b.name || "").toLowerCase(); break;
        case "fase": va = (a.fase || "").toLowerCase(); vb = (b.fase || "").toLowerCase(); break;
        case "start_date": va = a.start_date || ""; vb = b.start_date || ""; break;
        case "end_date": va = a.end_date || ""; vb = b.end_date || ""; break;
        case "progress_pct": va = a.progress_pct || 0; vb = b.progress_pct || 0; break;
        case "budget": va = a.budget || 0; vb = b.budget || 0; break;
        case "fee": va = (a.budget || 0) * gcFeePct / 100; vb = (b.budget || 0) * gcFeePct / 100; break;
        case "real_cost": va = a.real_cost || 0; vb = b.real_cost || 0; break;
        case "budget_progress_pct": va = calcBudgetProgress(a.real_cost || 0, a.progress_pct || 0, a.budget || 0); vb = calcBudgetProgress(b.real_cost || 0, b.progress_pct || 0, b.budget || 0); break;
        default: va = 0; vb = 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return sorted;
  }, [filteredLines, sortKey, sortDir, gcFeePct]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [debouncedSearch, selectedFases, estadoAvance, inicioDesde, inicioHasta, finDesde, finHasta, budgetMin, budgetMax, avFisicoMin, avFisicoMax]);

  const groupedDisplayData = useMemo(() => {
    if (!groupByFase) return null;
    const groups: { fase: string; lines: any[]; avgFisico: number; count: number }[] = [];
    const faseMap = new Map<string, any[]>();
    for (const l of sortedLines) {
      const f = l.fase || "Sin Fase";
      if (!faseMap.has(f)) faseMap.set(f, []);
      faseMap.get(f)!.push(l);
    }
    for (const [fase, lines] of faseMap) {
      const avg = lines.length > 0 ? Math.round(lines.reduce((a, c) => a + (c.progress_pct || 0), 0) / lines.length) : 0;
      groups.push({ fase, lines, avgFisico: avg, count: lines.length });
    }
    return groups;
  }, [groupByFase, sortedLines]);

  const totalPages = Math.max(1, Math.ceil(sortedLines.length / ROWS_PER_PAGE));
  const pagedLines = groupByFase ? sortedLines : sortedLines.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  // Totals computed from FILTERED lines
  const filteredTotalBudget = useMemo(() => filteredLines.reduce((a, c) => a + (c.budget || 0), 0), [filteredLines]);
  const filteredTotalReal = useMemo(() => filteredLines.reduce((a, c) => a + (c.real_cost || 0), 0), [filteredLines]);
  const filteredLinesWithBudget = useMemo(() => filteredLines.filter(l => (l.budget || 0) > 0), [filteredLines]);
  const filteredTotalBudgetPositive = useMemo(() => filteredLinesWithBudget.reduce((a, c) => a + (c.budget || 0), 0), [filteredLinesWithBudget]);
  const filteredAvgFisico = useMemo(() =>
    filteredTotalBudgetPositive > 0
      ? Math.round(filteredLinesWithBudget.reduce((a, c) => a + ((c.progress_pct || 0) * (c.budget || 0)), 0) / filteredTotalBudgetPositive * 100) / 100
      : 0,
    [filteredLinesWithBudget, filteredTotalBudgetPositive]
  );
  const filteredSumBudgetProgress = useMemo(() =>
    filteredTotalBudgetPositive > 0
      ? Math.round(filteredLinesWithBudget.reduce((a, c) => a + ((c.real_cost || 0) * ((c.progress_pct || 0) / 100)), 0) / filteredTotalBudgetPositive * 100 * 100) / 100
      : 0,
    [filteredLinesWithBudget, filteredTotalBudgetPositive]
  );
  const filteredTotalFeeAmount = useMemo(() => filteredLines.reduce((a, c) => a + ((c.budget || 0) * (gcFeePct / 100)), 0), [filteredLines, gcFeePct]);

  // For the portal summary bar, use ALL lines (not filtered)
  const allAvgFisico = useMemo(() => {
    const lwb = sovLines.filter(l => (l.budget || 0) > 0);
    const tb = lwb.reduce((a, c) => a + (c.budget || 0), 0);
    return tb > 0 ? Math.round(lwb.reduce((a, c) => a + ((c.progress_pct || 0) * (c.budget || 0)), 0) / tb * 100) / 100 : 0;
  }, [sovLines]);

  const colCount = canEdit ? 12 : 10;

  const thBase = "h-[44px] text-[11px] uppercase tracking-[0.05em] font-bold text-white bg-[#0F1B2D] sticky top-0 z-10 px-3 py-2 border-b-2 border-[#0D7377] whitespace-nowrap";

  const renderSortableHeader = (label: string, key: SortKey, align?: "center" | "right" | "left", style?: React.CSSProperties) => {
    const isActive = sortKey === key;
    return (
      <th
        className={`${thBase} cursor-pointer select-none hover:bg-[#1a2f4a] transition-colors ${isActive ? "!bg-[#0D7377]" : ""} ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}`}
        style={style}
        onClick={() => handleSort(key)}
      >
        <span className="inline-flex items-center gap-0.5">
          {label}<SortIcon columnKey={key} />
        </span>
      </th>
    );
  };

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

    const bp = calcBudgetProgress(l.real_cost || 0, l.progress_pct || 0, l.budget || 0);
    const feeAmount = (l.budget || 0) * (gcFeePct / 100);
    const overdueEnd = isOverdue(l.end_date, l.progress_pct || 0);

    const tdCell = "px-3 py-2 text-[12px]";

    return (
      <tr key={l.id || l.line_number} className={`${l.row_color ? '' : (idx % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]")} border-b border-[#F3F4F6] hover:bg-[#EFF6FF] transition-colors`} style={{ height: 36, ...(l.row_color ? { backgroundColor: l.row_color } : {}) }}>
        <td className={`${tdCell} font-mono text-gray-500 text-center`} style={{ width: 48 }}>{l.line_number}</td>
        <td className={tdCell} style={{ width: 36 }}>
          {l.row_color ? (
            <div className="w-3 h-3 rounded-full border border-gray-300 mx-auto" style={{ backgroundColor: l.row_color }} />
          ) : (
            <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300 mx-auto" />
          )}
        </td>
        <td className={`${tdCell} text-left`} style={{ minWidth: 180 }}>
          <div className="leading-tight">
            <span className="font-medium" style={{ color: l.font_color || undefined }}>{l.name}</span>
            {l.subfase && <div className="text-[11px] text-gray-400 mt-0.5">{l.subfase}</div>}
          </div>
        </td>
        <td className={`${tdCell} text-center`} style={{ width: 110 }}>
          {l.fase ? (
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${faseColorMap[l.fase] || "bg-slate-200 text-slate-700"}`}>
              {l.fase}
            </span>
          ) : "—"}
        </td>
        <td className={`${tdCell} text-gray-600 tabular-nums text-center`} style={{ width: 90 }}>{formatShortDate(l.start_date)}</td>
        <td className={`${tdCell} tabular-nums text-center`} style={{ width: 90, color: overdueEnd ? "#DC2626" : undefined, fontWeight: overdueEnd ? 600 : undefined }}>{formatShortDate(l.end_date)}</td>
        <td className={`${tdCell} text-center`} style={{ width: 88, backgroundColor: (l.progress_pct || 0) > 100 ? "rgba(234,179,8,0.15)" : undefined }}>
          <ProgressBar value={Math.min(l.progress_pct || 0, 100)} color={l.progress_pct >= 100 ? "bg-[#1A7A4A]" : "bg-[#0D7377]"} />
        </td>
        <td className={`${tdCell} text-right text-gray-700 tabular-nums`} style={{ width: 120 }}>{fmtCurrency(l.budget)}</td>
        <td className={`${tdCell} text-right tabular-nums text-[#0D7377]`} style={{ width: 120 }}>{fmtCurrency(feeAmount)}</td>
        <td className={`${tdCell} text-center bg-gray-50`} style={{ width: 100 }}>
          <ProgressBar value={Math.round(bp)} color={budgetBarColor(bp)} />
        </td>
      </tr>
    );
  };

  const renderFaseGroupHeader = (fase: string, count: number, avgPct: number) => {
    const faseBudget = sortedLines.filter(l => (l.fase || "Sin Fase") === fase).reduce((a, c) => a + (c.budget || 0), 0);
    return (
      <tr key={`fase-${fase}`} className="bg-[#1a2f4a]" style={{ height: 32 }}>
        <td colSpan={colCount} className="px-3 py-1.5" style={{ borderLeft: "4px solid #0D7377" }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-white tracking-wide">
              {fase} <span className="font-normal text-white/50 ml-2">— {count} líneas — {fmtCurrency(faseBudget)}</span>
            </span>
            <span className="text-[11px] font-semibold text-white/80">Av. Físico: {avgPct}%</span>
          </div>
        </td>
      </tr>
    );
  };

  const DatePickerFilter = ({ value, onChange, placeholder }: { value: Date | undefined; onChange: (d: Date | undefined) => void; placeholder: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-8 text-xs justify-start w-[120px]", !value && "text-muted-foreground")}>
          {value ? format(value, "MM/dd/yy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
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
        {showUpload && (
          <Button variant="outline" onClick={handleDownloadTemplate} className="text-xs font-semibold uppercase tracking-wider rounded px-3 py-2">
            <Download className="w-4 h-4 mr-2" />Plantilla
          </Button>
        )}
        <Button
          variant={groupByFase ? "default" : "outline"}
          onClick={() => setGroupByFase(!groupByFase)}
          className={`text-xs font-semibold uppercase tracking-wider rounded px-3 py-2 ${groupByFase ? "bg-[#0D7377] text-white hover:bg-[#0a5c60]" : ""}`}
        >
          <Layers className="w-4 h-4 mr-2" />Agrupar por Fase
        </Button>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className={`text-xs font-semibold uppercase tracking-wider rounded px-3 py-2 relative ${showFilters ? "bg-[#0D7377] text-white hover:bg-[#0a5c60]" : ""}`}
        >
          <Filter className="w-4 h-4 mr-2" />Filtrar
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#DC2626] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
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

      {/* Filter bar */}
      {showFilters && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200" style={{ marginBottom: 12 }}>
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar actividad o subfase..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 h-9 text-[13px] border-[#D1D5DB] rounded-md focus:border-[#0D7377] focus:ring-[#0D7377]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Fase multi-select */}
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold mb-1 block">Fase</label>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {allFases.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleFase(f)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      selectedFases.has(f)
                        ? "bg-[#E8F4F4] border-[#0D7377] text-[#0D7377] font-semibold"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
                {allFases.length === 0 && <span className="text-[10px] text-gray-400">Sin fases</span>}
              </div>
            </div>

            {/* Estado avance */}
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold mb-1 block">Estado avance</label>
              <select
                value={estadoAvance}
                onChange={(e) => { setEstadoAvance(e.target.value); setPage(0); }}
                className="h-8 text-xs border border-gray-200 rounded-md px-2 w-full bg-white"
              >
                <option value="todos">Todos</option>
                <option value="sin_iniciar">Sin iniciar (0%)</option>
                <option value="en_progreso">En progreso (1-99%)</option>
                <option value="completado">Completado (100%)</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>

            {/* Inicio date range */}
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold mb-1 block">Inicio</label>
              <div className="flex items-center gap-1.5">
                <DatePickerFilter value={inicioDesde} onChange={(d) => { setInicioDesde(d); setPage(0); }} placeholder="Desde" />
                <span className="text-gray-400 text-xs">–</span>
                <DatePickerFilter value={inicioHasta} onChange={(d) => { setInicioHasta(d); setPage(0); }} placeholder="Hasta" />
              </div>
            </div>

            {/* Fin date range */}
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold mb-1 block">Fin</label>
              <div className="flex items-center gap-1.5">
                <DatePickerFilter value={finDesde} onChange={(d) => { setFinDesde(d); setPage(0); }} placeholder="Desde" />
                <span className="text-gray-400 text-xs">–</span>
                <DatePickerFilter value={finHasta} onChange={(d) => { setFinHasta(d); setPage(0); }} placeholder="Hasta" />
              </div>
            </div>

            {/* Budget range */}
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold mb-1 block">Budget</label>
              <div className="flex items-center gap-1.5">
                <Input placeholder="Min $" value={budgetMin} onChange={(e) => { setBudgetMin(e.target.value); setPage(0); }} className="h-8 text-xs w-24" type="number" />
                <span className="text-gray-400 text-xs">–</span>
                <Input placeholder="Max $" value={budgetMax} onChange={(e) => { setBudgetMax(e.target.value); setPage(0); }} className="h-8 text-xs w-24" type="number" />
              </div>
            </div>

            {/* Av Físico range */}
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold mb-1 block">Av. Físico</label>
              <div className="flex items-center gap-1.5">
                <Input placeholder="Min %" value={avFisicoMin} onChange={(e) => { setAvFisicoMin(e.target.value); setPage(0); }} className="h-8 text-xs w-24" type="number" />
                <span className="text-gray-400 text-xs">–</span>
                <Input placeholder="Max %" value={avFisicoMax} onChange={(e) => { setAvFisicoMax(e.target.value); setPage(0); }} className="h-8 text-xs w-24" type="number" />
              </div>
            </div>
          </div>

          {/* Bottom bar: clear + count */}
          <div className="flex items-center justify-between">
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-gray-700 h-7">
                <X className="w-3 h-3 mr-1" />Limpiar filtros
              </Button>
            ) : <div />}
            <span className="text-[12px] text-gray-500">
              Mostrando {filteredLines.length} de {allRawLines.length} líneas
            </span>
          </div>
        </div>
      )}

      {/* Active filter pills */}
      {hasActiveFilters && activeFilterPills.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterPills.map((pill, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-[#E0F7FA] border border-[#0D7377] text-[#0D7377] text-[11px] font-medium px-2 py-0.5 rounded-full">
              {pill.label}
              <button onClick={() => { pill.clear(); setPage(0); }} className="hover:bg-[#B2DFDB] rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {activeFilterPills.length > 1 && (
            <button onClick={clearAllFilters} className="text-[10px] text-gray-400 hover:text-gray-600 underline">Limpiar todos</button>
          )}
        </div>
      )}

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
            <div className="h-full rounded-full bg-[#0D7377] transition-all" style={{ width: `${Math.min(allAvgFisico, 100)}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {sovLines.filter(l => (l.progress_pct ?? 0) >= 100).length} de {sovLines.length} actividades completadas (100%) · Promedio: {allAvgFisico}%
          </p>
        </div>
      )}

      {!uploading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col" style={{ maxHeight: canEdit ? "calc(100vh - 220px)" : "none" }}>
          {/* Info bar */}
          <div className="px-4 py-1.5 text-[11px] text-gray-400 border-b border-gray-200 shrink-0">
            {dbRowCount} líneas en BD
            {hasActiveFilters && <> · <span className="text-[#0D7377] font-medium">Filtrado: {filteredLines.length} de {allRawLines.length}</span></>}
            {sortedLines.length > 0 && !groupByFase && (
              <> · Mostrando {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, sortedLines.length)} de {sortedLines.length}</>
            )}
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1 relative">
            <table className="w-full text-[12px] border-collapse table-fixed" style={{ fontFamily: "Arial, sans-serif" }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  {renderSortableHeader("#", "line_number", "center", { width: 48 })}
                  <th className={`${thBase}`} style={{ width: canEdit ? 60 : 36 }}>{canEdit ? "🎨" : ""}</th>
                  {renderSortableHeader("Actividad", "name", "left", { minWidth: 180 })}
                  {renderSortableHeader("Fase", "fase", "center", { width: 110 })}
                  {renderSortableHeader("Inicio", "start_date", "center", { width: 90 })}
                  {renderSortableHeader("Fin", "end_date", "center", { width: 90 })}
                  {renderSortableHeader("Av. Físico", "progress_pct", "center", { width: 88 })}
                  {renderSortableHeader("Budget", "budget", "right", { width: 120 })}
                  {renderSortableHeader("Constr. Fee", "fee", "right", { width: 120 })}
                  {canEdit && renderSortableHeader("Costo Real", "real_cost", "right", { width: 120 })}
                  {renderSortableHeader("Av. Presup.", "budget_progress_pct", "center", { width: 100 })}
                  {canEdit && <th className={thBase} style={{ width: 56 }}></th>}
                </tr>
              </thead>
              <tbody>
                {groupByFase && groupedDisplayData ? (
                  groupedDisplayData.map((group) => (
                    <>{renderFaseGroupHeader(group.fase, group.count, group.avgFisico)}{group.lines.map((l, idx) => renderRow(l, idx))}</>
                  ))
                ) : (
                  pagedLines.map((l, idx) => renderRow(l, idx + page * ROWS_PER_PAGE))
                )}
                {sortedLines.length === 0 && (
                  <tr><td colSpan={colCount} className="text-center py-8 text-gray-400 text-[12px]">
                    {hasActiveFilters ? "No hay líneas que coincidan con los filtros." : canEdit ? "No hay líneas SOV. Sube un archivo Excel para comenzar." : "Sin partidas"}
                  </td></tr>
                )}
              </tbody>
              {/* Totals row as tfoot for perfect alignment */}
              {filteredLines.length > 0 && (
                <tfoot>
                  <tr className="bg-[#0F1B2D] text-white text-[12px] font-bold border-t-2 border-[#0D7377]" style={{ height: 44 }}>
                    <td className="px-3 py-2 text-left text-[10px] font-bold uppercase" style={{ width: 48 }}>TOTAL</td>
                    <td className="px-3 py-2 text-center text-gray-500" style={{ width: canEdit ? 60 : 36 }}>—</td>
                    <td className="px-3 py-2 text-left text-gray-300 text-[11px] font-normal" style={{ minWidth: 180 }}>{filteredLines.length} líneas</td>
                    <td className="px-3 py-2 text-center text-gray-500" style={{ width: 110 }}>—</td>
                    <td className="px-3 py-2 text-center text-gray-500" style={{ width: 90 }}>—</td>
                    <td className="px-3 py-2 text-center text-gray-500" style={{ width: 90 }}>—</td>
                    <td className="px-3 py-2 text-center" style={{ width: 88 }}>
                      <span className="tabular-nums">{filteredAvgFisico}%</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ width: 120 }}>{fmtCurrency(filteredTotalBudget)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-teal-300" style={{ width: 120 }}>{fmtCurrency(filteredTotalFeeAmount)}</td>
                    {canEdit && <td className="px-3 py-2 text-right tabular-nums" style={{ width: 120 }}>{fmtCurrency(filteredTotalReal)}</td>}
                    <td className="px-3 py-2 text-center tabular-nums" style={{ width: 100 }}>{filteredSumBudgetProgress}%</td>
                    {canEdit && <td className="px-3 py-2" style={{ width: 56 }}></td>}
                  </tr>
                  {hasActiveFilters && (
                    <tr className="bg-[#0F1B2D]">
                      <td colSpan={colCount} className="px-4 py-1 text-[10px] text-gray-400 italic">
                        * Totales calculados sobre {filteredLines.length} líneas filtradas de {allRawLines.length} líneas totales
                      </td>
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] bg-white text-xs text-gray-500 shrink-0">
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
              {!canEdit && <span>{sortedLines.length} líneas totales</span>}
            </div>
            {!groupByFase && totalPages > 1 && (
              <div className="flex items-center gap-4">
                <span className="text-gray-400">{sortedLines.length} líneas{hasActiveFilters ? " filtradas" : " totales"}</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-7 px-2.5 text-xs">
                    <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />Anterior
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`h-7 w-7 p-0 text-xs ${page === pageNum ? "bg-[#0F1B2D] text-white hover:bg-[#1a2f4a]" : ""}`}
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="h-7 px-2.5 text-xs">
                    Siguiente<ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
                <span className="text-gray-400">Página {page + 1} de {totalPages}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SOVTable;
