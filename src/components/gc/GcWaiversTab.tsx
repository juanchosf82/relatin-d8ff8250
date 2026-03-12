import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollText, Plus, ExternalLink } from "lucide-react";
import FileUploadSource from "@/components/FileUploadSource";

interface Waiver {
  id: string;
  waiver_type: string;
  draw_id: string | null;
  amount: number | null;
  through_date: string | null;
  status: string | null;
  file_url: string | null;
  file_filename: string | null;
  submitted_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Draw {
  id: string;
  draw_number: number;
}

const WAIVER_TYPES = [
  { value: "conditional_progress", label: "Conditional Waiver on Progress Payment" },
  { value: "unconditional_progress", label: "Unconditional Waiver on Progress Payment" },
  { value: "conditional_final", label: "Conditional Waiver on Final Payment" },
  { value: "unconditional_final", label: "Unconditional Waiver on Final Payment" },
];

const GcWaiversTab = ({ projectId }: { projectId: string }) => {
  const { user } = useAuth();
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ waiver_type: "conditional_progress", draw_id: "", amount: "", through_date: "", notes: "" });
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState("");

  const fetchData = async () => {
    const [waiversRes, drawsRes] = await Promise.all([
      supabase.from("gc_waivers" as any).select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("draws").select("id, draw_number").eq("project_id", projectId).order("draw_number"),
    ]);
    setWaivers((waiversRes.data as any[]) ?? []);
    setDraws(drawsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const handleFileSelected = async (file: File) => {
    const path = `project_files/gc_waivers/${projectId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("project_files").upload(path, file);
    if (error) { toast.error("Error subiendo archivo"); return; }
    const { data } = supabase.storage.from("project_files").getPublicUrl(path);
    setUploadedUrl(data.publicUrl);
    setUploadedFilename(file.name);
    toast.success("✓ Archivo adjuntado");
  };

  const handleSubmit = async () => {
    if (!uploadedUrl) { toast.error("Adjunta el documento del waiver"); return; }
    if (!form.amount) { toast.error("Monto requerido"); return; }
    if (!form.through_date) { toast.error("Fecha 'through' requerida"); return; }
    setSaving(true);

    const { error } = await supabase.from("gc_waivers" as any).insert({
      project_id: projectId,
      gc_user_id: user?.id,
      waiver_type: form.waiver_type,
      draw_id: form.draw_id || null,
      amount: parseFloat(form.amount),
      through_date: form.through_date,
      file_url: uploadedUrl,
      file_filename: uploadedFilename,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      notes: form.notes || null,
    } as any);

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("✓ Waiver enviado");
      setForm({ waiver_type: "conditional_progress", draw_id: "", amount: "", through_date: "", notes: "" });
      setUploadedUrl("");
      setUploadedFilename("");
      setModalOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const statusStyle: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500",
    submitted: "bg-blue-50 text-blue-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };

  const statusLabel: Record<string, string> = {
    pending: "Pendiente",
    submitted: "Enviado",
    approved: "Aprobado ✓",
    rejected: "Rechazado",
  };

  const typeLabel = (t: string) => WAIVER_TYPES.find((w) => w.value === t)?.label || t;
  const fmt = (n: number | null) => n != null ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E07B39]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-gray-400">Waivers & Releases — Florida Statute Chapter 713</p>
        <Button onClick={() => setModalOpen(true)} size="sm" className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
          <Plus className="h-3.5 w-3.5 mr-1" /> Subir Waiver
        </Button>
      </div>

      {waivers.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-[13px]">No hay waivers registrados</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#0F1B2D] text-white">
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Tipo</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Draw</th>
                <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Monto</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Through</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Estado</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Archivo</th>
              </tr>
            </thead>
            <tbody>
              {waivers.map((w, i) => {
                const draw = draws.find((d) => d.id === w.draw_id);
                return (
                  <tr key={w.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-3 py-2 text-[#0F1B2D] font-medium max-w-[200px]">
                      <span className="text-[11px]">{typeLabel(w.waiver_type)}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{draw ? `Draw #${draw.draw_number}` : "—"}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmt(w.amount)}</td>
                    <td className="px-3 py-2 text-gray-500">{w.through_date || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${statusStyle[w.status || "pending"]}`}>
                        {statusLabel[w.status || "pending"]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {w.file_url && (
                        <a href={w.file_url} target="_blank" rel="noopener noreferrer" className="text-[#E07B39] hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> Ver
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Waiver Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-[#E07B39]" /> Subir Waiver
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[11px] text-gray-500">Tipo de waiver *</Label>
              <Select value={form.waiver_type} onValueChange={(v) => setForm({ ...form, waiver_type: v })}>
                <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WAIVER_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-[12px]">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Draw relacionado</Label>
              <Select value={form.draw_id} onValueChange={(v) => setForm({ ...form, draw_id: v })}>
                <SelectTrigger className="text-[12px] h-9"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {draws.map((d) => <SelectItem key={d.id} value={d.id}>Draw #{d.draw_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-500">Monto *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="text-[12px] h-9" placeholder="$0.00" />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Fecha "Through" *</Label>
                <Input type="date" value={form.through_date} onChange={(e) => setForm({ ...form, through_date: e.target.value })} className="text-[12px] h-9" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Adjuntar documento *</Label>
              <FileUploadSource
                onFileSelected={handleFileSelected}
                accept="pdf"
              />
              {uploadedFilename && <p className="text-[11px] text-emerald-600 mt-1">✓ {uploadedFilename}</p>}
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-[12px] min-h-[50px]" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-[11px]">Cancelar</Button>
              <Button size="sm" onClick={handleSubmit} disabled={saving} className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
                {saving ? "Enviando..." : "Subir Waiver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GcWaiversTab;
