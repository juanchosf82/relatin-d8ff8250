import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BTN_SUCCESS, BTN_SECONDARY, TH_CLASS, TD_CLASS, TR_STRIPE, TR_HOVER, fmt } from "@/lib/design-system";
import { AlertTriangle, Upload, Loader2, Check, Plus, Trash2 } from "lucide-react";

interface Props {
  projectId: string;
  bankSovLines: any[];
  onSaved: () => void;
}

type ExtractedLine = { line_number: number; description: string; scheduled_value: number };

const BankSovSetup = ({ projectId, bankSovLines, onSaved }: Props) => {
  const [mode, setMode] = useState<"idle" | "uploading" | "processing" | "review" | "manual">("idle");
  const [extractedLines, setExtractedLines] = useState<ExtractedLine[]>([]);
  const [manualLines, setManualLines] = useState<ExtractedLine[]>([{ line_number: 1, description: "", scheduled_value: 0 }]);
  const [saving, setSaving] = useState(false);

  if (bankSovLines.length > 0) return null; // SOV already configured

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("Solo se aceptan archivos PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Máximo 10MB");
      return;
    }

    setMode("processing");
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error } = await supabase.functions.invoke("extract-draw-pdf", {
        body: { pdf_base64: base64, extraction_type: "bank_sov", project_id: projectId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const lines: ExtractedLine[] = (data.sov_lines || []).map((l: any, i: number) => ({
        line_number: l.line_number ?? i + 1,
        description: l.description ?? "",
        scheduled_value: Number(l.scheduled_value) || 0,
      }));

      if (lines.length === 0) throw new Error("No se encontraron líneas en el documento");
      setExtractedLines(lines);
      setMode("review");
    } catch (err: any) {
      toast.error("Error de extracción: " + (err.message || "Intenta de nuevo"));
      setMode("idle");
    }
  };

  const updateExtractedLine = (idx: number, field: keyof ExtractedLine, value: any) => {
    setExtractedLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const saveBankSov = async (lines: ExtractedLine[]) => {
    setSaving(true);
    try {
      const rows = lines.map((l) => ({
        project_id: projectId,
        line_number: l.line_number,
        description: l.description,
        scheduled_value: l.scheduled_value,
      }));
      const { error } = await supabase.from("bank_sov_lines").insert(rows);
      if (error) throw error;
      toast.success(`SOV base del banco cargado — ${lines.length} líneas`);
      setMode("idle");
      onSaved();
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addManualLine = () => {
    setManualLines((prev) => [...prev, { line_number: prev.length + 1, description: "", scheduled_value: 0 }]);
  };

  const removeManualLine = (idx: number) => {
    setManualLines((prev) => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, line_number: i + 1 })));
  };

  const totalExtracted = extractedLines.reduce((s, l) => s + (l.scheduled_value || 0), 0);
  const totalManual = manualLines.reduce((s, l) => s + (l.scheduled_value || 0), 0);

  return (
    <div className="rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 p-5">
      {mode === "idle" && (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-[13px] font-bold">SOV base del banco no configurado</span>
          </div>
          <p className="text-[12px] text-orange-600">
            Carga el SOV del banco (~38 líneas) para habilitar la comparación mes a mes.
          </p>
          <div className="flex gap-3 justify-center">
            <Label className={`${BTN_SUCCESS} cursor-pointer inline-flex items-center gap-1.5`}>
              <Upload className="h-3.5 w-3.5" /> Extraer desde PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
            </Label>
            <Button onClick={() => setMode("manual")} className={BTN_SECONDARY}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Ingresar manual
            </Button>
          </div>
        </div>
      )}

      {mode === "processing" && (
        <div className="bg-[#0F1B2D] rounded-lg p-8 text-center space-y-3">
          <Loader2 className="h-8 w-8 text-white animate-spin mx-auto" />
          <p className="text-white text-[13px] font-medium">🔍 Extrayendo SOV del banco...</p>
          <p className="text-white/60 text-[11px]">IA identificando las líneas del SOV</p>
        </div>
      )}

      {mode === "review" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-[13px] font-bold text-green-700">SOV extraído — {extractedLines.length} líneas encontradas</span>
          </div>
          <div className="max-h-[400px] overflow-auto rounded-lg border border-gray-200">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  <th className={`${TH_CLASS} w-12`}>#</th>
                  <th className={TH_CLASS}>Descripción</th>
                  <th className={`${TH_CLASS} text-right w-36`}>Valor Programado</th>
                </tr>
              </thead>
              <tbody>
                {extractedLines.map((l, idx) => (
                  <tr key={idx} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100`}>
                    <td className={`${TD_CLASS} font-mono text-center`}>{l.line_number}</td>
                    <td className={TD_CLASS}>
                      <Input
                        value={l.description}
                        onChange={(e) => updateExtractedLine(idx, "description", e.target.value)}
                        className="h-7 text-[11px] border-gray-200"
                      />
                    </td>
                    <td className={`${TD_CLASS} text-right`}>
                      <Input
                        type="number"
                        value={l.scheduled_value}
                        onChange={(e) => updateExtractedLine(idx, "scheduled_value", Number(e.target.value))}
                        className="h-7 text-[11px] text-right font-mono border-gray-200"
                      />
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#0F1B2D]">
                  <td colSpan={2} className="px-3 py-2 text-[11px] font-bold text-white">TOTAL</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-white text-right font-mono">{fmt(totalExtracted)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setMode("idle")} variant="ghost" className="text-[11px]">Cancelar</Button>
            <Button onClick={() => saveBankSov(extractedLines)} disabled={saving} className={BTN_SUCCESS}>
              {saving ? "Guardando..." : "Confirmar SOV base"}
            </Button>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-4">
          <p className="text-[13px] font-bold text-[#0F1B2D]">Ingreso Manual — SOV del Banco</p>
          <div className="max-h-[400px] overflow-auto rounded-lg border border-gray-200">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  <th className={`${TH_CLASS} w-12`}>#</th>
                  <th className={TH_CLASS}>Descripción</th>
                  <th className={`${TH_CLASS} text-right w-36`}>Valor Programado ($)</th>
                  <th className={`${TH_CLASS} w-10`}></th>
                </tr>
              </thead>
              <tbody>
                {manualLines.map((l, idx) => (
                  <tr key={idx} className={`${TR_STRIPE(idx)} border-b border-gray-100`}>
                    <td className={`${TD_CLASS} font-mono text-center`}>{l.line_number}</td>
                    <td className={TD_CLASS}>
                      <Input
                        value={l.description}
                        onChange={(e) => setManualLines((prev) => prev.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                        className="h-7 text-[11px]"
                        placeholder="Descripción"
                      />
                    </td>
                    <td className={`${TD_CLASS} text-right`}>
                      <Input
                        type="number"
                        value={l.scheduled_value || ""}
                        onChange={(e) => setManualLines((prev) => prev.map((x, i) => i === idx ? { ...x, scheduled_value: Number(e.target.value) } : x))}
                        className="h-7 text-[11px] text-right font-mono"
                      />
                    </td>
                    <td className={TD_CLASS}>
                      {manualLines.length > 1 && (
                        <button onClick={() => removeManualLine(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#0F1B2D]">
                  <td colSpan={2} className="px-3 py-2 text-[11px] font-bold text-white">TOTAL</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-white text-right font-mono">{fmt(totalManual)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <Button onClick={addManualLine} variant="outline" size="sm" className="text-[11px]">
              <Plus className="h-3 w-3 mr-1" /> Agregar línea
            </Button>
            <div className="flex gap-3">
              <Button onClick={() => setMode("idle")} variant="ghost" className="text-[11px]">Cancelar</Button>
              <Button
                onClick={() => saveBankSov(manualLines.filter((l) => l.description.trim()))}
                disabled={saving || manualLines.filter((l) => l.description.trim()).length === 0}
                className={BTN_SUCCESS}
              >
                {saving ? "Guardando..." : "Guardar SOV base"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankSovSetup;
