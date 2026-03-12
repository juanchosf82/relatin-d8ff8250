import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGcAuth } from "@/hooks/useGcAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_BADGE, badgeClass } from "@/lib/design-system";
import GcSovTab from "@/components/gc/GcSovTab";
import GcPhotosTab from "@/components/gc/GcPhotosTab";
import GcIssuesTab from "@/components/gc/GcIssuesTab";
import GcInvoicesTab from "@/components/gc/GcInvoicesTab";
import GcVisitsTab from "@/components/gc/GcVisitsTab";
import GcWaiversTab from "@/components/gc/GcWaiversTab";
import GcDocumentsTab from "@/components/gc/GcDocumentsTab";

interface ProjectInfo {
  id: string;
  code: string;
  address: string;
  status: string | null;
  progress_pct: number | null;
  gc_name: string | null;
  loan_amount: number | null;
  co_target_date: string | null;
}

const GcProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { hasProjectAccess, getProjectPermissions, loading: gcLoading } = useGcAuth();
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || gcLoading) return;
    const load = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, code, address, status, progress_pct, gc_name, loan_amount, co_target_date")
        .eq("id", id)
        .maybeSingle();
      setProject(data);
      setLoading(false);
    };
    load();
  }, [id, gcLoading]);

  if (loading || gcLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E07B39]" />
      </div>
    );
  }

  if (!id || !hasProjectAccess(id)) {
    return <Navigate to="/gc/dashboard" replace />;
  }

  if (!project) {
    return <div className="text-center py-12 text-gray-400">Proyecto no encontrado</div>;
  }

  const perms = getProjectPermissions(id);
  const status = PROJECT_STATUS_BADGE[project.status ?? "on_track"] || PROJECT_STATUS_BADGE.on_track;

  const tabs: { key: string; label: string; perm: string }[] = [
    { key: "sov", label: "SOV", perm: "sov_update" },
    { key: "fotos", label: "Fotos", perm: "photos_upload" },
    { key: "issues", label: "Issues", perm: "issues_manage" },
    { key: "invoices", label: "Invoices", perm: "invoices_upload" },
    { key: "visitas", label: "Visitas", perm: "visits_report" },
    { key: "waivers", label: "Waivers", perm: "waivers_upload" },
    { key: "documentos", label: "Documentos", perm: "docs_view" },
  ];

  const visibleTabs = tabs.filter((t) => perms[t.perm] !== false);
  const defaultTab = visibleTabs[0]?.key || "sov";

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Project Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-bold text-[#0F1B2D]">{project.code}</h1>
              <Badge className={badgeClass(status.bg, status.text)}>{status.label}</Badge>
            </div>
            <p className="text-[12px] text-gray-500 mt-0.5">{project.address}</p>
          </div>
          <div className="flex gap-4 text-[11px] text-gray-500">
            {project.gc_name && <span>GC: <b className="text-[#0F1B2D]">{project.gc_name}</b></span>}
            {project.co_target_date && <span>CO Target: <b className="text-[#0F1B2D]">{project.co_target_date}</b></span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {visibleTabs.length > 0 && (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="bg-gray-100 mb-4 flex-wrap">
            {visibleTabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-[12px] data-[state=active]:text-[#E07B39]">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {perms.sov_update !== false && (
            <TabsContent value="sov">
              <GcSovTab projectId={id} />
            </TabsContent>
          )}
          {perms.photos_upload !== false && (
            <TabsContent value="fotos">
              <GcPhotosTab projectId={id} />
            </TabsContent>
          )}
          {perms.issues_manage !== false && (
            <TabsContent value="issues">
              <GcIssuesTab projectId={id} />
            </TabsContent>
          )}
          {perms.invoices_upload !== false && (
            <TabsContent value="invoices">
              <GcInvoicesTab projectId={id} />
            </TabsContent>
          )}
          {perms.visits_report !== false && (
            <TabsContent value="visitas">
              <GcVisitsTab projectId={id} />
            </TabsContent>
          )}
          {perms.waivers_upload !== false && (
            <TabsContent value="waivers">
              <GcWaiversTab projectId={id} />
            </TabsContent>
          )}
          <TabsContent value="documentos">
            <GcDocumentsTab projectId={id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default GcProjectDetail;
