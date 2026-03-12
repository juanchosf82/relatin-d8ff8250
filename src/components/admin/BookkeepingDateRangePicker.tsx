import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (from: string, to: string) => void;
  title: string;
}

const BookkeepingDateRangePicker = ({ open, onClose, onGenerate, title }: Props) => {
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const setPreset = (key: string) => {
    const now = new Date();
    let f: Date, t: Date;
    switch (key) {
      case "month":
        f = new Date(now.getFullYear(), now.getMonth(), 1);
        t = now;
        break;
      case "quarter":
        f = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        t = now;
        break;
      case "year":
        f = new Date(now.getFullYear(), 0, 1);
        t = now;
        break;
      case "all":
      default:
        f = new Date(2020, 0, 1);
        t = now;
        break;
    }
    setFrom(f.toISOString().slice(0, 10));
    setTo(t.toISOString().slice(0, 10));
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px]">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-[12px] text-gray-500">Período del informe</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Desde</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-[12px]" />
            </div>
            <div>
              <Label className="text-[11px]">Hasta</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-[12px]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "month", label: "Este mes" },
              { key: "quarter", label: "Último trimestre" },
              { key: "year", label: "Este año" },
              { key: "all", label: "Todo el proyecto" },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-[11px]">Cancelar</Button>
            <Button size="sm" onClick={() => onGenerate(from, to)} className="text-[11px] bg-[#0D7377] hover:bg-[#0a5c60] text-white">
              Generar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookkeepingDateRangePicker;
