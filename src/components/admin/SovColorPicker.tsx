import { useState, useRef, useEffect } from "react";

const COLOR_PRESETS = [
  { hex: null, label: "Sin color" },
  { hex: "#FFF9C4", label: "Amarillo" },
  { hex: "#FFF3E0", label: "Naranja claro" },
  { hex: "#FFEBEE", label: "Rojo claro" },
  { hex: "#E8F5E9", label: "Verde claro" },
  { hex: "#E3F2FD", label: "Azul claro" },
  { hex: "#F3E5F5", label: "Morado claro" },
  { hex: "#FCE4EC", label: "Rosa claro" },
  { hex: "#F5F5F5", label: "Gris claro" },
  { hex: "#E0F7FA", label: "Teal claro" },
];

export { COLOR_PRESETS };

interface SovColorPickerProps {
  currentColor: string | null;
  onSelect: (color: string | null) => void;
  legendLabels?: Record<string, string>;
}

const SovColorPicker = ({ currentColor, onSelect, legendLabels }: SovColorPickerProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-3 h-3 rounded-full border border-slate-300 cursor-pointer hover:scale-125 transition-transform shrink-0"
        style={{ backgroundColor: currentColor || "#E5E7EB" }}
        title={currentColor ? (legendLabels?.[currentColor] || currentColor) : "Sin color"}
      />
      {open && (
        <div className="absolute left-0 top-5 z-50 bg-white rounded-lg shadow-lg border border-slate-200 p-2.5 w-[200px]" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Color de fila</p>
          <div className="grid grid-cols-5 gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.hex || "none"}
                type="button"
                onClick={() => { onSelect(c.hex); setOpen(false); }}
                className={`w-6 h-6 rounded cursor-pointer border-2 transition-all hover:scale-110 ${
                  currentColor === c.hex ? "border-[#0D7377] ring-1 ring-[#0D7377]" : "border-slate-200"
                }`}
                style={{ backgroundColor: c.hex || "#FFFFFF" }}
                title={legendLabels?.[c.hex || ""] || c.label}
              >
                {c.hex === null && <span className="text-[8px] text-slate-400 leading-none">∅</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SovColorPicker;
