import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SOVTable from "@/components/SOVTable";
import { PAGE_TITLE } from "@/lib/design-system";

const SovSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    supabase.from("projects").select("id, code, address").then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

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

      {selectedProjectId && (
        <SOVTable
          projectId={selectedProjectId}
          canEdit={true}
          showUpload={true}
          showExport={true}
        />
      )}
    </div>
  );
};

export default SovSection;
