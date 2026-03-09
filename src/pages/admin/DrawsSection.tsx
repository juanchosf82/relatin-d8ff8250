import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PAGE_TITLE, PAGE_SUBTITLE, TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  DRAW_STATUS_BADGE, badgeClass, fmt, BTN_SUCCESS, BTN_PRIMARY,
} from "@/lib/design-system";
import { sendNotification, getClientInfoForProject } from "@/lib/notifications";

const DrawsSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [draws, setDraws] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ draw_number: "", amount_requested: "", amount_certified: "", request_date: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { supabase.from("projects").select("id, code, address").then(({ data }) => { if (data) setProjects(data); }); }, []);

  const fetchDraws = () => {
    if (selectedProjectId) {
      supabase.from("draws").select("*").eq("project_id", selectedProjectId).order("draw_number").then(({ data }) => { if (data) setDraws(data); });
    } else { setDraws([]); }
  };

  useEffect(() => { fetchDraws(); }, [selectedProjectId]);

  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setUploading(true);
    try {
      let certificate_url = null;
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${selectedProjectId}-${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from("project_files").upload(`draws/${fileName}`, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("project_files").getPublicUrl(`draws/${fileName}`);
        certificate_url = data.publicUrl;
      }
      const { error } = await supabase.from("draws").insert([{
        project_id: selectedProjectId, draw_number: parseInt(formData.draw_number),
        amount_requested: parseFloat(formData.amount_requested),
        amount_certified: formData.amount_certified ? parseFloat(formData.amount_certified) : null,
        request_date: formData.request_date, notes: formData.notes, certificate_url, status: "pending",
      }]);
      if (error) throw error;
      toast.success("Draw creado");
      setIsModalOpen(false);
      setFormData({ draw_number: "", amount_requested: "", amount_certified: "", request_date: "", notes: "" });
      setFile(null);
      fetchDraws();
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setUploading(false); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from("draws").update({ status: newStatus }).eq("id", id);
    toast.success("Estado actualizado");
    fetchDraws();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={PAGE_TITLE}>Draws</h2>
          <p className={PAGE_SUBTITLE}>Gestión de desembolsos</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedProjectId} className={BTN_SUCCESS}>Nuevo Draw</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Nuevo Draw</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateDraw} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[11px] text-gray-400">Draw Nº</Label><Input type="number" required value={formData.draw_number} onChange={(e) => setFormData({ ...formData, draw_number: e.target.value })} /></div>
                <div className="space-y-2"><Label className="text-[11px] text-gray-400">Fecha Solicitud</Label><Input type="date" required value={formData.request_date} onChange={(e) => setFormData({ ...formData, request_date: e.target.value })} /></div>
                <div className="space-y-2"><Label className="text-[11px] text-gray-400">Monto Solicitado ($)</Label><Input type="number" required value={formData.amount_requested} onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })} /></div>
                <div className="space-y-2"><Label className="text-[11px] text-gray-400">Monto Certificado ($)</Label><Input type="number" value={formData.amount_certified} onChange={(e) => setFormData({ ...formData, amount_certified: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Certificado / PDF</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Notas</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
              <Button type="submit" disabled={uploading} className={`w-full ${BTN_PRIMARY}`}>{uploading ? "Guardando..." : "Guardar Draw"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full max-w-md">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
          <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.address}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {selectedProjectId && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className={TH_CLASS}>Nº</th>
                <th className={TH_CLASS}>Fecha</th>
                <th className={`${TH_CLASS} text-right`}>Solicitado</th>
                <th className={`${TH_CLASS} text-right`}>Certificado</th>
                <th className={TH_CLASS}>Archivo</th>
                <th className={TH_CLASS}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {draws.map((d, idx) => {
                const status = DRAW_STATUS_BADGE[d.status ?? "pending"] || DRAW_STATUS_BADGE.pending;
                return (
                  <tr key={d.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                    <td className={`${TD_CLASS} font-mono`}>#{d.draw_number}</td>
                    <td className={TD_CLASS}>{d.request_date}</td>
                    <td className={`${TD_CLASS} text-right font-mono`}>{fmt(d.amount_requested)}</td>
                    <td className={`${TD_CLASS} text-right font-mono`}>{d.amount_certified ? fmt(d.amount_certified) : "—"}</td>
                    <td className={TD_CLASS}>
                      {d.certificate_url ? <a href={d.certificate_url} target="_blank" rel="noreferrer" className="text-[#0D7377] underline text-[11px]">Ver</a> : "—"}
                    </td>
                    <td className={TD_CLASS}>
                      <Select value={d.status} onValueChange={(val) => handleStatusChange(d.id, val)}>
                        <SelectTrigger className="w-[120px] h-7 text-[11px] border-gray-200">
                          <Badge className={badgeClass(status.bg, status.text)}>{status.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DRAW_STATUS_BADGE).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
              {draws.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-[12px]">No hay draws</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DrawsSection;
