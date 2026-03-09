import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Download, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";

const ROWS_PER_PAGE = 50;
const INSERT_CHUNK = 50;

const FASE_COLORS = [
  { bg: "bg-teal-100 text-teal-800", label: "teal" },
  { bg: "bg-blue-950/10 text-blue-950", label: "navy" },
  { bg: "bg-orange-100 text-orange-800", label: "orange" },
  { bg: "bg-purple-100 text-purple-800", label: "purple" },
  { bg: "bg-green-100 text-green-800", label: "green" },
  { bg: "bg-slate-200 text-slate-700", label: "slate" },
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
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
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
  return `${parts[1]}/${parts[2]}`;
};

const fmt = (v: number | null) =>
  v != null ? v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }) : "—";

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-1.5">
    <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <span className="text-[11px] font-semibold w-10 text-right tabular-nums">{value}%</span>
  </div>
);

const SovSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [sovLines, setSovLines] = useState<any[]>([]);
  const [dbRowCount, setDbRowCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [page, setPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("projects").select("id, code, address").then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

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
  };

  const fetchDbCount = async (pid: string) => {
    const { count } = await supabase
      .from("sov_lines").select("id", { count: "exact", head: true }).eq("project_id", pid);
    setDbRowCount(count ?? 0);
  };

  useEffect(() => {
    if (selectedProjectId) {
      void Promise.all([fetchLines(selectedProjectId), fetchDbCount(selectedProjectId)]);
    } else {
      setSovLines([]);
      setDbRowCount(0);
    }
  }, [selectedProjectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
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
      const recordsByLine = new Map<string, any>();
      for (const r of dataRows) {
        const ln = String(r[headerIndex.linea] ?? "").trim();
        if (!ln) continue;
        recordsByLine.set(ln, {
          project_id: selectedProjectId, line_number: ln,
          name: String(r[headerIndex.nombre_actividad] ?? "").trim(),
          fase: r[headerIndex.fase] != null ? String(r[headerIndex.fase]).trim() : null,
          subfase: r[headerIndex.subfase] != null ? String(r[headerIndex.subfase]).trim() : null,
          start_date: parseDate(r[headerIndex.fecha_inicio]),
          end_date: parseDate(r[headerIndex.fecha_fin]),
          progress_pct: clamp(parseNumericValue(r[headerIndex.avance_fisico])),
          budget: parseNumericValue(r[headerIndex.budget]),
          real_cost: parseNumericValue(r[headerIndex.costo_real]),
          budget_progress_pct: parseNumericValue(r[headerIndex.avance_presupuesto]),
          updated_at: new Date().toISOString(),
        });
      }
      const records = Array.from(recordsByLine.values());
      const dupes = dataRows.length - records.length;
      if (!records.length) { toast.error("No se encontraron líneas válidas."); return; }

      setUploadProgress("Eliminando líneas anteriores...");
      const { error: delErr } = await supabase.from("sov_lines").delete().eq("project_id", selectedProjectId);
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
      await supabase.from("projects").update({ progress_pct: avg }).eq("id", selectedProjectId);
      await Promise.all([fetchLines(selectedProjectId), fetchDbCount(selectedProjectId)]);
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
    const proj = projects.find((p) => p.id === selectedProjectId);
    XLSX.writeFile(wbOut, `SOV_${proj?.code || "export"}.xlsx`);
  };

  const totalPages = Math.max(1, Math.ceil(sovLines.length / ROWS_PER_PAGE));
  const pagedLines = sovLines.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  const totalBudget = sovLines.reduce((a, c) => a + (c.budget || 0), 0);
  const totalReal = sovLines.reduce((a, c) => a + (c.real_cost || 0), 0);
  const avgFisico = sovLines.length ? Math.round(sovLines.reduce((a, c) => a + (c.progress_pct || 0), 0) / sovLines.length) : 0;
  const avgBudget = sovLines.length ? Math.round(sovLines.reduce((a, c) => a + (c.budget_progress_pct || 0), 0) / sovLines.length) : 0;

  const budgetBarColor = (v: number) => (v > 100 ? "bg-red-500" : v > 85 ? "bg-orange-500" : "bg-green-500");

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">Avance SOV</h2>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-full max-w-md">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.code} - {p.address}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProjectId && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-[#0F1B2D] text-white hover:bg-[#0F1B2D]/90">
              <Upload className="w-4 h-4 mr-2" />{uploading ? "Cargando..." : "Cargar SOV"}
            </Button>
            {sovLines.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />Exportar
              </Button>
            )}
          </>
        )}
      </div>

      {uploading && uploadProgress && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          {uploadProgress}
        </div>
      )}

      {selectedProjectId && !uploading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col" style={{ maxHeight: "calc(100vh - 220px)" }}>
          {/* Info bar */}
          <div className="px-4 py-1.5 text-xs text-slate-500 border-b border-slate-200 shrink-0">
            {dbRowCount} líneas en BD
            {sovLines.length > 0 && <> · Mostrando {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, sovLines.length)} de {sovLines.length}</>}
          </div>

          {/* Scrollable table area */}
          <div className="overflow-auto flex-1 relative">
            <table className="w-full text-[12px] border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left font-semibold text-slate-600 px-2 py-2" style={{ width: 50 }}>#</th>
                  <th className="text-left font-semibold text-slate-600 px-2 py-2" style={{ width: 220 }}>Actividad</th>
                  <th className="text-left font-semibold text-slate-600 px-2 py-2" style={{ width: 130 }}>Fase</th>
                  <th className="text-left font-semibold text-slate-600 px-2 py-2" style={{ width: 70 }}>Inicio</th>
                  <th className="text-left font-semibold text-slate-600 px-2 py-2" style={{ width: 70 }}>Fin</th>
                  <th className="text-left font-semibold text-slate-600 px-2 py-2" style={{ width: 110 }}>Av. Físico</th>
                  <th className="text-right font-semibold text-slate-600 px-2 py-2" style={{ width: 110 }}>Budget</th>
                  <th className="text-right font-semibold text-slate-600 px-2 py-2" style={{ width: 110 }}>Costo Real</th>
                  <th className="text-left font-semibold text-slate-600 px-2 py-2" style={{ width: 120 }}>Av. Presup.</th>
                </tr>
              </thead>
              <tbody>
                {pagedLines.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-2 py-1 font-mono text-slate-500">{l.line_number}</td>
                    <td className="px-2 py-1">
                      <div className="leading-tight">
                        <span className="font-medium text-slate-800">{l.name}</span>
                        {l.subfase && <div className="text-[11px] text-slate-400 mt-0.5">{l.subfase}</div>}
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      {l.fase ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${faseColorMap[l.fase] || "bg-slate-200 text-slate-700"}`}>
                          {l.fase}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-2 py-1 text-slate-600 tabular-nums">{formatShortDate(l.start_date)}</td>
                    <td className="px-2 py-1 text-slate-600 tabular-nums">{formatShortDate(l.end_date)}</td>
                    <td className="px-2 py-1"><ProgressBar value={l.progress_pct || 0} color="bg-teal-500" /></td>
                    <td className="px-2 py-1 text-right text-slate-700 tabular-nums">{fmt(l.budget)}</td>
                    <td className="px-2 py-1 text-right text-slate-700 tabular-nums">{fmt(l.real_cost)}</td>
                    <td className="px-2 py-1"><ProgressBar value={l.budget_progress_pct || 0} color={budgetBarColor(l.budget_progress_pct || 0)} /></td>
                  </tr>
                ))}
                {sovLines.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-400">No hay líneas SOV. Sube un archivo Excel para comenzar.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sticky summary row */}
          {sovLines.length > 0 && (
            <div className="shrink-0 bg-[#0F1B2D] text-white text-[12px] font-bold">
              <div className="flex items-center">
                <div className="px-2 py-2" style={{ width: 50 }}>TOTAL</div>
                <div className="px-2 py-2" style={{ width: 220 }}>—</div>
                <div className="px-2 py-2" style={{ width: 130 }}>—</div>
                <div className="px-2 py-2" style={{ width: 70 }}>—</div>
                <div className="px-2 py-2" style={{ width: 70 }}>—</div>
                <div className="px-2 py-2" style={{ width: 110 }}>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-teal-400" style={{ width: `${Math.min(avgFisico, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right tabular-nums text-[11px]">{avgFisico}%</span>
                  </div>
                </div>
                <div className="px-2 py-2 text-right tabular-nums" style={{ width: 110 }}>{fmt(totalBudget)}</div>
                <div className="px-2 py-2 text-right tabular-nums" style={{ width: 110 }}>{fmt(totalReal)}</div>
                <div className="px-2 py-2" style={{ width: 120 }}>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${avgBudget > 100 ? "bg-red-400" : avgBudget > 85 ? "bg-orange-400" : "bg-green-400"}`} style={{ width: `${Math.min(avgBudget, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right tabular-nums text-[11px]">{avgBudget}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-slate-200 text-xs text-slate-500 shrink-0">
              <span>{sovLines.length} líneas totales</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-7 px-2 text-xs">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />Anterior
                </Button>
                <span className="font-medium text-slate-700">Página {page + 1} de {totalPages}</span>
                <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="h-7 px-2 text-xs">
                  Siguiente<ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SovSection;
