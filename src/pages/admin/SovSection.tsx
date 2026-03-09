import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SovSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [sovLines, setSovLines] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('projects').select('id, code, address').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      supabase.from('sov_lines').select('*').eq('project_id', selectedProjectId).order('line_number').then(({ data }) => {
        if (data) setSovLines(data);
      });
    } else {
      setSovLines([]);
    }
  }, [selectedProjectId]);

  const handleProgressChange = (id: string, value: string) => {
    let num = parseInt(value) || 0;
    if (num > 100) num = 100;
    if (num < 0) num = 0;
    setSovLines(lines => lines.map(l => l.id === id ? { ...l, progress_pct: num } : l));
  };

  const handleBudgetChange = (id: string, value: string) => {
    const num = parseFloat(value) || 0;
    setSovLines(lines => lines.map(l => l.id === id ? { ...l, budget: num } : l));
  };

  const handleSave = async () => {
    try {
      for (const line of sovLines) {
        await supabase.from('sov_lines').update({ 
          progress_pct: line.progress_pct,
          budget: line.budget
        }).eq('id', line.id);
      }
      
      const avg = Math.round(sovLines.reduce((acc, curr) => acc + (curr.progress_pct || 0), 0) / (sovLines.length || 1));
      
      await supabase.from('projects').update({ progress_pct: avg }).eq('id', selectedProjectId);
      
      toast.success("Avance guardado exitosamente");
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Avance SOV</h2>
        <Button onClick={handleSave} disabled={!selectedProjectId || sovLines.length === 0} className="bg-[#0F1B2D] text-white hover:bg-[#0F1B2D]/90">
          Guardar Cambios
        </Button>
      </div>

      <div className="w-full max-w-md">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.code} - {p.address}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProjectId && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Línea</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-48">Presupuesto ($)</TableHead>
                <TableHead className="w-32">Avance (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sovLines.map(line => (
                <TableRow key={line.id}>
                  <TableCell>{line.line_number}</TableCell>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>
                    <Input type="number" value={line.budget} onChange={e => handleBudgetChange(line.id, e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" max="100" value={line.progress_pct} onChange={e => handleProgressChange(line.id, e.target.value)} />
                  </TableCell>
                </TableRow>
              ))}
              {sovLines.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8">No hay líneas SOV</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
export default SovSection;