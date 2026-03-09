import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { Upload, Download, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";

const ROWS_PER_PAGE = 50;
const INSERT_CHUNK = 50;

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
  const cleaned = String(val)
    .replace(/[$,\s]/g, "")
    .replace(/^\((.*)\)$/, "-$1");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const normalizeHeader = (value: any) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

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

  const fetchLines = async (pid: string) => {
    let all: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("sov_lines")
        .select("*")
        .eq("project_id", pid)
        .order("line_number")
        .range(from, from + 999);
      if (data) all = all.concat(data);
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    setSovLines(all);
    setPage(0);
  };

  const fetchDbCount = async (pid: string) => {
    const { count, error } = await supabase
      .from("sov_lines")
      .select("id", { count: "exact", head: true })
      .eq("project_id", pid);

    if (error) {
      setDbRowCount(0);
      return;
    }

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
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
      const dataRows = rows.slice(1).filter((r) => r.length > 0 && r.some((cell: any) => cell != null && String(cell).trim() !== ""));
      if (!dataRows.length) { toast.error("El archivo no contiene datos."); return; }

      setUploadProgress("Eliminando líneas anteriores...");
      const { error: delError } = await supabase.from("sov_lines").delete().eq("project_id", selectedProjectId);
      if (delError) throw new Error("No se pudieron eliminar las líneas anteriores: " + delError.message);

      const records = dataRows.map((r) => ({
        project_id: selectedProjectId,
        line_number: String(r[0]).trim(),
        name: String(r[1] || "").trim(),
        fase: r[2] != null ? String(r[2]).trim() : null,
        subfase: r[3] != null ? String(r[3]).trim() : null,
        start_date: parseDate(r[4]),
        end_date: parseDate(r[5]),
        progress_pct: clamp(parseInt(r[6]) || 0),
        budget: parseFloat(r[7]) || 0,
        real_cost: parseFloat(r[8]) || 0,
        budget_progress_pct: parseFloat(r[9]) || 0,
        updated_at: new Date().toISOString(),
      }));

      let inserted = 0;
      for (let i = 0; i < records.length; i += INSERT_CHUNK) {
        const chunk = records.slice(i, i + INSERT_CHUNK);
        setUploadProgress(`Insertando ${Math.min(i + INSERT_CHUNK, records.length)} / ${records.length}...`);
        const { error } = await supabase.from("sov_lines").upsert(chunk, { onConflict: "project_id,line_number" });
        if (error) throw error;
        inserted += chunk.length;
      }

      const avg = Math.round(records.reduce((a, c) => a + c.progress_pct, 0) / records.length);
      await supabase.from("projects").update({ progress_pct: avg }).eq("id", selectedProjectId);
      await fetchLines(selectedProjectId);
      toast.success(`${inserted} líneas cargadas correctamente`);
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
      linea: l.line_number,
      nombre_actividad: l.name,
      fase: l.fase || "",
      subfase: l.subfase || "",
      fecha_inicio: l.start_date || "",
      fecha_fin: l.end_date || "",
      avance_fisico: l.progress_pct || 0,
      budget: l.budget || 0,
      costo_real: l.real_cost || 0,
      avance_presupuesto: l.budget_progress_pct || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wbOut = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbOut, ws, "SOV");
    const proj = projects.find((p) => p.id === selectedProjectId);
    XLSX.writeFile(wbOut, `SOV_${proj?.code || "export"}.xlsx`);
  };

  const fmt = (v: number | null) =>
    v != null ? v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }) : "—";

  const totalPages = Math.max(1, Math.ceil(sovLines.length / ROWS_PER_PAGE));
  const pagedLines = sovLines.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  const totalBudget = sovLines.reduce((a, c) => a + (c.budget || 0), 0);
  const totalReal = sovLines.reduce((a, c) => a + (c.real_cost || 0), 0);
  const avgFisico = sovLines.length ? Math.round(sovLines.reduce((a, c) => a + (c.progress_pct || 0), 0) / sovLines.length) : 0;
  const avgBudget = sovLines.length ? Math.round(sovLines.reduce((a, c) => a + (c.budget_progress_pct || 0), 0) / sovLines.length) : 0;

  const fisicoColor = (v: number) => (v >= 100 ? "bg-green-500" : v > 0 ? "bg-teal-500" : "bg-gray-400");
  const budgetColor = (v: number) => (v > 100 ? "bg-red-500" : v > 85 ? "bg-orange-500" : "bg-green-500");

  const ProgressBar = ({ value, colorFn }: { value: number; colorFn: (v: number) => string }) => (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorFn(value)}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-sm font-medium w-12 text-right">{value}%</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Avance SOV</h2>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-full max-w-md">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecciona un proyecto" />
            </SelectTrigger>
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
              <Upload className="w-4 h-4 mr-2" />{uploading ? "Cargando..." : "Cargar SOV desde Excel"}
            </Button>
            {sovLines.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />Exportar SOV
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          {sovLines.length > 0 && (
            <div className="px-4 py-2 text-sm text-slate-600 border-b border-slate-200">
              Mostrando {page * ROWS_PER_PAGE + 1}-{Math.min((page + 1) * ROWS_PER_PAGE, sovLines.length)} de {sovLines.length} líneas
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Subfase</TableHead>
                <TableHead className="w-28">Inicio</TableHead>
                <TableHead className="w-28">Fin</TableHead>
                <TableHead className="w-40">Av. Físico</TableHead>
                <TableHead className="w-32 text-right">Budget</TableHead>
                <TableHead className="w-32 text-right">Costo Real</TableHead>
                <TableHead className="w-44">Av. Presupuesto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-sm">{l.line_number}</TableCell>
                  <TableCell className="text-sm">{l.name}</TableCell>
                  <TableCell className="text-sm">{l.fase || "—"}</TableCell>
                  <TableCell className="text-sm">{l.subfase || "—"}</TableCell>
                  <TableCell className="text-sm">{l.start_date || "—"}</TableCell>
                  <TableCell className="text-sm">{l.end_date || "—"}</TableCell>
                  <TableCell><ProgressBar value={l.progress_pct || 0} colorFn={fisicoColor} /></TableCell>
                  <TableCell className="text-right text-sm">{fmt(l.budget)}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(l.real_cost)}</TableCell>
                  <TableCell><ProgressBar value={l.budget_progress_pct || 0} colorFn={budgetColor} /></TableCell>
                </TableRow>
              ))}
              {sovLines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                    No hay líneas SOV. Sube un archivo Excel para comenzar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {sovLines.length > 0 && (
              <TableFooter>
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell colSpan={6} className="text-right">Totales ({sovLines.length} líneas)</TableCell>
                  <TableCell><ProgressBar value={avgFisico} colorFn={fisicoColor} /></TableCell>
                  <TableCell className="text-right">{fmt(totalBudget)}</TableCell>
                  <TableCell className="text-right">{fmt(totalReal)}</TableCell>
                  <TableCell><ProgressBar value={avgBudget} colorFn={budgetColor} /></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <span className="text-sm text-slate-500">Página {page + 1} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
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
