import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileDown, UploadCloud } from "lucide-react";
import {
  PAGE_TITLE, PAGE_SUBTITLE, TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  BTN_SUCCESS, BTN_PRIMARY,
} from "@/lib/design-system";

const ReportsSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [reports, setReports] = useState<any[]>([]);
  const [formData, setFormData] = useState({ week_number: "", report_date: "", highlight_text: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { supabase.from("projects").select("id, code, address").then(({ data }) => { if (data) setProjects(data); }); }, []);

  const fetchReports = () => {
    if (selectedProjectId) {
      supabase.from("weekly_reports").select("*").eq("project_id", selectedProjectId).order("week_number", { ascending: false }).then(({ data }) => { if (data) setReports(data); });
    } else { setReports([]); }
  };

  useEffect(() => { fetchReports(); }, [selectedProjectId]);

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !file) return toast.error("Seleccione un proyecto y un archivo PDF");
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedProjectId}-week${formData.week_number}-${Date.now()}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from("project_files").upload(`reports/${fileName}`, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("project_files").getPublicUrl(`reports/${fileName}`);
      const { error } = await supabase.from("weekly_reports").insert([{
        project_id: selectedProjectId, week_number: parseInt(formData.week_number),
        report_date: formData.report_date, highlight_text: formData.highlight_text,
        pdf_url: data.publicUrl, published_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      toast.success("Reporte publicado");
      setFormData({ week_number: "", report_date: "", highlight_text: "" });
      setFile(null);
      const fileInput = document.getElementById("report-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      fetchReports();
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className={PAGE_TITLE}>Reportes Semanales</h2>
        <p className={PAGE_SUBTITLE}>Publicación de reportes para clientes</p>
      </div>

      <div className="w-full max-w-md">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
          <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.address}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {selectedProjectId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload form */}
          <div className="md:col-span-1 bg-white p-5 rounded-lg border border-gray-200 shadow-sm h-fit">
            <h3 className="text-[14px] font-bold text-[#0F1B2D] mb-4">Subir Nuevo Reporte</h3>
            <form onSubmit={handleUploadReport} className="space-y-4">
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Semana Nº</Label><Input type="number" required value={formData.week_number} onChange={(e) => setFormData({ ...formData, week_number: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Fecha del Reporte</Label><Input type="date" required value={formData.report_date} onChange={(e) => setFormData({ ...formData, report_date: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Highlights</Label><Textarea required value={formData.highlight_text} onChange={(e) => setFormData({ ...formData, highlight_text: e.target.value })} placeholder="Resumen de la semana..." /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Archivo PDF</Label><Input id="report-file" type="file" accept=".pdf" required onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
              <Button type="submit" disabled={uploading} className={`w-full ${BTN_SUCCESS}`}>
                {uploading ? "Subiendo..." : <><UploadCloud className="w-4 h-4 mr-2" /> Publicar Reporte</>}
              </Button>
            </form>
          </div>

          {/* Reports table */}
          <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className={TH_CLASS}>Semana</th>
                  <th className={TH_CLASS}>Fecha</th>
                  <th className={TH_CLASS}>Publicado</th>
                  <th className={TH_CLASS}>Descargar</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => (
                  <tr key={r.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                    <td className={`${TD_CLASS} font-semibold`}>Semana {r.week_number}</td>
                    <td className={TD_CLASS}>{r.report_date}</td>
                    <td className={TD_CLASS}>{new Date(r.published_at).toLocaleDateString()}</td>
                    <td className={TD_CLASS}>
                      {r.pdf_url && (
                        <a href={r.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-[#0D7377] hover:underline text-[11px]">
                          <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-[12px]">No hay reportes publicados</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsSection;
