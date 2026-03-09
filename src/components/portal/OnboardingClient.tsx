import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Mail } from "lucide-react";

interface OnboardingItem {
  id: string;
  block: string;
  section: string;
  sequence: number;
  item_text: string;
  status: string | null;
}

const BLOCKS = [
  "Bloque 1 — Portafolio",
  "Bloque 2 — Dinero",
  "Bloque 3 — Mercado",
];

function clientStatus(status: string | null) {
  switch (status) {
    case "completed": return { icon: <CheckCircle2 className="h-4 w-4 text-[#166534]" />, label: "✓ Recibido", cls: "bg-[#F0FDF4] text-[#166534] border-0 text-[10px]" };
    case "in_progress": return { icon: <Clock className="h-4 w-4 text-[#1E40AF]" />, label: "En proceso", cls: "bg-[#EFF6FF] text-[#1E40AF] border-0 text-[10px]" };
    default: return { icon: <Clock className="h-4 w-4 text-gray-300" />, label: "Pendiente", cls: "bg-gray-100 text-gray-500 border-0 text-[10px]" };
  }
}

const OnboardingClient = ({ projectId }: { projectId: string }) => {
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("onboarding_items")
        .select("id, block, section, sequence, item_text, status")
        .eq("project_id", projectId)
        .order("sequence");
      setItems((data as OnboardingItem[]) ?? []);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-[13px] text-gray-500">El checklist de onboarding aparecerá aquí<br />a medida que 360lateral lo active para tu proyecto.</p>
      </div>
    );
  }

  const countable = items.filter((i) => i.status !== "na");
  const completed = countable.filter((i) => i.status === "completed");
  const totalPct = countable.length > 0 ? Math.round((completed.length / countable.length) * 100) : 0;

  const blockStats = (block: string) => {
    const blockItems = items.filter((i) => i.block === block);
    const c = blockItems.filter((i) => i.status !== "na");
    const done = c.filter((i) => i.status === "completed");
    return { total: c.length, done: done.length, pct: c.length > 0 ? Math.round((done.length / c.length) * 100) : 0 };
  };

  // Group by block
  const grouped: Record<string, OnboardingItem[]> = {};
  for (const item of items) {
    if (!grouped[item.block]) grouped[item.block] = [];
    grouped[item.block].push(item);
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-[#0F1B2D] rounded-lg p-5 text-white">
        <h3 className="text-[15px] font-bold text-[#0D7377]">Activación del servicio OPR</h3>
        <p className="text-[12px] text-white/60 mt-1">360lateral está recopilando la información necesaria para activar el monitoreo completo de tu proyecto.</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[28px] font-bold text-[#0D7377]">{totalPct}%</p>
            <p className="text-[11px] text-gray-400">{completed.length} de {countable.length} ítems</p>
          </div>
          <div className="flex-1 space-y-2">
            {BLOCKS.map((block) => {
              const stats = blockStats(block);
              const shortName = block.split(" — ")[1];
              return (
                <div key={block}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-gray-500">{block.split(" — ")[0]} — {shortName}</span>
                    <span className="text-gray-400">{stats.done}/{stats.total}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#0D7377] transition-all" style={{ width: `${stats.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Items by block */}
      {BLOCKS.map((block) => {
        const blockItems = grouped[block];
        if (!blockItems || blockItems.length === 0) return null;
        return (
          <div key={block} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-[13px] font-bold text-[#0F1B2D] uppercase tracking-wide">{block}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {blockItems.map((item) => {
                const st = clientStatus(item.status);
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    {st.icon}
                    <span className="flex-1 text-[12px] text-[#0F1B2D]">{item.item_text}</span>
                    <Badge className={st.cls}>{st.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Callout */}
      <div className="bg-[#E8F4F4] rounded-lg p-4 border border-[#0D7377]/20">
        <div className="flex items-start gap-2">
          <Mail className="h-4 w-4 text-[#0D7377] mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] font-medium text-[#0F1B2D]">¿Tienes alguno de estos documentos disponible?</p>
            <p className="text-[11px] text-gray-500 mt-1">Envíalos directamente a <span className="font-medium text-[#0D7377]">ops@relatin.co</span> con el código de tu proyecto en el asunto.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingClient;
