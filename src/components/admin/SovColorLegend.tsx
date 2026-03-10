import { useState, useRef, useEffect } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COLOR_PRESETS } from "./SovColorPicker";

interface Props {
  projectId: string;
  labels: Record<string, string>;
  onChange: (labels: Record<string, string>) => void;
}

const STORAGE_KEY = (pid: string) => `sov-color-labels-${pid}`;

export const loadColorLabels = (projectId: string): Record<string, string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(projectId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export const saveColorLabels = (projectId: string, labels: Record<string, string>) => {
  localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(labels));
};

const SovColorLegend = ({ projectId, labels, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const presets = COLOR_PRESETS.filter((c) => c.hex !== null);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`text-xs font-semibold uppercase tracking-wider rounded px-3 py-2 ${open ? "bg-[#E8F4F4] border-[#0D7377]" : ""}`}
      >
        <Palette className="w-4 h-4 mr-2" />Leyenda
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-50 bg-white rounded-lg shadow-lg border border-slate-200 p-3 w-[260px]">
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2 tracking-wide">Leyenda de colores</p>
          <div className="space-y-1.5">
            {presets.map((c) => (
              <div key={c.hex} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded border border-slate-200 shrink-0" style={{ backgroundColor: c.hex! }} />
                <input
                  className="flex-1 text-[11px] bg-transparent border-b border-slate-200 focus:border-[#0D7377] outline-none px-1 py-0.5"
                  placeholder={c.label}
                  value={labels[c.hex!] || ""}
                  onChange={(e) => {
                    const next = { ...labels, [c.hex!]: e.target.value };
                    if (!e.target.value) delete next[c.hex!];
                    onChange(next);
                    saveColorLabels(projectId, next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SovColorLegend;
