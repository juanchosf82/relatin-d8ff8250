import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, AlertTriangle, Info } from "lucide-react";

const PortalAlertas = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, code")
        .eq("client_user_id", user.id);
      if (!projects?.length) return;
      const ids = projects.map((p) => p.id);
      const { data } = await supabase
        .from("issues")
        .select("*")
        .in("project_id", ids)
        .eq("visible_to_client", true)
        .order("opened_at", { ascending: false })
        .limit(20);
      if (data) setIssues(data.map((i) => ({ ...i, projectCode: projects.find((p) => p.id === i.project_id)?.code })));
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Alertas</h1>
        {issues.length > 0 && (
          <span className="ml-auto text-xs bg-destructive/10 text-destructive px-2.5 py-1 rounded-full font-medium">
            {issues.length} alerta{issues.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="grid gap-3">
        {issues.map((i) => (
          <div key={i.id} className="flex items-center gap-4 bg-card border border-border rounded-2xl p-5 border-l-4 border-l-destructive">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{i.title || i.description}</p>
              <p className="text-xs text-muted-foreground">{i.projectCode} · {i.severity || i.level} · {i.opened_at?.slice(0, 10)}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{i.status}</span>
          </div>
        ))}
        {issues.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <Info className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay alertas activas. ¡Todo en orden!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalAlertas;
