import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface GcProfile {
  id: string;
  user_id: string;
  company_name: string;
  license_number: string | null;
  contact_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  status: string | null;
}

interface GcProjectAccess {
  id: string;
  gc_user_id: string;
  project_id: string;
  permissions: Record<string, boolean>;
}

export const useGcAuth = () => {
  const { user } = useAuth();
  const [isGc, setIsGc] = useState(false);
  const [gcProfile, setGcProfile] = useState<GcProfile | null>(null);
  const [gcAccess, setGcAccess] = useState<GcProjectAccess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsGc(false);
      setGcProfile(null);
      setGcAccess([]);
      setLoading(false);
      return;
    }

    const check = async () => {
      // Check if user has gc role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "gc" as any)
        .maybeSingle();

      if (!roleData) {
        setIsGc(false);
        setLoading(false);
        return;
      }

      setIsGc(true);

      // Get GC profile
      const { data: profile } = await supabase
        .from("gc_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) setGcProfile(profile as any);

      // Get project access
      const { data: access } = await supabase
        .from("gc_project_access" as any)
        .select("*")
        .eq("gc_user_id", user.id);

      if (access) setGcAccess(access as any);
      setLoading(false);
    };

    check();
  }, [user]);

  const hasProjectAccess = (projectId: string) => {
    return gcAccess.some((a) => a.project_id === projectId);
  };

  const getProjectPermissions = (projectId: string) => {
    const access = gcAccess.find((a) => a.project_id === projectId);
    return access?.permissions || {};
  };

  return { isGc, gcProfile, gcAccess, loading, hasProjectAccess, getProjectPermissions };
};
