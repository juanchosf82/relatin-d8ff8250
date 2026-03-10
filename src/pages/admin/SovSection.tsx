import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SOVTable from "@/components/SOVTable";
import GCFeeAnalysis from "@/components/GCFeeAnalysis";
import { PAGE_TITLE, KPI_LABEL } from "@/lib/design-system";

const fmt = (v: number | null | undefined) =>
  v != null ? v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }) : "—";

const SovSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [sovLines, setSovLines] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("projects").select("id, code, address, gc_name, loan_amount, co_target_date, gc_construction_fee_pct").then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null);
      setSovLines([]);
      return;
    }
    const p = projects.find((p) => p.id === selectedProjectId);
    setSelectedProject(p || null);
    // Fetch sov lines for GCFeeAnalysis
    supabase.from("sov_lines").select("*").eq("project_id", selectedProjectId).order("line_number").then(({ data }) => {
      setSovLines(data ?? []);
    });
  }, [selectedProjectId, projects]);

  const gcFeePct = selectedProject?.gc_construction_fee_pct ?? 0;

  return (
    <div className="space-y-4">
      <h2 className={PAGE_TITLE}>Avance SOV</h2>

      <div className="w-full max-w-md">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.code} - {p.address}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProject && (
        <div className="bg-[#0F1B2D] text-white rounded-lg p-4 flex flex-wrap gap-x-8 gap-y-1 text-[12px]">
          <div><span className={KPI_LABEL}>Proyecto:</span> <span className="ml-1 font-semibold text-[#0D7377]">{selectedProject.code}</span></div>
          <div><span className={KPI_LABEL}>Dirección:</span> <span className="ml-1 text-white/80">{selectedProject.address}</span></div>
          {selectedProject.gc_name && <div><span className={KPI_LABEL}>GC:</span> <span className="ml-1 text-white/80">{selectedProject.gc_name}</span></div>}
          <div><span className={KPI_LABEL}>Loan:</span> <span className="ml-1 text-white/80">{fmt(selectedProject.loan_amount)}</span></div>
          <div><span className={KPI_LABEL}>CO Target:</span> <span className="ml-1 text-white/80">{selectedProject.co_target_date || "—"}</span></div>
          <div><span className={KPI_LABEL}>Construction Fee:</span> <span className="ml-1 font-semibold text-[#0D7377]">{gcFeePct}%</span></div>
        </div>
      )}

      {selectedProjectId && (
        <>
          <SOVTable
            projectId={selectedProjectId}
            canEdit={true}
            showUpload={true}
            showExport={true}
            gcFeePct={gcFeePct}
          />
          <GCFeeAnalysis sovLines={sovLines} feePct={gcFeePct} isAdmin />
        </>
      )}
    </div>
  );
};

export default SovSection;
