import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TH_CLASS, TD_CLASS, TR_STRIPE, TR_HOVER, DRAW_STATUS_BADGE, badgeClass, fmt } from "@/lib/design-system";
import { ExternalLink } from "lucide-react";
import DrawComparison from "@/components/admin/DrawComparison";

interface Props {
  projectId: string;
  draws: any[];
}

const DrawsClientView = ({ projectId, draws }: Props) => {
  const [bankSovLines, setBankSovLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("bank_sov_lines").select("*").eq("project_id", projectId).order("line_number")
      .then(({ data }) => { setBankSovLines(data ?? []); setLoading(false); });
  }, [projectId]);

  // Calculate totals
  const totalCertified = draws.reduce((s, d) => s + (Number(d.amount_certified) || 0), 0);
  const totalScheduled = bankSovLines.reduce((s, l) => s + (Number(l.scheduled_value) || 0), 0);
  const pct = totalScheduled > 0 ? Math.round((totalCertified / totalScheduled) * 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-16"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-5">
      {/* Summary */}
      {totalScheduled > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
          <p className="text-[12px] text-gray-500">
            Capital certificado: <span className="font-bold font-mono text-[#0F1B2D]">{fmt(totalCertified)}</span> de {fmt(totalScheduled)} ({pct}% del préstamo)
          </p>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0D7377] rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Draws list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead><tr>
            <th className={`${TH_CLASS} w-20`}>#</th>
            <th className={TH_CLASS}>Fecha</th>
            <th className={`${TH_CLASS} text-right`}>Monto Certificado</th>
            <th className={TH_CLASS}>Estado</th>
            <th className={TH_CLASS}>Certificado</th>
          </tr></thead>
          <tbody>
            {draws.map((d, idx) => {
              const st = DRAW_STATUS_BADGE[d.status ?? "pending"] || DRAW_STATUS_BADGE.pending;
              return (
                <tr key={d.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                  <td className={`${TD_CLASS} font-mono`}>{d.draw_number}</td>
                  <td className={TD_CLASS}>{d.request_date}</td>
                  <td className={`${TD_CLASS} text-right font-mono`}>{fmt(d.amount_certified)}</td>
                  <td className={TD_CLASS}><Badge className={badgeClass(st.bg, st.text)}>{st.label}</Badge></td>
                  <td className={TD_CLASS}>
                    {d.status === "paid" && d.certificate_url ? (
                      <a href={d.certificate_url} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Ver</a>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
            {draws.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8 text-[12px]">Sin draws</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Comparison (read-only) */}
      {bankSovLines.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 mb-2">Certificaciones validadas por 360lateral</p>
          <DrawComparison
            projectId={projectId}
            bankSovLines={bankSovLines}
            draws={draws}
            readOnly
          />
        </div>
      )}
    </div>
  );
};

export default DrawsClientView;
