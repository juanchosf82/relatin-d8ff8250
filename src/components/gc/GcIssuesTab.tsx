import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus } from "lucide-react";

interface Issue {
  id: string;
  title: string | null;
  description: string;
  category: string | null;
  severity: string | null;
  status: string | null;
  level: string;
  opened_at: string | null;
  resolved_at: string | null;
}

const CATEGORIES = ["Structural", "MEP", "Finishes", "Safety", "Quality", "Schedule", "Other"];
const SEVERITIES = ["low", "medium", "high", "critical"];

const GcIssuesTab = ({ projectId }: { projectId: string }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Other",
    severity: "medium",
  });

  const fetchIssues = async () => {
    const { data } = await supabase
      .from("issues")
      .select("id, title, description, category, severity, status, level, opened_at, resolved_at")
      .eq("project_id", projectId)
      .order("opened_at", { ascending: false });
    setIssues(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchIssues(); }, [projectId]);

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Título requerido"); return; }
    setSaving(true);

    const { error } = await supabase.from("issues").insert({
      project_id: projectId,
      title: form.title,
      description: form.description || form.title,
      category: form.category,
      severity: form.severity,
      level: "project",
      status: "open",
      visible_to_client: false,
    });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("✓ Issue creado");
      setForm({ title: "", description: "", category: "Other", severity: "medium" });
      setModalOpen(false);
      fetchIssues();
    }
    setSaving(false);
  };

  const severityColor: Record<string, string> = {
    low: "bg-blue-50 text-blue-700",
    medium: "bg-yellow-50 text-yellow-700",
    high: "bg-orange-50 text-orange-700",
    critical: "bg-red-50 text-red-700",
  };

  const statusColor: Record<string, string> = {
    open: "bg-red-50 text-red-700",
    in_progress: "bg-blue-50 text-blue-700",
    resolved: "bg-emerald-50 text-emerald-700",
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E07B39]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-gray-400">Issues del proyecto — los issues creados por GC son revisados por 360lateral.</p>
        <Button onClick={() => setModalOpen(true)} size="sm" className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
          <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo Issue
        </Button>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-[13px]">No hay issues registrados</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#0F1B2D] text-white">
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Título</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Categoría</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Severidad</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Estado</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, i) => (
                <tr key={issue.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className="px-3 py-2 font-medium text-[#0F1B2D]">{issue.title || issue.description.slice(0, 50)}</td>
                  <td className="px-3 py-2 text-gray-500">{issue.category || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${severityColor[issue.severity || "medium"]}`}>
                      {issue.severity || "medium"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${statusColor[issue.status || "open"]}`}>
                      {issue.status || "open"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400">{issue.opened_at ? new Date(issue.opened_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Issue Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#E07B39]" /> Nuevo Issue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[11px] text-gray-500">Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="text-[12px] h-9" />
            </div>
            <div>
              <Label className="text-[11px] text-gray-500">Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-[12px] min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-500">Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Severidad</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-[11px]">Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving} className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GcIssuesTab;
