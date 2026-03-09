import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ProjectLinksManager from "@/components/admin/ProjectLinksManager";
import { toast } from "sonner";
import {
  PAGE_TITLE, PAGE_SUBTITLE, TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  PROJECT_STATUS_BADGE, badgeClass, fmt, BTN_PRIMARY, BTN_SUCCESS, BTN_SECONDARY,
} from "@/lib/design-system";

const DEFAULT_SOV_LINES = [
  "01-Preliminares/Fundación", "02-Framing/Estructura", "03-Cerramientos", "04-MEP rough-in",
  "05-Drywall/Insulation", "06-Electricidad acabado", "07-Plomería acabado", "08-HVAC acabado",
  "09-Gabinetes", "10-Countertops", "11-Pisos", "12-Carpintería y herrajes",
  "13-Exterior/Landscaping", "14-Pintura final", "15-Contingencia",
];

const ProjectsSection = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "", address: "", gc_name: "", gc_license: "", lender_name: "", loan_amount: "", co_target_date: "", permit_no: "",
  });
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignProjectId, setAssignProjectId] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (data) setProjects(data);
  };

  useEffect(() => { fetchProjects(); }, []);

  const resetForm = () => {
    setFormData({ code: "", address: "", gc_name: "", gc_license: "", lender_name: "", loan_amount: "", co_target_date: "", permit_no: "" });
    setEditingProjectId(null);
  };

  const openEditModal = (p: any) => {
    setEditingProjectId(p.id);
    setFormData({
      code: p.code || "", address: p.address || "", gc_name: p.gc_name || "", gc_license: p.gc_license || "",
      lender_name: p.lender_name || "", loan_amount: p.loan_amount?.toString() || "", co_target_date: p.co_target_date || "", permit_no: p.permit_no || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code, address: formData.address, gc_name: formData.gc_name, gc_license: formData.gc_license,
        lender_name: formData.lender_name, loan_amount: parseFloat(formData.loan_amount), co_target_date: formData.co_target_date, permit_no: formData.permit_no,
      };
      if (editingProjectId) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editingProjectId);
        if (error) throw error;
        toast.success("Proyecto actualizado exitosamente");
      } else {
        const { data: project, error: projErr } = await supabase.from("projects").insert([payload]).select().single();
        if (projErr) throw projErr;
        const sovInserts = DEFAULT_SOV_LINES.map((line) => {
          const [number, ...nameParts] = line.split("-");
          return { project_id: project.id, line_number: number, name: nameParts.join("-"), budget: 0, progress_pct: 0 };
        });
        const { error: sovErr } = await supabase.from("sov_lines").insert(sovInserts);
        if (sovErr) throw sovErr;
        toast.success("Proyecto creado exitosamente");
      }
      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const handleAssignClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: profiles, error: profErr } = await supabase.from("profiles").select("id").eq("email", clientEmail);
      if (profErr || !profiles || profiles.length === 0) { toast.error("Usuario no encontrado con ese email"); return; }
      const { error: updErr } = await supabase.from("projects").update({ client_user_id: profiles[0].id }).eq("id", assignProjectId);
      if (updErr) throw updErr;
      toast.success("Cliente asignado exitosamente");
      setAssignModalOpen(false);
      setClientEmail("");
      fetchProjects();
    } catch (err: any) {
      toast.error("Error al asignar: " + err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={PAGE_TITLE}>Proyectos</h2>
          <p className={PAGE_SUBTITLE}>{projects.length} proyectos registrados</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className={BTN_SUCCESS}>Nuevo Proyecto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingProjectId ? "Editar Proyecto" : "Crear Nuevo Proyecto"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveProject} className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Código</Label><Input required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Dirección</Label><Input required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Contratista General</Label><Input value={formData.gc_name} onChange={(e) => setFormData({ ...formData, gc_name: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Licencia GC</Label><Input value={formData.gc_license} onChange={(e) => setFormData({ ...formData, gc_license: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Prestamista</Label><Input value={formData.lender_name} onChange={(e) => setFormData({ ...formData, lender_name: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Monto Préstamo ($)</Label><Input type="number" required value={formData.loan_amount} onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Fecha Objetivo CO</Label><Input type="date" value={formData.co_target_date} onChange={(e) => setFormData({ ...formData, co_target_date: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-[11px] text-gray-400">Nº Permiso</Label><Input value={formData.permit_no} onChange={(e) => setFormData({ ...formData, permit_no: e.target.value })} /></div>
              <div className="col-span-2 pt-4">
                <Button type="submit" className={`w-full ${BTN_PRIMARY}`}>{editingProjectId ? "Actualizar Proyecto" : "Guardar Proyecto"}</Button>
              </div>
            </form>
            {editingProjectId && (
              <div className="border-t pt-4 mt-2"><ProjectLinksManager projectId={editingProjectId} /></div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className={TH_CLASS}>Código</th>
                <th className={TH_CLASS}>Dirección</th>
                <th className={TH_CLASS}>Estado</th>
                <th className={`${TH_CLASS} text-right`}>Avance</th>
                <th className={`${TH_CLASS} text-right`}>Monto Préstamo</th>
                <th className={TH_CLASS}>CO Target</th>
                <th className={TH_CLASS}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, idx) => {
                const status = PROJECT_STATUS_BADGE[p.status ?? "on_track"] || PROJECT_STATUS_BADGE.on_track;
                return (
                  <tr
                    key={p.id}
                    className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 cursor-pointer transition-colors`}
                    onClick={() => navigate(`/admin/proyecto/${p.id}`)}
                  >
                    <td className={`${TD_CLASS} font-semibold text-[#0F1B2D]`}>{p.code}</td>
                    <td className={TD_CLASS}>{p.address}</td>
                    <td className={TD_CLASS}>
                      <Badge className={badgeClass(status.bg, status.text)}>{status.label}</Badge>
                    </td>
                    <td className={`${TD_CLASS} text-right font-mono`}>{p.progress_pct}%</td>
                    <td className={`${TD_CLASS} text-right font-mono`}>{fmt(p.loan_amount)}</td>
                    <td className={TD_CLASS}>{p.co_target_date || "—"}</td>
                    <td className={TD_CLASS} onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className={`h-7 ${BTN_SECONDARY}`} onClick={() => openEditModal(p)}>Editar</Button>
                        <Button variant="outline" size="sm" className={`h-7 ${BTN_SECONDARY}`} onClick={() => { setAssignProjectId(p.id); setAssignModalOpen(true); }}>
                          {p.client_user_id ? "Reasignar" : "Asignar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-[12px]">No hay proyectos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar Cliente al Proyecto</DialogTitle></DialogHeader>
          <form onSubmit={handleAssignClient} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[11px] text-gray-400">Email del Cliente (debe estar registrado)</Label>
              <Input type="email" required value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <Button type="submit" className={`w-full ${BTN_PRIMARY}`}>Asignar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsSection;
