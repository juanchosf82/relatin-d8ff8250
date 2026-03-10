import { useState, useRef, useEffect, useMemo } from "react";
import { Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SovColorPicker from "./SovColorPicker";

interface SovLine {
  id?: string;
  project_id: string;
  line_number: string;
  name: string;
  fase: string | null;
  subfase: string | null;
  start_date: string | null;
  end_date: string | null;
  progress_pct: number;
  budget: number;
  real_cost: number;
  budget_progress_pct: number;
  row_color?: string | null;
}

interface Props {
  line: SovLine;
  isNew?: boolean;
  faseColor: string;
  totalBudget: number;
  onSave: (line: SovLine) => Promise<void>;
  onCancel?: () => void;
  onDelete: (id: string) => void;
  onBudgetChange?: (lineId: string, newBudget: number) => void;
  onColorChange?: (lineId: string, color: string | null) => void;
  formatShortDate: (d: string | null) => string;
  fmt: (v: number | null) => string;
  onEditStateChange?: (lineId: string, isEditing: boolean) => void;
  selected?: boolean;
  onSelectToggle?: (lineId: string) => void;
  legendLabels?: Record<string, string>;
}

const budgetBarColor = (v: number) =>
  v > 100 ? "bg-[#DC2626]" : v > 85 ? "bg-[#E07B39]" : "bg-[#1A7A4A]";

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-1.5">
    <div className="h-2 flex-1 bg-[#E5E7EB] rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <span className="text-[11px] font-semibold w-10 text-right tabular-nums">{value}%</span>
  </div>
);

const calcBudgetProgress = (realCost: number, progressPct: number, budget: number) => {
  if (budget <= 0) return 0;
  return Math.round(((realCost || 0) * (progressPct / 100)) / budget * 100 * 100) / 100;
};

const SovEditableRow = ({ line, isNew, faseColor, totalBudget, onSave, onCancel, onDelete, onBudgetChange, formatShortDate, fmt, onEditStateChange }: Props) => {
  const [editing, setEditing] = useState(isNew ?? false);
  const [draft, setDraft] = useState<SovLine>({ ...line });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    setDraft({ ...line });
  }, [line]);

  // Auto-calculate budget_progress_pct for display (read-only)
  const displayBudgetProgress = useMemo(() => {
    const src = editing ? draft : line;
    return calcBudgetProgress(src.real_cost, src.progress_pct, src.budget);
  }, [editing, draft.real_cost, draft.progress_pct, draft.budget, line.real_cost, line.progress_pct, line.budget]);

  const startEdit = () => {
    if (!editing) {
      setDraft({ ...line });
      setEditing(true);
      onEditStateChange?.(line.id || line.line_number, true);
    }
  };

  const cancel = () => {
    setDraft({ ...line });
    setEditing(false);
    setShowDeleteConfirm(false);
    onEditStateChange?.(line.id || line.line_number, false);
    if (isNew) onCancel?.();
  };

  const save = async () => {
    setSaving(true);
    try {
      const toSave = { ...draft, budget_progress_pct: displayBudgetProgress };
      await onSave(toSave);
      setEditing(false);
      onEditStateChange?.(line.id || line.line_number, false);
    } finally {
      setSaving(false);
    }
  };

  const handleBudgetChange = (newBudget: number) => {
    setDraft({ ...draft, budget: newBudget });
    onBudgetChange?.(line.id || line.line_number, newBudget);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  const inputClass = "w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-teal-400";

  if (editing) {
    return (
      <tr ref={rowRef} className="border-b border-slate-100 bg-teal-50/60" onKeyDown={handleKeyDown}>
        <td className="px-2 py-1 font-mono text-slate-500">{draft.line_number}</td>
        <td className="px-2 py-1">
          <input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Actividad" autoFocus />
          <input className={`${inputClass} mt-0.5 text-[11px]`} value={draft.subfase || ""} onChange={(e) => setDraft({ ...draft, subfase: e.target.value || null })} placeholder="Subfase" />
        </td>
        <td className="px-2 py-1">
          <input className={inputClass} value={draft.fase || ""} onChange={(e) => setDraft({ ...draft, fase: e.target.value || null })} placeholder="Fase" />
        </td>
        <td className="px-2 py-1">
          <input type="date" className={`${inputClass} text-[11px]`} value={draft.start_date || ""} onChange={(e) => setDraft({ ...draft, start_date: e.target.value || null })} />
        </td>
        <td className="px-2 py-1">
          <input type="date" className={`${inputClass} text-[11px]`} value={draft.end_date || ""} onChange={(e) => setDraft({ ...draft, end_date: e.target.value || null })} />
        </td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-0.5">
            <input type="number" min={0} max={100} className={`${inputClass} w-14`} value={draft.progress_pct} onChange={(e) => setDraft({ ...draft, progress_pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
            <span className="text-[11px] text-slate-500">%</span>
          </div>
        </td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-0.5">
            <span className="text-[11px] text-slate-500">$</span>
            <input type="number" className={`${inputClass} w-20`} value={draft.budget} onChange={(e) => handleBudgetChange(Number(e.target.value) || 0)} />
          </div>
        </td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-0.5">
            <span className="text-[11px] text-slate-500">$</span>
            <input type="number" className={`${inputClass} w-20`} value={draft.real_cost} onChange={(e) => setDraft({ ...draft, real_cost: Number(e.target.value) || 0 })} />
          </div>
        </td>
        {/* Auto-calculated - read only */}
        <td className="px-2 py-1 bg-slate-100/80">
          <ProgressBar value={Math.round(displayBudgetProgress)} color={budgetBarColor(displayBudgetProgress)} />
        </td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-100" onClick={save} disabled={saving}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100" onClick={cancel}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr ref={rowRef} className="border-b border-slate-100 hover:bg-slate-50/60 group">
      <td className="px-2 py-1 font-mono text-slate-500">{line.line_number}</td>
      <td className="px-2 py-1 cursor-pointer" onClick={startEdit}>
        <div className="leading-tight">
          <span className="font-medium text-slate-800">{line.name}</span>
          {line.subfase && <div className="text-[11px] text-slate-400 mt-0.5">{line.subfase}</div>}
        </div>
      </td>
      <td className="px-2 py-1">
        {line.fase ? (
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${faseColor}`}>
            {line.fase}
          </span>
        ) : "—"}
      </td>
      <td className="px-2 py-1 text-slate-600 tabular-nums cursor-pointer" onClick={startEdit}>{formatShortDate(line.start_date)}</td>
      <td className="px-2 py-1 text-slate-600 tabular-nums cursor-pointer" onClick={startEdit}>{formatShortDate(line.end_date)}</td>
      <td className="px-2 py-1 cursor-pointer" onClick={startEdit}><ProgressBar value={line.progress_pct || 0} color="bg-[#0D7377]" /></td>
      <td className="px-2 py-1 text-right text-slate-700 tabular-nums cursor-pointer" onClick={startEdit}>{fmt(line.budget)}</td>
      <td className="px-2 py-1 text-right text-slate-700 tabular-nums cursor-pointer" onClick={startEdit}>{fmt(line.real_cost)}</td>
      {/* Auto-calculated - read only */}
      <td className="px-2 py-1 bg-slate-50/80">
        <ProgressBar value={Math.round(displayBudgetProgress)} color={budgetBarColor(displayBudgetProgress)} />
      </td>
      <td className="px-2 py-1 w-16">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1 text-[10px]">
            <button className="text-red-600 font-semibold hover:underline" onClick={() => { if (line.id) onDelete(line.id); }}>Sí</button>
            <span className="text-slate-400">/</span>
            <button className="text-slate-500 hover:underline" onClick={() => setShowDeleteConfirm(false)}>No</button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-opacity" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
};

export default SovEditableRow;
