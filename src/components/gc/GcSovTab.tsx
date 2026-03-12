import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface SovLine {
  id: string;
  line_number: string;
  name: string;
  fase: string | null;
  start_date: string | null;
  end_date: string | null;
  progress_pct: number | null;
  budget: number | null;
  budget_progress_pct: number | null;
}

const GcSovTab = ({ projectId }: { projectId: string }) => {
  const [lines, setLines] = useState<SovLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetch = async () => {
    const { data } = await supabase
      .from("sov_lines")
      .select("id, line_number, name, fase, start_date, end_date, progress_pct, budget, budget_progress_pct")
      .eq("project_id", projectId)
      .order("line_number");
    setLines(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [projectId]);

  const handleSave = async (lineId: string) => {
    const val = Math.min(100, Math.max(0, parseInt(editValue) || 0));
    const { error } = await supabase
      .from("sov_lines")
      .update({ progress_pct: val })
      .eq("id", lineId);

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("✓ Avance actualizado");
      setLines((prev) => prev.map((l) => l.id === lineId ? { ...l, progress_pct: val } : l));
    }
    setEditingId(null);
  };

  const fmt = (n: number | null) => n != null ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}` : "—";

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E07B39]" /></div>;

  return (
    <div>
      <p className="text-[11px] text-gray-400 mb-3">Puedes actualizar el avance físico (%) de cada partida.</p>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-[#0F1B2D] text-white">
              <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">#</th>
              <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Actividad</th>
              <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Fase</th>
              <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Inicio</th>
              <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Fin</th>
              <th className="text-center px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-[#E07B39]">Av. Físico</th>
              <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Budget</th>
              <th className="text-center px-3 py-2 text-[11px] uppercase tracking-wider font-semibold">Av. Presup.</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-[#E07B39]/5 transition-colors`}>
                <td className="px-3 py-2 text-gray-500">{l.line_number}</td>
                <td className="px-3 py-2 font-medium text-[#0F1B2D]">{l.name}</td>
                <td className="px-3 py-2 text-gray-500">{l.fase || "—"}</td>
                <td className="px-3 py-2 text-gray-500">{l.start_date || "—"}</td>
                <td className="px-3 py-2 text-gray-500">{l.end_date || "—"}</td>
                <td className="px-3 py-2 text-center">
                  {editingId === l.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSave(l.id); if (e.key === "Escape") setEditingId(null); }}
                        className="w-16 h-7 text-center text-[12px] border-[#E07B39]"
                        autoFocus
                      />
                      <span className="text-[11px] text-gray-400">%</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(l.id); setEditValue(String(l.progress_pct ?? 0)); }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-semibold text-[#E07B39] hover:bg-[#E07B39]/10 transition-colors"
                    >
                      {l.progress_pct ?? 0}%
                      <span className="text-[10px] text-gray-400">✏️</span>
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-600">{fmt(l.budget)}</td>
                <td className="px-3 py-2 text-center text-gray-500">{l.budget_progress_pct ?? 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GcSovTab;
