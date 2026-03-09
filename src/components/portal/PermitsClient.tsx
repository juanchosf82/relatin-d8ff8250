import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { badgeClass } from "@/lib/design-system";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

type Permit = {
  id: string; type: string; permit_number: string | null;
  issuing_authority: string | null; status: string | null;
  issued_date: string | null; expiration_date: string | null;
};

type Inspection = {
  id: string; phase: string; name: string; sequence: number;
  status: string | null; scheduled_date: string | null;
  completed_date: string | null; result: string | null;
};

const today = new Date().toISOString().split("T")[0];
const isExpired = (d: string | null) => d ? d < today : false;
const daysUntil = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "gray" },
  applied: { label: "Solicitado", color: "blue" },
  issued: { label: "Emitido ✓", color: "green" },
  expired: { label: "Vencido", color: "red" },
  closed: { label: "Cerrado", color: "gray" },
};

const PHASE_ORDER = ["Pre-Construction", "Foundation", "Framing", "MEP", "Enclosure", "Finishes", "Closeout"];

export default function PermitsClient({ projectId }: { projectId: string }) {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pRes, iRes] = await Promise.all([
        supabase.from("permits").select("id,type,permit_number,issuing_authority,status,issued_date,expiration_date").eq("project_id", projectId),
        supabase.from("inspections").select("id,phase,name,sequence,status,scheduled_date,completed_date,result").eq("project_id", projectId).order("sequence"),
      ]);
      setPermits((pRes.data ?? []) as Permit[]);
      setInspections((iRes.data ?? []) as Inspection[]);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0D7377]" /></div>;

  const hasFema = permits.some(p => p.type.includes("FEMA"));

  // Phase summary for step tracker
  const phaseStatus = PHASE_ORDER.reduce<Record<string, "done" | "active" | "pending">>((acc, phase) => {
    const items = inspections.filter(i => i.phase === phase);
    if (!items.length) { acc[phase] = "pending"; return acc; }
    if (items.every(i => i.status === "passed")) acc[phase] = "done";
    else if (items.some(i => i.status === "passed" || i.status === "scheduled" || i.status === "failed" || i.status === "re_inspection")) acc[phase] = "active";
    else acc[phase] = "pending";
    return acc;
  }, {});

  const activePhases = PHASE_ORDER.filter(p => inspections.some(i => i.phase === p));

  // Next upcoming & last passed
  const nextInsp = inspections.find(i => i.status === "scheduled" || i.status === "pending");
  const lastPassed = [...inspections].reverse().find(i => i.status === "passed");

  const borderColor = (p: Permit) => {
    if (isExpired(p.expiration_date)) return "border-l-red-500";
    const d = daysUntil(p.expiration_date);
    if (d !== null && d <= 30) return "border-l-orange-400";
    if (p.status === "issued") return "border-l-green-500";
    return "border-l-gray-300";
  };

  const getStatusDisplay = (p: Permit) => {
    if (p.status === "issued" && isExpired(p.expiration_date)) return STATUS_LABELS.expired;
    return STATUS_LABELS[p.status || "pending"] || STATUS_LABELS.pending;
  };

  return (
    <div className="space-y-6">
      {/* Permits */}
      {permits.length > 0 && (
        <div>
          <h3 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Permisos del Proyecto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permits.map(p => {
              const st = getStatusDisplay(p);
              const days = daysUntil(p.expiration_date);
              return (
                <div key={p.id} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${borderColor(p)} shadow-sm p-4`}>
                  <div className="flex items-start justify-between">
                    <h4 className="text-[13px] font-semibold text-[#0F1B2D]">{p.type}</h4>
                    <Badge className={badgeClass(
                      st.color === "green" ? "bg-green-50" : st.color === "red" ? "bg-red-50" : st.color === "blue" ? "bg-blue-50" : "bg-gray-100",
                      st.color === "green" ? "text-green-700" : st.color === "red" ? "text-red-700" : st.color === "blue" ? "text-blue-700" : "text-gray-600"
                    )}>{st.label}</Badge>
                  </div>
                  {p.issuing_authority && <p className="text-[11px] text-gray-500 mt-1">{p.issuing_authority}</p>}
                  {p.permit_number && <p className="text-[11px] text-gray-400 font-mono mt-0.5"># {p.permit_number}</p>}
                  <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
                    {p.issued_date && <span>Emitido: {p.issued_date}</span>}
                    {p.expiration_date && (
                      <span className={isExpired(p.expiration_date) ? "text-red-600 font-bold" : days !== null && days <= 30 ? "text-orange-600 font-semibold" : ""}>
                        Vence: {p.expiration_date}
                        {days !== null && days > 0 && days <= 30 && <span className="ml-1">⚠️ {days} días</span>}
                        {isExpired(p.expiration_date) && <span className="ml-1">⚠️ Vencido</span>}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspections */}
      {inspections.length > 0 && (
        <div>
          <h3 className="text-[14px] font-bold text-[#0F1B2D] mb-3">Inspecciones de Construcción</h3>

          {/* Step tracker */}
          {activePhases.length > 0 && (
            <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
              {activePhases.map((phase, idx) => {
                const st = phaseStatus[phase];
                return (
                  <div key={phase} className="flex items-center">
                    {idx > 0 && <div className={`w-6 h-0.5 ${st === "done" || phaseStatus[activePhases[idx - 1]] === "done" ? "bg-[#0D7377]" : "bg-gray-200"}`} />}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                      st === "done" ? "bg-[#E8F4F4] text-[#0D7377]" :
                      st === "active" ? "bg-blue-50 text-blue-700" :
                      "bg-gray-50 text-gray-400"
                    }`}>
                      {st === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                       st === "active" ? <Clock className="h-3.5 w-3.5" /> :
                       <div className="h-3 w-3 rounded-full border-2 border-gray-300" />}
                      {phase}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming / recent */}
          <div className="space-y-2 mb-4">
            {nextInsp && (
              <div className="bg-blue-50 rounded-lg p-3 text-[12px] text-blue-800">
                <span className="font-semibold">Próxima inspección:</span> {nextInsp.name}
                {nextInsp.scheduled_date && <span> — programada {nextInsp.scheduled_date}</span>}
              </div>
            )}
            {lastPassed && (
              <div className="bg-green-50 rounded-lg p-3 text-[12px] text-green-800">
                <span className="font-semibold">Última aprobada:</span> {lastPassed.name}
                {lastPassed.completed_date && <span> — {lastPassed.completed_date} ✓</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FEMA callout */}
      {hasFema && (
        <div className="bg-[#0F1B2D] text-white rounded-lg p-5">
          <h4 className="text-[14px] font-bold mb-2">🏠 Cumplimiento FEMA Flood Zone</h4>
          <p className="text-[12px] text-white/80 leading-relaxed">
            Este proyecto está en zona de inundación de Pinellas County.
            360lateral está coordinando el cumplimiento con los requisitos FEMA para proteger su inversión.
          </p>
        </div>
      )}

      {permits.length === 0 && inspections.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-[12px]">
          No hay información de permisos disponible para este proyecto.
        </div>
      )}
    </div>
  );
}
