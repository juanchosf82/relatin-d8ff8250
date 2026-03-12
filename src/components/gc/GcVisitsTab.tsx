import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGcAuth } from "@/hooks/useGcAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, Plus } from "lucide-react";

interface Visit {
  id: string;
  visit_date: string;
  visited_by: string;
  phase: string | null;
  general_summary: string | null;
  workers_on_site: number | null;
  weather_conditions: string | null;
  created_at: string;
}

const PHASES = ["Pre-construcción", "Demolición", "Cimentación", "Estructura", "Obra gris", "Acabados", "Entrega"];
const WEATHER = ["Clear", "Cloudy", "Rain", "Storm"];

const GcVisitsTab = ({ projectId }: { projectId: string }) => {
  const { gcProfile } = useGcAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().split("T")[0],
    phase: "",
    general_summary: "",
    weather_conditions: "Clear",
    workers_on_site: "",
    highlights: "",
    concerns: "",
    next_visit_date: "",
  });

  const fetchVisits = async () => {
    const { data } = await supabase
      .from("field_visits")
      .select("id, visit_date, visited_by, phase, general_summary, workers_on_site, weather_conditions, created_at")
      .eq("project_id", projectId)
      .order("visit_date", { ascending: false });
    setVisits(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchVisits(); }, [projectId]);

  const handleCreate = async () => {
    if (!form.visit_date) { toast.error("Fecha requerida"); return; }
    setSaving(true);

    const { error } = await supabase.from("field_visits").insert({
      project_id: projectId,
      visit_date: form.visit_date,
      visited_by: gcProfile?.contact_name || "GC",
      phase: form.phase || null,
      general_summary: form.general_summary || null,
      weather_conditions: form.weather_conditions || null,
      workers_on_site: form.workers_on_site ? parseInt(form.workers_on_site) : null,
      highlights: form.highlights || null,
      concerns: form.concerns || null,
      next_visit_date: form.next_visit_date || null,
      visible_to_client: false,
    });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("✓ Visita reportada");
      setForm({ visit_date: new Date().toISOString().split("T")[0], phase: "", general_summary: "", weather_conditions: "Clear", workers_on_site: "", highlights: "", concerns: "", next_visit_date: "" });
      setModalOpen(false);
      fetchVisits();
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E07B39]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-gray-400">Reporta tus visitas de campo. Las visitas son revisadas por 360lateral.</p>
        <Button onClick={() => setModalOpen(true)} size="sm" className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
          <Plus className="h-3.5 w-3.5 mr-1" /> Reportar Visita
        </Button>
      </div>

      {visits.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-[13px]">No hay visitas reportadas</div>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <div key={v.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#E07B39]" />
                  <span className="text-[13px] font-bold text-[#0F1B2D]">{v.visit_date}</span>
                  {v.phase && <span className="text-[10px] bg-[#E07B39]/10 text-[#E07B39] px-2 py-0.5 rounded-full font-semibold">{v.phase}</span>}
                </div>
                <span className="text-[11px] text-gray-400">por {v.visited_by}</span>
              </div>
              {v.general_summary && <p className="text-[12px] text-gray-600 mt-1">{v.general_summary}</p>}
              <div className="flex gap-4 mt-2 text-[11px] text-gray-400">
                {v.workers_on_site != null && <span>👷 {v.workers_on_site} trabajadores</span>}
                {v.weather_conditions && <span>🌤 {v.weather_conditions}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Visit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#E07B39]" /> Reportar Visita de Campo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-500">Fecha *</Label>
                <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} className="text-[12px] h-9" />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Fase</Label>
                <Select value={form.phase} onValueChange={(v) => setForm({ ...form, phase: v })}>
                  <SelectTrigger className="text-[12px] h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Resumen general</Label>
              <Textarea value={form.general_summary} onChange={(e) => setForm({ ...form, general_summary: e.target.value })} className="text-[12px] min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-500">Clima</Label>
                <Select value={form.weather_conditions} onValueChange={(v) => setForm({ ...form, weather_conditions: v })}>
                  <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{WEATHER.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Trabajadores en sitio</Label>
                <Input type="number" value={form.workers_on_site} onChange={(e) => setForm({ ...form, workers_on_site: e.target.value })} className="text-[12px] h-9" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Puntos destacados</Label>
              <Textarea value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} className="text-[12px] min-h-[50px]" />
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Preocupaciones</Label>
              <Textarea value={form.concerns} onChange={(e) => setForm({ ...form, concerns: e.target.value })} className="text-[12px] min-h-[50px]" />
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Próxima visita</Label>
              <Input type="date" value={form.next_visit_date} onChange={(e) => setForm({ ...form, next_visit_date: e.target.value })} className="text-[12px] h-9" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-[11px]">Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving} className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
                {saving ? "Guardando..." : "Guardar Visita"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GcVisitsTab;
