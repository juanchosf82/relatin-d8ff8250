import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DRAW_STATUS_BADGE, TH_CLASS, TD_CLASS, TR_STRIPE, fmt, BTN_PRIMARY, badgeClass } from "@/lib/design-system";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draw: any;
  onSaved: () => void;
}

const DrawEditModal = ({ open, onOpenChange, draw, onSaved }: Props) => {
  const [formData, setFormData] = useState({
    draw_number: "",
    request_date: "",
    amount_requested: "",
    amount_certified: "",
    status: "pending",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (draw && open) {
      setFormData({
        draw_number: String(draw.draw_number ?? ""),
        request_date: draw.request_date ?? "",
        amount_requested: String(draw.amount_requested ?? ""),
        amount_certified: String(draw.amount_certified ?? ""),
        status: draw.status ?? "pending",
        notes: draw.notes ?? "",
      });
      fetchLineItems();
    }
  }, [draw, open]);

  const fetchLineItems = async () => {
    if (!draw?.id) return;
    setLoadingLines(true);
    const { data } = await supabase
      .from("draw_line_items")
      .select("*")
      .eq("draw_id", draw.id)
      .order("line_number");
    setLineItems(data || []);
    setLoadingLines(false);
  };

  const updateLineItem = (idx: number, field: string, value: string) => {
    setLineItems((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, [field]: value === "" ? null : Number(value) } : l
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: drawErr } = await supabase
        .from("draws")
        .update({
          draw_number: parseInt(formData.draw_number),
          request_date: formData.request_date || null,
          amount_requested: formData.amount_requested ? parseFloat(formData.amount_requested) : null,
          amount_certified: formData.amount_certified ? parseFloat(formData.amount_certified) : null,
          status: formData.status,
          notes: formData.notes || null,
        })
        .eq("id", draw.id);
      if (drawErr) throw drawErr;

      // Update line items in parallel
      if (lineItems.length > 0) {
        const updates = lineItems.map((l) =>
          supabase
            .from("draw_line_items")
            .update({
              amount_previous: l.amount_previous ?? 0,
              amount_this_draw: l.amount_this_draw ?? 0,
              amount_cumulative: l.amount_cumulative ?? 0,
              pct_complete: l.pct_complete ?? 0,
              balance_to_finish: l.balance_to_finish ?? 0,
            })
            .eq("id", l.id)
        );
        const results = await Promise.all(updates);
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      }

      toast.success(`Draw #${formData.draw_number} actualizado`);
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!draw) return null;

  const status = DRAW_STATUS_BADGE[formData.status] || DRAW_STATUS_BADGE.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Draw #{draw.draw_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header fields */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Draw Nº</Label>
              <Input
                type="number"
                value={formData.draw_number}
                onChange={(e) => setFormData({ ...formData, draw_number: e.target.value })}
                className="h-8 text-[12px] font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Fecha Solicitud</Label>
              <Input
                type="date"
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                className="h-8 text-[12px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Estado</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger className="h-8 text-[12px]">
                  <Badge className={badgeClass(status.bg, status.text)}>{status.label}</Badge>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DRAW_STATUS_BADGE).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Monto Solicitado ($)</Label>
              <Input
                type="number"
                value={formData.amount_requested}
                onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })}
                className="h-8 text-[12px] font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Monto Certificado ($)</Label>
              <Input
                type="number"
                value={formData.amount_certified}
                onChange={(e) => setFormData({ ...formData, amount_certified: e.target.value })}
                className="h-8 text-[12px] font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="text-[12px] min-h-[60px]"
            />
          </div>

          {/* Line items */}
          {loadingLines ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-[12px]">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando líneas...
            </div>
          ) : lineItems.length > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-semibold text-foreground">Líneas SOV del Banco</h3>
                <Badge variant="outline" className="text-[10px]">{lineItems.length} líneas</Badge>
              </div>
              <div className="max-h-[300px] overflow-auto rounded-lg border border-border">
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
                    {lineItems.map((l, idx) => (
                      <tr key={l.id} className={`${TR_STRIPE(idx)} border-b border-border`}>
                        <td className={`${TD_CLASS} font-mono text-center`}>{l.line_number}</td>
                        <td className={TD_CLASS}>{l.description}</td>
                        <td className={`${TD_CLASS} text-right font-mono`}>{fmt(l.scheduled_value)}</td>
                        <td className={`${TD_CLASS} text-right`}>
                          <Input
                            type="number"
                            value={l.amount_previous ?? ""}
                            onChange={(e) => updateLineItem(idx, "amount_previous", e.target.value)}
                            className="h-6 text-[10px] text-right font-mono w-20 border-border"
                          />
                        </td>
                        <td className={`${TD_CLASS} text-right`}>
                          <Input
                            type="number"
                            value={l.amount_this_draw ?? ""}
                            onChange={(e) => updateLineItem(idx, "amount_this_draw", e.target.value)}
                            className="h-6 text-[10px] text-right font-mono w-20 border-border"
                          />
                        </td>
                        <td className={`${TD_CLASS} text-right`}>
                          <Input
                            type="number"
                            value={l.amount_cumulative ?? ""}
                            onChange={(e) => updateLineItem(idx, "amount_cumulative", e.target.value)}
                            className="h-6 text-[10px] text-right font-mono w-20 border-border"
                          />
                        </td>
                        <td className={`${TD_CLASS} text-right`}>
                          <Input
                            type="number"
                            value={l.pct_complete ?? ""}
                            onChange={(e) => updateLineItem(idx, "pct_complete", e.target.value)}
                            className="h-6 text-[10px] text-right font-mono w-16 border-border"
                          />
                        </td>
                        <td className={`${TD_CLASS} text-right`}>
                          <Input
                            type="number"
                            value={l.balance_to_finish ?? ""}
                            onChange={(e) => updateLineItem(idx, "balance_to_finish", e.target.value)}
                            className="h-6 text-[10px] text-right font-mono w-20 border-border"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">Este draw no tiene líneas SOV detalladas.</p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Guardando...</> : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DrawEditModal;
