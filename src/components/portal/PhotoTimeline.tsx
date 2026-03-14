import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, X, Search } from "lucide-react";

interface PhotoItem {
  id: string;
  url: string;
  caption: string | null;
  date: string;
  groupLabel: string;
  groupDate: string;
  source: "visit" | "document";
}

interface DateGroup {
  date: string;
  label: string;
  sublabel: string;
  photos: PhotoItem[];
}

interface Props {
  projectIds: string[];
  onViewAll?: (projectId: string) => void;
}

const PhotoTimeline = ({ projectIds, onViewAll }: Props) => {
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (projectIds.length === 0) return;
    const load = async () => {
      setLoading(true);
      const allItems: PhotoItem[] = [];

      for (const projectId of projectIds) {
        const [visitPhotosRes, docsRes] = await Promise.all([
          supabase
            .from("visit_photos")
            .select("id, photo_url, caption, created_at, visit_id, visible_to_client, field_visits!inner(visit_date, visited_by)")
            .eq("project_id", projectId)
            .eq("visible_to_client", true)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("project_documents")
            .select("id, file_url, name, uploaded_at")
            .eq("project_id", projectId)
            .eq("visible_to_client", true)
            .or("file_url.ilike.%.jpg,file_url.ilike.%.jpeg,file_url.ilike.%.png,file_url.ilike.%.webp")
            .order("uploaded_at", { ascending: false })
            .limit(10),
        ]);

        const visitPhotos = visitPhotosRes.data || [];
        visitPhotos.forEach((vp: any) => {
          const visitDate = vp.field_visits?.visit_date || "";
          const visitLabel = vp.field_visits?.visited_by || "Field Visit";
          allItems.push({
            id: `vp-${vp.id}`,
            url: vp.photo_url,
            caption: vp.caption,
            date: visitDate || vp.created_at || "",
            groupDate: visitDate,
            groupLabel: visitLabel,
            source: "visit",
          });
        });

        const docs = docsRes.data || [];
        docs.forEach((doc) => {
          if (!doc.file_url) return;
          allItems.push({
            id: `doc-${doc.id}`,
            url: doc.file_url,
            caption: doc.name,
            date: doc.uploaded_at || "",
            groupDate: doc.uploaded_at?.slice(0, 10) || "",
            groupLabel: "Documento",
            source: "document",
          });
        });
      }

      // Sort by date DESC
      allItems.sort((a, b) => b.date.localeCompare(a.date));
      setAllPhotos(allItems);

      // Group by date
      const groupMap = new Map<string, DateGroup>();
      allItems.forEach((item) => {
        const key = item.groupDate;
        if (!groupMap.has(key)) {
          const d = new Date(key);
          groupMap.set(key, {
            date: key,
            label: d.toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
            sublabel: item.source === "visit" ? `Field Visit · ${item.groupLabel}` : "Documentos",
            photos: [],
          });
        }
        groupMap.get(key)!.photos.push(item);
      });

      setGroups(Array.from(groupMap.values()));
      setLoading(false);
    };
    load();
  }, [projectIds]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", updateScrollState);
    return () => el?.removeEventListener("scroll", updateScrollState);
  }, [groups, updateScrollState]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft" && lightboxIdx > 0) setLightboxIdx(lightboxIdx - 1);
      if (e.key === "ArrowRight" && lightboxIdx < allPhotos.length - 1) setLightboxIdx(lightboxIdx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, allPhotos.length]);

  const openLightbox = (globalIdx: number) => setLightboxIdx(globalIdx);

  // Map group photos to global index
  const getGlobalIndex = (groupIdx: number, photoIdx: number): number => {
    let count = 0;
    for (let g = 0; g < groupIdx; g++) count += groups[g].photos.length;
    return count + photoIdx;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" />
        </div>
      </div>
    );
  }

  if (allPhotos.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
        <p className="text-[32px] text-gray-400 mb-2">📷</p>
        <p className="text-[13px] text-[#0F1B2D] font-medium">No photos yet</p>
        <p className="text-[12px] text-gray-400 mt-1">
          Field visit photos will appear here as 360lateral documents progress.
        </p>
      </div>
    );
  }

  const lightboxPhoto = lightboxIdx !== null ? allPhotos[lightboxIdx] : null;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#0F1B2D] flex items-center gap-2">
            📸 Photo Timeline
          </h2>
          {projectIds.length === 1 && onViewAll && (
            <button
              onClick={() => onViewAll(projectIds[0])}
              className="text-[12px] text-[#0D7377] hover:underline font-medium flex items-center gap-0.5"
            >
              Ver todas las fotos <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable timeline */}
        <div className="relative">
          {canScrollLeft && (
            <button
              onClick={() => scroll(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-8 overflow-x-auto py-4 px-1 scrollbar-thin"
            style={{ scrollbarColor: "#0D7377 #f3f4f6" }}
          >
            {/* Timeline connector line */}
            <div className="absolute top-[26px] left-0 right-0 h-px bg-[#0D7377]/10 pointer-events-none" />

            {groups.map((group, gIdx) => (
              <div key={group.date} className="flex-shrink-0 min-w-[280px]">
                {/* Date label with dot */}
                <div className="flex items-start gap-2 mb-3 relative">
                  <span className="w-2 h-2 rounded-full bg-[#0D7377] mt-1 flex-shrink-0 relative z-[1]" />
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-[0.08em]">
                      {group.label}
                    </p>
                    <p className="text-[13px] text-[#0F1B2D] font-medium">{group.sublabel}</p>
                  </div>
                </div>

                {/* Photo row */}
                <div className="flex gap-2">
                  {group.photos.slice(0, 2).map((photo, pIdx) => (
                    <button
                      key={photo.id}
                      onClick={() => openLightbox(getGlobalIndex(gIdx, pIdx))}
                      className="relative w-[120px] h-[90px] rounded-[10px] overflow-hidden border border-gray-100 cursor-pointer group flex-shrink-0"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || ""}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-150"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-[#0F4D52]/0 group-hover:bg-[#0F4D52]/30 transition-colors flex items-center justify-center">
                        <Search className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                  {group.photos.length > 2 && (
                    <button
                      onClick={() => openLightbox(getGlobalIndex(gIdx, 2))}
                      className="w-[120px] h-[90px] rounded-[10px] bg-gray-900/80 flex flex-col items-center justify-center flex-shrink-0 cursor-pointer hover:bg-gray-900/90 transition-colors"
                    >
                      <span className="text-white text-[18px] font-bold">+{group.photos.length - 2}</span>
                      <span className="text-white/60 text-[11px]">more photos</span>
                    </button>
                  )}
                </div>

                {/* Caption under photos */}
                {group.photos[0]?.caption && (
                  <p className="text-[11px] text-gray-400 mt-2 truncate max-w-[280px]">
                    {group.photos[0].caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxPhoto && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: "rgba(15, 27, 45, 0.96)" }}
          onClick={() => setLightboxIdx(null)}
        >
          {/* Top bar */}
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-6 z-10">
            <span className="text-white/60 text-[13px]">
              {lightboxIdx + 1} of {allPhotos.length}
            </span>
            <button
              onClick={() => setLightboxIdx(null)}
              className="text-white hover:text-white/80 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation arrows */}
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          )}
          {lightboxIdx < allPhotos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          )}

          {/* Main image */}
          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption || ""}
              className="max-h-[70vh] max-w-[80vw] object-contain rounded-lg"
            />
            <div className="mt-3 text-center">
              <p className="text-[12px] text-[#0D7377]">
                {new Date(lightboxPhoto.date).toLocaleDateString("es", {
                  month: "short", day: "numeric", year: "numeric",
                })}
                {lightboxPhoto.groupLabel && ` · ${lightboxPhoto.groupLabel}`}
              </p>
              {lightboxPhoto.caption && (
                <p className="text-[14px] text-white mt-1">{lightboxPhoto.caption}</p>
              )}
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-1.5 mt-4 max-w-[80vw] overflow-x-auto py-1">
              {allPhotos.map((p, idx) => (
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
    </>
  );
};

export default PhotoTimeline;
