import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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

const SovSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [sovLines, setSovLines] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [page, setPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("projects").select("id, code, address").then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  const fetchLines = async (projectId: string) => {
    // Fetch all lines (handle >1000 with pagination)
    let all: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("sov_lines")
        .select("*")
        .eq("project_id", projectId)
        .order("line_number")
        .range(from, from + batchSize - 1);
      if (data) all = all.concat(data);
      if (!data || data.length < batchSize) break;
      from += batchSize;
    }
    setSovLines(all);
    setPage(0);
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchLines(selectedProjectId);
    } else {
      setSovLines([]);
    }
  }, [selectedProjectId]);

  const recalcProjectProgress = async (projectId: string, lines: any[]) => {
    const avg = lines.length
      ? Math.round(lines.reduce((a, c) => a + (c.progress_pct || 0), 0) / lines.length)
      : 0;
    await supabase.from("projects").update({ progress_pct: avg }).eq("id", projectId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    setUploading(true);
    setUploadProgress("Leyendo archivo...");

    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const dataRows = rows.slice(1).filter((r) => r[0] != null && String(r[0]).trim() !== "");
      if (dataRows.length === 0) {
        toast.error("El archivo no contiene datos.");
        return;
      }

      // Step 1: Delete existing lines
      setUploadProgress("Eliminando líneas anteriores...");
      await supabase.from("sov_lines").delete().eq("project_id", selectedProjectId);

      // Step 2: Prepare rows
      const records = dataRows.map((row) => {
        let progressPct = parseInt(row[6]) || 0;
        if (progressPct > 100) progressPct = 100;
        if (progressPct < 0) progressPct = 0;
        return {
          project_id: selectedProjectId,
          line_number: String(row[0]).trim(),
          name: String(row[1] || "").trim(),
          start_date: parseDate(row[2]),
          end_date: parseDate(row[3]),
          budget: parseFloat(row[4]) || 0,
          real_cost: parseFloat(row[5]) || 0,
          progress_pct: progressPct,
          updated_at: new Date().toISOString(),
        };
      });

      // Step 3: Insert in chunks
      let inserted = 0;
      for (let i = 0; i < records.length; i += INSERT_CHUNK) {
        const chunk = records.slice(i, i + INSERT_CHUNK);
        setUploadProgress(`Insertando ${Math.min(i + INSERT_CHUNK, records.length)} / ${records.length}...`);
        const { error } = await supabase.from("sov_lines").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }

      // Step 4: Refresh & recalc
      await fetchLines(selectedProjectId);
      await recalcProjectProgress(selectedProjectId, records);

      toast.success(`${inserted} líneas cargadas correctamente`);
    } catch (err: any) {
      toast.error("Error al procesar el archivo: " + err.message);
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExport = () => {
    if (sovLines.length === 0) return;
    const exportData = sovLines.map((l) => ({
      línea: l.line_number,
      nombre_actividad: l.name,
      fecha_inicio: l.start_date || "",
      fecha_fin: l.end_date || "",
      budget: l.budget || 0,
      real: l.real_cost || 0,
      avance: l.progress_pct || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SOV");
    const proj = projects.find((p) => p.id === selectedProjectId);
    XLSX.writeFile(wb, `SOV_${proj?.code || "export"}.xlsx`);
  };

  const fmt = (v: number | null) =>
    v != null ? v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }) : "—";

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sovLines.length / ROWS_PER_PAGE));
  const pagedLines = sovLines.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  // Summary
  const totalBudget = sovLines.reduce((a, c) => a + (c.budget || 0), 0);
  const totalReal = sovLines.reduce((a, c) => a + (c.real_cost || 0), 0);
  const avgAvance = sovLines.length
    ? Math.round(sovLines.reduce((a, c) => a + (c.progress_pct || 0), 0) / sovLines.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Avance SOV</h2>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-full max-w-md">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecciona un proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code} - {p.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProjectId && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-[#0F1B2D] text-white hover:bg-[#0F1B2D]/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Cargando..." : "Cargar SOV desde Excel"}
            </Button>
            {sovLines.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar SOV
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead className="w-32">Fecha Inicio</TableHead>
                <TableHead className="w-32">Fecha Fin</TableHead>
                <TableHead className="w-36 text-right">Presupuesto</TableHead>
                <TableHead className="w-36 text-right">Real</TableHead>
                <TableHead className="w-48">Avance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-sm">{line.line_number}</TableCell>
                  <TableCell>{line.name}</TableCell>
                  <TableCell className="text-sm">{line.start_date || "—"}</TableCell>
                  <TableCell className="text-sm">{line.end_date || "—"}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(line.budget)}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(line.real_cost)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={line.progress_pct || 0} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-10 text-right">{line.progress_pct || 0}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sovLines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No hay líneas SOV. Sube un archivo Excel para comenzar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {sovLines.length > 0 && (
              <TableFooter>
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell colSpan={4} className="text-right">Totales ({sovLines.length} líneas)</TableCell>
                  <TableCell className="text-right">{fmt(totalBudget)}</TableCell>
                  <TableCell className="text-right">{fmt(totalReal)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={avgAvance} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-10 text-right">{avgAvance}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <span className="text-sm text-slate-500">
                Página {page + 1} de {totalPages}
              </span>
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
