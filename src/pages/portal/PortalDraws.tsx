import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Banknote } from "lucide-react";
import { fmt } from "@/lib/design-system";

const PortalDraws = () => {
  const { user } = useAuth();
  const [draws, setDraws] = useState<any[]>([]);

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
        .from("draws")
        .select("*")
        .in("project_id", ids)
        .order("draw_number", { ascending: false });
      if (data) setDraws(data.map((d) => ({ ...d, projectCode: projects.find((p) => p.id === d.project_id)?.code })));
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Banknote className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Draws</h1>
        <span className="ml-auto text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
          {draws.length} draw{draws.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-3">
        {draws.map((d) => (
          <div key={d.id} className="flex items-center gap-4 bg-card border border-border rounded-2xl p-5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              #{d.draw_number}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{d.projectCode} · Draw #{d.draw_number}</p>
              <p className="text-xs text-muted-foreground">{d.status || "pending"} · {d.request_date || "—"}</p>
            </div>
            <p className="text-sm font-bold text-foreground">{fmt.currency(d.amount_requested || 0)}</p>
          </div>
        ))}
        {draws.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <Banknote className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay draws registrados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalDraws;
