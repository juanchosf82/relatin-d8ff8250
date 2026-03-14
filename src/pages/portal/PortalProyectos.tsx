import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FolderKanban, MapPin, ChevronRight } from "lucide-react";

const PortalProyectos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("*")
      .eq("client_user_id", user.id)
      .then(({ data }) => { if (data) setProjects(data); });
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderKanban className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Mis Proyectos</h1>
        <span className="ml-auto text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
          {projects.length} proyecto{projects.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-3">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/portal/proyecto/${p.id}`)}
            className="flex items-center gap-4 bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {p.code}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p.address}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {p.gc_name || "—"} · {p.status || "active"}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {p.progress_pct != null ? `${p.progress_pct}%` : "—"}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No hay proyectos asignados.</p>
        )}
      </div>
    </div>
  );
};

export default PortalProyectos;
