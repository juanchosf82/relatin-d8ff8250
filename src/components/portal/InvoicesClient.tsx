import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { TH_CLASS, TD_CLASS, TR_STRIPE, TR_HOVER, badgeClass, fmt } from "@/lib/design-system";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";

interface Props {
  projectId: string;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: "bg-[#D1FAE5]", text: "text-[#065F46]", label: "Aprobado ✓" },
  paid:     { bg: "bg-[#E8F4F4]", text: "text-[#0D7377]", label: "Pagado" },
};

const InvoicesClient = ({ projectId }: Props) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("gc_invoices")
      .select("*")
      .eq("project_id", projectId)
      .in("status", ["approved", "paid"])
      .eq("visible_to_client", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setInvoices((data as any) ?? []);
        setLoading(false);
      });
  }, [projectId]);

  const fetchLines = useCallback(async (invoiceId: string) => {
    if (invoiceLines[invoiceId]) return;
    const { data } = await supabase
      .from("gc_invoice_lines")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("line_number");
    setInvoiceLines(prev => ({ ...prev, [invoiceId]: (data as any) ?? [] }));
  }, [invoiceLines]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    fetchLines(id);
  };

  const totalCertified = useMemo(() =>
    invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0),
    [invoices]
  );

  if (loading) return <div className="flex items-center justify-center h-16"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0D7377]" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-[12px] text-gray-500">
          Total certificado al GC: <span className="font-bold font-mono text-[#0F1B2D]">{fmt(totalCertified)}</span>
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className={`${TH_CLASS} w-8`}></th>
              <th className={TH_CLASS}>Invoice #</th>
              <th className={TH_CLASS}>Fecha</th>
              <th className={TH_CLASS}>Período</th>
              <th className={`${TH_CLASS} text-right`}>Monto</th>
              <th className={TH_CLASS}>Estado</th>
              <th className={TH_CLASS}>📄</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, idx) => {
              const st = STATUS_BADGE[inv.status] || STATUS_BADGE.approved;
              const isExpanded = expandedId === inv.id;
              const lines = invoiceLines[inv.id] || [];

              return (
                <>
                  <tr key={inv.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 cursor-pointer transition-colors`} onClick={() => toggleExpand(inv.id)}>
                    <td className={TD_CLASS}>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                    </td>
                    <td className={`${TD_CLASS} font-mono font-semibold`}>{inv.invoice_number || "—"}</td>
                    <td className={TD_CLASS}>{inv.invoice_date || "—"}</td>
                    <td className={TD_CLASS}>{inv.period_from && inv.period_to ? `${inv.period_from} — ${inv.period_to}` : "—"}</td>
                    <td className={`${TD_CLASS} text-right font-mono font-semibold`}>{fmt(inv.total_amount)}</td>
                    <td className={TD_CLASS}><Badge className={badgeClass(st.bg, st.text)}>{st.label}</Badge></td>
                    <td className={TD_CLASS} onClick={e => e.stopPropagation()}>
                      {inv.pdf_url ? (
                        <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-[#0D7377] hover:underline text-[11px]">
                          <FileText className="h-3.5 w-3.5" />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${inv.id}-lines`}>
                      <td colSpan={7} className="p-0">
                        <div className="bg-gray-50 border-l-[3px] border-[#0D7377] ml-4 mr-2 my-1 rounded">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-3 py-1.5 text-left text-[10px] uppercase text-gray-500 font-semibold">Producto / Servicio</th>
                                <th className="px-3 py-1.5 text-left text-[10px] uppercase text-gray-500 font-semibold">Descripción</th>
                                <th className="px-3 py-1.5 text-right text-[10px] uppercase text-gray-500 font-semibold">Monto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((l: any, li: number) => (
                                <tr key={l.id} className={`border-b border-gray-200 ${li % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                  <td className="px-3 py-1 font-medium">{l.product_service}</td>
                                  <td className="px-3 py-1 text-gray-500">{l.description || "—"}</td>
                                  <td className="px-3 py-1 text-right font-mono font-semibold">{fmt(l.amount)}</td>
                                </tr>
                              ))}
                              {lines.length === 0 && (
                                <tr><td colSpan={3} className="text-center py-4 text-gray-400 text-[11px]">Sin líneas</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {invoices.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-[12px]">Sin invoices certificados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Note */}
      {invoices.length > 0 && (
        <p className="text-[10px] text-gray-400 italic">
          Solo se muestran invoices aprobados o pagados. Verificados por 360lateral.
        </p>
      )}
    </div>
  );
};

export default InvoicesClient;
