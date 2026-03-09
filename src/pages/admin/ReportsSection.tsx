import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileDown, UploadCloud } from "lucide-react";

const ReportsSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [reports, setReports] = useState<any[]>([]);
  const [formData, setFormData] = useState({ week_number: "", report_date: "", highlight_text: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from('projects').select('id, code, address').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  const fetchReports = () => {
    if (selectedProjectId) {
      supabase.from('weekly_reports').select('*').eq('project_id', selectedProjectId).order('week_number', { ascending: false }).then(({ data }) => {
        if (data) setReports(data);
      });
    } else {
      setReports([]);
    }
  };

  useEffect(() => { fetchReports(); }, [selectedProjectId]);

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !file) return toast.error("Seleccione un proyecto y un archivo PDF");
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedProjectId}-week${formData.week_number}-${Date.now()}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from('project_files').upload(`reports/${fileName}`, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('project_files').getPublicUrl(`reports/${fileName}`);

      const { error } = await supabase.from('weekly_reports').insert([{
        project_id: selectedProjectId,
        week_number: parseInt(formData.week_number),
        report_date: formData.report_date,
        highlight_text: formData.highlight_text,
        pdf_url: data.publicUrl,
        published_at: new Date().toISOString()
      }]);

      if (error) throw error;
      toast.success("Reporte publicado");
      setFormData({ week_number: "", report_date: "", highlight_text: "" });
      setFile(null);
      const fileInput = document.getElementById('report-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      fetchReports();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Reportes Semanales</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h3 className="text-lg font-semibold mb-4">Subir Nuevo Reporte</h3>
            <form onSubmit={handleUploadReport} className="space-y-4">
              <div className="space-y-2"><Label>Semana Nº</Label><Input type="number" required value={formData.week_number} onChange={e => setFormData({...formData, week_number: e.target.value})} /></div>
              <div className="space-y-2"><Label>Fecha del Reporte</Label><Input type="date" required value={formData.report_date} onChange={e => setFormData({...formData, report_date: e.target.value})} /></div>
              <div className="space-y-2"><Label>Highlights</Label><Textarea required value={formData.highlight_text} onChange={e => setFormData({...formData, highlight_text: e.target.value})} placeholder="Resumen de la semana..." /></div>
              <div className="space-y-2">
                <Label>Archivo PDF</Label>
                <Input id="report-file" type="file" accept=".pdf" required onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" disabled={uploading} className="w-full bg-[#0D7377] text-white hover:bg-[#0D7377]/90">
                {uploading ? "Subiendo..." : <><UploadCloud className="w-4 h-4 mr-2" /> Publicar Reporte</>}
              </Button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semana</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Publicado</TableHead>
                  <TableHead>Descargar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">Semana {r.week_number}</TableCell>
                    <TableCell>{r.report_date}</TableCell>
                    <TableCell>{new Date(r.published_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {r.pdf_url && (
                        <a href={r.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-[#0D7377] hover:underline">
                          <FileDown className="w-4 h-4 mr-1" /> PDF
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8">No hay reportes publicados</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
export default ReportsSection;