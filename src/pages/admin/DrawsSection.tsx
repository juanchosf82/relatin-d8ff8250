import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const DrawsSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [draws, setDraws] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    draw_number: "", amount_requested: "", amount_certified: "", request_date: "", notes: ""
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from('projects').select('id, code, address').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  const fetchDraws = () => {
    if (selectedProjectId) {
      supabase.from('draws').select('*').eq('project_id', selectedProjectId).order('draw_number').then(({ data }) => {
        if (data) setDraws(data);
      });
    } else {
      setDraws([]);
    }
  };

  useEffect(() => { fetchDraws(); }, [selectedProjectId]);

  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    
    setUploading(true);
    try {
      let certificate_url = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedProjectId}-${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from('project_files').upload(`draws/${fileName}`, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('project_files').getPublicUrl(`draws/${fileName}`);
        certificate_url = data.publicUrl;
      }

      const { error } = await supabase.from('draws').insert([{
        project_id: selectedProjectId,
        draw_number: parseInt(formData.draw_number),
        amount_requested: parseFloat(formData.amount_requested),
        amount_certified: formData.amount_certified ? parseFloat(formData.amount_certified) : null,
        request_date: formData.request_date,
        notes: formData.notes,
        certificate_url,
        status: 'pending'
      }]);

      if (error) throw error;
      toast.success("Draw creado");
      setIsModalOpen(false);
      setFormData({ draw_number: "", amount_requested: "", amount_certified: "", request_date: "", notes: "" });
      setFile(null);
      fetchDraws();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await supabase.from('draws').update({ status: newStatus }).eq('id', id);
      toast.success("Estado actualizado");
      fetchDraws();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Draws</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedProjectId} className="bg-[#0D7377] text-white hover:bg-[#0D7377]/90">Nuevo Draw</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Nuevo Draw</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateDraw} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Draw Nº</Label><Input type="number" required value={formData.draw_number} onChange={e => setFormData({...formData, draw_number: e.target.value})} /></div>
                <div className="space-y-2"><Label>Fecha Solicitud</Label><Input type="date" required value={formData.request_date} onChange={e => setFormData({...formData, request_date: e.target.value})} /></div>
                <div className="space-y-2"><Label>Monto Solicitado ($)</Label><Input type="number" required value={formData.amount_requested} onChange={e => setFormData({...formData, amount_requested: e.target.value})} /></div>
                <div className="space-y-2"><Label>Monto Certificado ($)</Label><Input type="number" value={formData.amount_certified} onChange={e => setFormData({...formData, amount_certified: e.target.value})} /></div>
              </div>
              <div className="space-y-2">
                <Label>Certificado / Archivo PDF (Opcional)</Label>
                <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2"><Label>Notas</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
              <Button type="submit" disabled={uploading} className="w-full bg-[#0F1B2D] text-white">
                {uploading ? "Guardando..." : "Guardar Draw"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
                <TableHead>Nº</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Solicitado</TableHead>
                <TableHead>Certificado</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draws.map(d => (
                <TableRow key={d.id}>
                  <TableCell>#{d.draw_number}</TableCell>
                  <TableCell>{d.request_date}</TableCell>
                  <TableCell>${d.amount_requested?.toLocaleString()}</TableCell>
                  <TableCell>{d.amount_certified ? `$${d.amount_certified.toLocaleString()}` : '-'}</TableCell>
                  <TableCell>
                    {d.certificate_url ? <a href={d.certificate_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">Ver</a> : '-'}
                  </TableCell>
                  <TableCell>
                    <Select value={d.status} onValueChange={(val) => handleStatusChange(d.id, val)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="review">En revisión</SelectItem>
                        <SelectItem value="sent">Enviado</SelectItem>
                        <SelectItem value="paid">Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {draws.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">No hay draws</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
export default DrawsSection;