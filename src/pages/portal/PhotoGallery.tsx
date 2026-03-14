import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoItem {
  id: string;
  url: string;
  caption: string | null;
  date: string;
  groupDate: string;
  groupLabel: string;
  source: "visit" | "document";
}

interface DateGroup {
  date: string;
  label: string;
  sublabel: string;
  photos: PhotoItem[];
}

const PhotoGallery = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [visitFilter, setVisitFilter] = useState<string>("all");
  const [visits, setVisits] = useState<{ id: string; visit_date: string }[]>([]);
  const [project, setProject] = useState<{ code: string; address: string } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      setLoading(true);

      const [projRes, visitsRes, visitPhotosRes, docsRes] = await Promise.all([
        supabase.from("projects").select("code, address").eq("id", projectId).maybeSingle(),
        supabase.from("field_visits").select("id, visit_date").eq("project_id", projectId).order("visit_date", { ascending: false }),
        supabase
          .from("visit_photos")
          .select("id, photo_url, caption, created_at, visit_id, field_visits!inner(visit_date, visited_by)")
          .eq("project_id", projectId)
          .eq("visible_to_client", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_documents")
          .select("id, file_url, name, uploaded_at")
          .eq("project_id", projectId)
          .eq("visible_to_client", true)
          .or("file_url.ilike.%.jpg,file_url.ilike.%.jpeg,file_url.ilike.%.png,file_url.ilike.%.webp")
          .order("uploaded_at", { ascending: false }),
      ]);

      setProject(projRes.data);
      setVisits(visitsRes.data || []);

      const items: PhotoItem[] = [];
      (visitPhotosRes.data || []).forEach((vp: any) => {
        items.push({
          id: `vp-${vp.id}`,
          url: vp.photo_url,
          caption: vp.caption,
          date: vp.field_visits?.visit_date || vp.created_at || "",
          groupDate: vp.field_visits?.visit_date || "",
          groupLabel: `Field Visit · ${vp.field_visits?.visited_by || ""}`,
          source: "visit",
        });
      });
      (docsRes.data || []).forEach((doc) => {
        if (!doc.file_url) return;
        items.push({
          id: `doc-${doc.id}`,
          url: doc.file_url,
          caption: doc.name,
          date: doc.uploaded_at || "",
          groupDate: doc.uploaded_at?.slice(0, 10) || "",
          groupLabel: "Documento",
          source: "document",
        });
      });

      items.sort((a, b) => b.date.localeCompare(a.date));
      setAllPhotos(items);
      buildGroups(items, "all");
      setLoading(false);
    };
    load();
  }, [projectId]);

  const buildGroups = (items: PhotoItem[], filter: string) => {
    const filtered = filter === "all" ? items : items.filter((p) => {
      if (p.source === "visit") {
        // Match by visit date from visits list
        const visit = visits.find((v) => v.visit_date === p.groupDate);
        return visit?.id === filter;
      }
      return false;
    });

    const map = new Map<string, DateGroup>();
    filtered.forEach((item) => {
      const key = item.groupDate;
      if (!map.has(key)) {
        const d = new Date(key);
        map.set(key, {
          date: key,
          label: d.toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
          sublabel: item.groupLabel,
          photos: [],
        });
      }
      map.get(key)!.photos.push(item);
    });
    setGroups(Array.from(map.values()));
  };

  useEffect(() => {
    buildGroups(allPhotos, visitFilter);
  }, [visitFilter, allPhotos, visits]);

  // Keyboard for lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const flatPhotos = groups.flatMap((g) => g.photos);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft" && lightboxIdx > 0) setLightboxIdx(lightboxIdx - 1);
      if (e.key === "ArrowRight" && lightboxIdx < flatPhotos.length - 1) setLightboxIdx(lightboxIdx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, groups]);

  const flatPhotos = groups.flatMap((g) => g.photos);
  const lightboxPhoto = lightboxIdx !== null ? flatPhotos[lightboxIdx] : null;

  let globalIdx = 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/portal")}
          className="text-[12px] text-[#0D7377] hover:underline flex items-center gap-1 mb-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Volver al portafolio
        </button>
        <h1 className="text-[22px] font-bold text-[#0F1B2D]">
          Photo Timeline — {project?.code || ""}
        </h1>
        <p className="text-[13px] text-gray-400">{project?.address || ""}</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={visitFilter === "all" ? "default" : "outline"}
          size="sm"
          className="h-8 text-[11px]"
          onClick={() => setVisitFilter("all")}
        >
          Todas
        </Button>
        {visits.map((v) => (
          <Button
            key={v.id}
            variant={visitFilter === v.id ? "default" : "outline"}
            size="sm"
            className="h-8 text-[11px]"
            onClick={() => setVisitFilter(v.id)}
          >
            {new Date(v.visit_date).toLocaleDateString("es", { month: "short", day: "numeric" })}
          </Button>
        ))}
      </div>

      {/* Gallery grid grouped by date */}
      {groups.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-[32px] text-gray-400 mb-2">📷</p>
          <p className="text-[13px] text-[#0F1B2D] font-medium">No photos found</p>
        </div>
      ) : (
        groups.map((group) => {
          const startIdx = globalIdx;
          return (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[11px] text-gray-400 uppercase tracking-wide flex-shrink-0">
                  {group.label} · {group.sublabel}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {group.photos.map((photo, pIdx) => {
                  const idx = startIdx + pIdx;
                  globalIdx = idx + 1;
                  return (
                    <button
                      key={photo.id}
                      onClick={() => setLightboxIdx(idx)}
                      className="relative rounded-xl overflow-hidden group cursor-pointer aspect-square"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || ""}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-150"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-[#0F4D52]/0 group-hover:bg-[#0F4D52]/30 transition-colors flex items-center justify-center">
                        <Search className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[11px] truncate">{photo.caption}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Lightbox */}
      {lightboxPhoto && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: "rgba(15, 27, 45, 0.96)" }}
          onClick={() => setLightboxIdx(null)}
        >
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-6 z-10">
            <span className="text-white/60 text-[13px]">{lightboxIdx + 1} of {flatPhotos.length}</span>
            <button onClick={() => setLightboxIdx(null)} className="text-white hover:text-white/80">
              <X className="h-6 w-6" />
            </button>
          </div>

          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          )}
          {lightboxIdx < flatPhotos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          )}

          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption || ""}
              className="max-h-[70vh] max-w-[80vw] object-contain rounded-lg"
            />
            <div className="mt-3 text-center">
              <p className="text-[12px] text-[#0D7377]">
                {new Date(lightboxPhoto.date).toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" })}
                {lightboxPhoto.groupLabel && ` · ${lightboxPhoto.groupLabel}`}
              </p>
              {lightboxPhoto.caption && <p className="text-[14px] text-white mt-1">{lightboxPhoto.caption}</p>}
            </div>

            <div className="flex gap-1.5 mt-4 max-w-[80vw] overflow-x-auto py-1">
              {flatPhotos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setLightboxIdx(idx)}
                  className={`w-14 h-14 rounded flex-shrink-0 overflow-hidden border-2 transition-colors ${
                    idx === lightboxIdx ? "border-[#0D7377]" : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
