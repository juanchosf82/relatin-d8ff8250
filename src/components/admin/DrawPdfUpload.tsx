import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BTN_SUCCESS, BTN_SECONDARY, TH_CLASS, TD_CLASS, TR_STRIPE, fmt } from "@/lib/design-system";
import { Upload, Loader2, Check, AlertTriangle, Pencil } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  bankSovLines: any[];
  onImported: () => void;
}

type ExtractedHeader = {
  draw_number: number | null;
  draw_date: string | null;
  period_from: string | null;
  period_to: string | null;
  total_amount_this_draw: number | null;
  total_amount_cumulative: number | null;
  bank_name: string | null;
  inspector_name: string | null;
};

type ExtractedSovLine = {
  line_number: number | null;
  description: string;
  scheduled_value: number | null;
  work_completed_previous: number | null;
  work_completed_this_period: number | null;
  work_completed_total: number | null;
  pct_complete: number | null;
  balance_to_finish: number | null;
  matched_bank_sov_id: string | null;
};

const DrawPdfUpload = ({ open, onOpenChange, projectId, bankSovLines, onImported }: Props) => {
  const [step, setStep] = useState<"upload" | "processing" | "review" | "error">("upload");
  const [header, setHeader] = useState<ExtractedHeader>({
    draw_number: null, draw_date: null, period_from: null, period_to: null,
    total_amount_this_draw: null, total_amount_cumulative: null, bank_name: null, inspector_name: null,
  });
  const [lines, setLines] = useState<ExtractedSovLine[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const reset = () => {
    setStep("upload");
    setHeader({ draw_number: null, draw_date: null, period_from: null, period_to: null, total_amount_this_draw: null, total_amount_cumulative: null, bank_name: null, inspector_name: null });
    setLines([]);
    setPdfFile(null);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const matchLineToBankSov = (description: string): string | null => {
    if (!bankSovLines.length) return null;
    const desc = description.toLowerCase().trim();
    const match = bankSovLines.find((b: any) => b.description.toLowerCase().trim() === desc);
    if (match) return match.id;
    // Fuzzy: check if bank description is contained or starts with
    const fuzzy = bankSovLines.find((b: any) =>
      desc.includes(b.description.toLowerCase().trim()) ||
      b.description.toLowerCase().trim().includes(desc)
    );
    return fuzzy?.id || null;
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") { toast.error("Solo PDF"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }

    setPdfFile(file);
    setStep("processing");
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ""));

      const { data, error } = await supabase.functions.invoke("extract-draw-pdf", {
        body: { pdf_base64: base64, extraction_type: "draw_request", project_id: projectId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setHeader({
        draw_number: data.draw_number ?? null,
        draw_date: data.draw_date ?? null,
        period_from: data.period_from ?? null,
        period_to: data.period_to ?? null,
        total_amount_this_draw: data.total_amount_this_draw ?? null,
        total_amount_cumulative: data.total_amount_cumulative ?? null,
        bank_name: data.bank_name ?? null,
        inspector_name: data.inspector_name ?? null,
      });

      const extractedLines: ExtractedSovLine[] = (data.sov_lines || []).map((l: any, i: number) => ({
        line_number: l.line_number ?? i + 1,
        description: l.description ?? "",
        scheduled_value: l.scheduled_value ?? null,
        work_completed_previous: l.work_completed_previous ?? null,
        work_completed_this_period: l.work_completed_this_period ?? null,
        work_completed_total: l.work_completed_total ?? null,
        pct_complete: l.pct_complete ?? null,
        balance_to_finish: l.balance_to_finish ?? null,
        matched_bank_sov_id: matchLineToBankSov(l.description ?? ""),
      }));

      setLines(extractedLines);
      setStep("review");
    } catch (err: any) {
      const msg = err?.message || "Extracción fallida";
      setErrorDetail(msg);
      toast.error("Error: " + msg);
      setStep("error");
    }
  };

  const updateHeader = (field: keyof ExtractedHeader, value: any) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const updateLine = (idx: number, field: keyof ExtractedSovLine, value: any) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const sumLines = useMemo(() => lines.reduce((s, l) => s + (l.work_completed_this_period || 0), 0), [lines]);
  const sumCumulative = useMemo(() => lines.reduce((s, l) => s + (l.work_completed_total || 0), 0), [lines]);
  const totalDiff = Math.abs((header.total_amount_this_draw || 0) - sumLines);
  const totalsMatch = totalDiff < 100;

  const handleConfirm = async () => {
    if (!header.draw_number) { toast.error("Draw # requerido"); return; }
    setSaving(true);
    try {
      // Upload PDF
      let pdf_url = null;
      if (pdfFile) {
        const fileName = `${projectId}-draw${header.draw_number}-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from("project_files").upload(`draws/${fileName}`, pdfFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("project_files").getPublicUrl(`draws/${fileName}`);
        pdf_url = urlData.publicUrl;
      }

      // Create draw record
      const { data: drawData, error: drawErr } = await supabase.from("draws").insert([{
        project_id: projectId,
        draw_number: header.draw_number,
        amount_requested: header.total_amount_this_draw || sumLines,
        amount_certified: header.total_amount_cumulative || sumCumulative,
        request_date: header.draw_date,
        notes: `Banco: ${header.bank_name || "—"} | Inspector: ${header.inspector_name || "—"}`,
        status: "pending",
        source: "pdf",
        pdf_url,
      }]).select("id").single();

      if (drawErr) throw drawErr;

      // Save line items
      const lineRows = lines.map((l) => ({
        draw_id: drawData.id,
        project_id: projectId,
        bank_sov_line_id: l.matched_bank_sov_id,
        line_number: l.line_number,
        description: l.description,
        scheduled_value: l.scheduled_value || 0,
        amount_previous: l.work_completed_previous || 0,
        amount_this_draw: l.work_completed_this_period || 0,
        amount_cumulative: l.work_completed_total || 0,
        pct_complete: l.pct_complete || 0,
        balance_to_finish: l.balance_to_finish || 0,
      }));

      const { error: linesErr } = await supabase.from("draw_line_items").insert(lineRows);
      if (linesErr) throw linesErr;

      toast.success(`✓ Draw #${header.draw_number} importado — ${lines.length} líneas actualizadas`);
      reset();
      onImported();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const nullHighlight = (val: any) => val == null ? "bg-yellow-50 border-yellow-300" : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Draw desde PDF</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="border-2 border-dashed border-gray-300 hover:border-[#0D7377] rounded-lg py-12 text-center transition-colors">
            <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-[13px] text-gray-500 mb-2">Arrastra el draw request del banco en PDF</p>
            <p className="text-[11px] text-gray-400 mb-4">Máximo 10MB, solo .pdf</p>
            <Label className={`${BTN_SUCCESS} cursor-pointer`}>
              Seleccionar PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
            </Label>
          </div>
        )}

        {step === "processing" && (
          <div className="bg-[#0F1B2D] rounded-lg p-10 text-center space-y-3">
            <Loader2 className="h-10 w-10 text-white animate-spin mx-auto" />
            <p className="text-white text-[14px] font-medium">🔍 Analizando draw request...</p>
            <p className="text-white/60 text-[12px]">La IA está extrayendo los datos del PDF</p>
          </div>
        )}

        {step === "error" && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto" />
            <p className="text-[13px] font-bold text-orange-700">⚠️ No se pudo extraer automáticamente</p>
            <p className="text-[12px] text-orange-600">Puedes ingresar los datos manualmente.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => handleClose(false)} variant="ghost">Cancelar</Button>
              <Button onClick={() => handleClose(false)} className={BTN_SECONDARY}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Ingresar manualmente
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-5">
            {/* Header fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Draw #</Label>
                <Input type="number" value={header.draw_number ?? ""} onChange={(e) => updateHeader("draw_number", e.target.value ? Number(e.target.value) : null)}
                  className={`h-8 text-[12px] font-mono ${nullHighlight(header.draw_number)}`} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Fecha</Label>
                <Input type="date" value={header.draw_date ?? ""} onChange={(e) => updateHeader("draw_date", e.target.value || null)}
                  className={`h-8 text-[12px] ${nullHighlight(header.draw_date)}`} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Período desde</Label>
                <Input type="date" value={header.period_from ?? ""} onChange={(e) => updateHeader("period_from", e.target.value || null)}
                  className={`h-8 text-[12px] ${nullHighlight(header.period_from)}`} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Período hasta</Label>
                <Input type="date" value={header.period_to ?? ""} onChange={(e) => updateHeader("period_to", e.target.value || null)}
                  className={`h-8 text-[12px] ${nullHighlight(header.period_to)}`} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Banco</Label>
                <Input value={header.bank_name ?? ""} onChange={(e) => updateHeader("bank_name", e.target.value || null)}
                  className={`h-8 text-[12px] ${nullHighlight(header.bank_name)}`} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Inspector</Label>
                <Input value={header.inspector_name ?? ""} onChange={(e) => updateHeader("inspector_name", e.target.value || null)}
                  className={`h-8 text-[12px] ${nullHighlight(header.inspector_name)}`} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Total este draw</Label>
                <Input type="number" value={header.total_amount_this_draw ?? ""} onChange={(e) => updateHeader("total_amount_this_draw", e.target.value ? Number(e.target.value) : null)}
                  className={`h-8 text-[12px] font-mono ${nullHighlight(header.total_amount_this_draw)}`} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Total acumulado</Label>
                <Input type="number" value={header.total_amount_cumulative ?? ""} onChange={(e) => updateHeader("total_amount_cumulative", e.target.value ? Number(e.target.value) : null)}
                  className={`h-8 text-[12px] font-mono ${nullHighlight(header.total_amount_cumulative)}`} />
              </div>
            </div>

            {/* Null field warning */}
            {Object.values(header).some((v) => v == null) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-[11px] text-yellow-700">
                ⚠️ Los campos en amarillo no fueron encontrados — completar manualmente
              </div>
            )}

            {/* Lines table */}
            <div className="max-h-[350px] overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr>
                    <th className={`${TH_CLASS} w-8`}>#</th>
                    <th className={TH_CLASS}>Descripción</th>
                    <th className={`${TH_CLASS} text-right`}>Programado</th>
                    <th className={`${TH_CLASS} text-right`}>Anterior</th>
                    <th className={`${TH_CLASS} text-right`}>Este período</th>
                    <th className={`${TH_CLASS} text-right`}>Total</th>
                    <th className={`${TH_CLASS} text-right`}>%</th>
                    <th className={`${TH_CLASS} text-right`}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const matched = !!l.matched_bank_sov_id;
                    return (
                      <tr key={idx} className={`${matched ? TR_STRIPE(idx) : "bg-yellow-50"} border-b border-gray-100`}>
                        <td className={`${TD_CLASS} font-mono text-center`}>{l.line_number}</td>
                        <td className={`${TD_CLASS} ${!matched ? "text-yellow-700" : ""}`}>
                          {l.description}
                          {!matched && <span className="ml-1 text-[9px]">⚠️</span>}
                        </td>
                        <td className={`${TD_CLASS} text-right`}>
                          <Input type="number" value={l.scheduled_value ?? ""} onChange={(e) => updateLine(idx, "scheduled_value", e.target.value ? Number(e.target.value) : null)}
                            className="h-6 text-[10px] text-right font-mono w-20 border-gray-200" />
                        </td>
                        <td className={`${TD_CLASS} text-right`}>
                          <Input type="number" value={l.work_completed_previous ?? ""} onChange={(e) => updateLine(idx, "work_completed_previous", e.target.value ? Number(e.target.value) : null)}
                            className="h-6 text-[10px] text-right font-mono w-20 border-gray-200" />
                        </td>
                        <td className={`${TD_CLASS} text-right`}>
                          <Input type="number" value={l.work_completed_this_period ?? ""} onChange={(e) => updateLine(idx, "work_completed_this_period", e.target.value ? Number(e.target.value) : null)}
                            className="h-6 text-[10px] text-right font-mono w-20 border-gray-200" />
                        </td>
                        <td className={`${TD_CLASS} text-right`}>
                          <Input type="number" value={l.work_completed_total ?? ""} onChange={(e) => updateLine(idx, "work_completed_total", e.target.value ? Number(e.target.value) : null)}
                            className="h-6 text-[10px] text-right font-mono w-20 border-gray-200" />
                        </td>
                        <td className={`${TD_CLASS} text-right font-mono`}>{l.pct_complete != null ? `${l.pct_complete}%` : "—"}</td>
                        <td className={`${TD_CLASS} text-right font-mono`}>{l.balance_to_finish != null ? fmt(l.balance_to_finish) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals validation */}
            <div className={`flex items-center gap-3 text-[12px] px-3 py-2 rounded ${totalsMatch ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              <span>Total extraído: {fmt(header.total_amount_this_draw)}</span>
              <span>|</span>
              <span>Suma de líneas: {fmt(sumLines)}</span>
              {totalsMatch ? (
                <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Coincide</span>
              ) : (
                <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Diferencia: {fmt(totalDiff)}</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <Button onClick={() => handleClose(false)} variant="ghost" className="text-[11px]">Cancelar</Button>
              <Button onClick={handleConfirm} disabled={saving} className={BTN_SUCCESS}>
                {saving ? "Importando..." : `✓ Confirmar e importar`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DrawPdfUpload;
