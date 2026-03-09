import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";

const parseDate = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    return null;
  }
  const s = String(val).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM/DD/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
};

const SovSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [sovLines, setSovLines] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("projects").select("id, code, address").then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  const fetchLines = async (projectId: string) => {
    const { data } = await supabase
      .from("sov_lines")
      .select("*")
      .eq("project_id", projectId)
      .order("line_number");
    if (data) setSovLines(data);
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

    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Skip header row
      const dataRows = rows.slice(1).filter((r) => r[0] != null && String(r[0]).trim() !== "");
      let count = 0;

      for (const row of dataRows) {
        const lineNumber = String(row[0]).trim();
        const name = String(row[1] || "").trim();
        const startDate = parseDate(row[2]);
        const endDate = parseDate(row[3]);
        const budget = parseFloat(row[4]) || 0;
        const realCost = parseFloat(row[5]) || 0;
        let progressPct = parseInt(row[6]) || 0;
        if (progressPct > 100) progressPct = 100;
        if (progressPct < 0) progressPct = 0;

        const { error } = await supabase.from("sov_lines").upsert(
          {
            project_id: selectedProjectId,
            line_number: lineNumber,
            name,
            start_date: startDate,
            end_date: endDate,
            budget,
            real_cost: realCost,
            progress_pct: progressPct,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id,line_number" }
        );
        if (!error) count++;
      }

      await fetchLines(selectedProjectId);
      // Recalculate with fresh data
      const { data: freshLines } = await supabase
        .from("sov_lines")
        .select("progress_pct")
        .eq("project_id", selectedProjectId);
      if (freshLines) await recalcProjectProgress(selectedProjectId, freshLines);

      toast.success(`${count} líneas actualizadas exitosamente`);
    } catch (err: any) {
      toast.error("Error al procesar el archivo: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const fmt = (v: number | null) =>
    v != null ? v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }) : "—";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Avance SOV</h2>
      </div>

      <div className="flex items-center gap-4">
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
              {uploading ? "Cargando..." : "Cargar desde Excel"}
            </Button>
          </>
        )}
      </div>

      {selectedProjectId && (
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
              {sovLines.map((line) => (
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
          </Table>
        </div>
      )}
    </div>
  );
};

export default SovSection;
