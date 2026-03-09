import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProjectPermissions {
  view_financials: boolean;
  download_reports: boolean;
  view_draws: boolean;
}

const DEFAULT_PERMISSIONS: ProjectPermissions = {
  view_financials: true,
  download_reports: true,
  view_draws: true,
};

export const useProjectPermissions = (projectId: string | undefined) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ProjectPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("user_project_access")
        .select("permissions")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .maybeSingle();

      if (data?.permissions) {
        setPermissions({
          view_financials: data.permissions.view_financials !== false,
          download_reports: data.permissions.download_reports !== false,
          view_draws: data.permissions.view_draws !== false,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user, projectId]);

  return { permissions, loading };
};
