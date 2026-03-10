import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props { projectId: string }

type Visit = {
  id: string; visit_date: string; visited_by: string; phase: string | null;
  physical_progress_observed: number | null; weather_conditions: string | null;
  workers_on_site: number | null; general_summary: string | null;
  highlights: string | null; next_visit_date: string | null;
};

type Photo = {
  id: string; photo_url: string; caption: string | null; phase: string | null;
  taken_at: string | null;
};

const CalidadClient = ({ projectId }: Props) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [openIssuesCount, setOpenIssuesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [vRes, pRes, qiRes] = await Promise.all([
        supabase.from("field_visits").select("id, visit_date, visited_by, phase, physical_progress_observed, weather_conditions, workers_on_site, general_summary, highlights, next_visit_date").eq("project_id", projectId).order("visit_date", { ascending: false }),
        supabase.from("visit_photos").select("id, photo_url, caption, phase, taken_at").eq("project_id", projectId).order("taken_at", { ascending: false }),
        supabase.from("quality_issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "open"),
      ]);
      setVisits((vRes.data ?? []) as Visit[]);
      setPhotos((pRes.data ?? []) as Photo[]);
      setOpenIssuesCount(qiRes.count ?? 0);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const lightboxPhoto = lightboxIdx !== null ? photos[lightboxIdx] : null;

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  return (
    <Tabs defaultValue="visitas">
      <TabsList className="bg-white border border-gray-200 mb-4">
        <TabsTrigger value="visitas" className="text-[12px]">Visitas</TabsTrigger>
        <TabsTrigger value="fotos" className="text-[12px]">Fotos</TabsTrigger>
      </TabsList>

      <TabsContent value="visitas">
        <div className="space-y-3">
          {openIssuesCount > 0 && (
            <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-lg p-3 text-[12px] text-[#92400E]">
              ⚠️ Puntos de atención activos: <span className="font-bold">{openIssuesCount}</span>
              <br />360lateral está coordinando la resolución.
            </div>
          )}
          {visits.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-[12px]">Sin visitas registradas</div>
          ) : (
            visits.map(v => (
              <div key={v.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <p className="text-[14px] font-bold text-[#0F1B2D] mb-1">Visita de campo — {v.visit_date}</p>
                <div className="flex flex-wrap gap-2 mb-2 text-[11px] text-gray-400">
                  <span>360lateral</span>
                  {v.phase && <span>| Fase: {v.phase}</span>}
                </div>
                {v.physical_progress_observed != null && (
                  <p className="text-[12px] text-[#0F1B2D] mb-2">Avance observado: <span className="font-bold text-[#0D7377]">{v.physical_progress_observed}%</span></p>
                )}
                {v.general_summary && <p className="text-[12px] text-gray-600 mb-2 italic">"{v.general_summary}"</p>}
                {v.highlights && <p className="text-[12px] text-gray-600 italic">"{v.highlights}"</p>}
                {v.next_visit_date && (
                  <p className="text-[11px] text-gray-400 mt-2">Próxima visita: {v.next_visit_date}</p>
                )}
              </div>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="fotos">
        <div className="space-y-3">
          <p className="text-[11px] text-gray-400">Registro fotográfico — 360lateral</p>
          {photos.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-[12px]">Sin fotos</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden cursor-pointer" onClick={() => setLightboxIdx(idx)}>
                  <div className="aspect-square">
                    <img src={photo.photo_url} alt={photo.caption || ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-[#0F1B2D] truncate">{photo.caption || ""}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      {photo.phase && <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0 text-[9px]">{photo.phase}</Badge>}
                      <span className="text-[9px] text-gray-400">{photo.taken_at ? new Date(photo.taken_at).toLocaleDateString("es") : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox */}
        {lightboxPhoto && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxIdx(null)}>
            <Button variant="ghost" className="absolute top-4 right-4 text-white h-10 w-10 p-0" onClick={() => setLightboxIdx(null)}><X className="h-6 w-6" /></Button>
            {lightboxIdx! > 0 && <Button variant="ghost" className="absolute left-4 text-white h-10 w-10 p-0" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx! - 1); }}><ChevronLeft className="h-8 w-8" /></Button>}
            {lightboxIdx! < photos.length - 1 && <Button variant="ghost" className="absolute right-4 text-white h-10 w-10 p-0" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx! + 1); }}><ChevronRight className="h-8 w-8" /></Button>}
            <div className="max-w-4xl max-h-[80vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <img src={lightboxPhoto.photo_url} alt={lightboxPhoto.caption || ""} className="max-h-[70vh] object-contain rounded" />
              <div className="mt-3 text-white text-center">
                <p className="text-[14px]">{lightboxPhoto.caption || ""}</p>
                {lightboxPhoto.phase && <span className="text-[11px] text-white/60">{lightboxPhoto.phase}</span>}
              </div>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default CalidadClient;
