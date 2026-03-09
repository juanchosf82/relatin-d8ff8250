/**
 * Shared Design System constants for admin + portal pages.
 * Single source of truth for badges, progress bars, table classes, button variants.
 */

/* ── Status / Badge color maps ── */
export const PROJECT_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  on_track:  { bg: "bg-[#E8F4F4]", text: "text-[#0D7377]", label: "On Track" },
  attention: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", label: "Atención" },
  critical:  { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", label: "Crítico" },
};

export const PERMIT_STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active:  { bg: "bg-[#D1FAE5]", text: "text-[#065F46]" },
  expired: { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" },
  pending: { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
};

export const DRAW_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]", label: "Pendiente" },
  review:  { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", label: "Revisión" },
  sent:    { bg: "bg-[#E8F4F4]", text: "text-[#0D7377]", label: "Enviado" },
  paid:    { bg: "bg-[#D1FAE5]", text: "text-[#065F46]", label: "Pagado" },
};

export const ISSUE_LEVEL_BADGE: Record<string, { bg: string; text: string }> = {
  "CRÍTICO": { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" },
  "ALTO":    { bg: "bg-[#FFEDD5]", text: "text-[#9A3412]" },
  "MEDIO":   { bg: "bg-[#FEF9C3]", text: "text-[#854D0E]" },
};

/* ── Progress bar colors ── */
export const progressFisicoColor = "bg-[#0D7377]";

export const progressPresupuestoColor = (pct: number) =>
  pct > 100 ? "bg-[#DC2626]" : pct > 85 ? "bg-[#E07B39]" : "bg-[#1A7A4A]";

/* ── Table CSS classes (to be applied via className) ── */
export const TH_CLASS =
  "text-[11px] uppercase tracking-[0.05em] font-semibold text-white bg-[#0F1B2D] sticky top-0 z-10 px-3 py-2";

export const TD_CLASS = "text-[12px] px-3 py-2";

export const TR_HOVER = "hover:bg-[#F0FAFA]";

export const TR_STRIPE = (index: number) =>
  index % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]";

/* ── Section & Page layout ── */
export const PAGE_TITLE = "text-[18px] font-bold text-[#0F1B2D] mb-1";
export const PAGE_SUBTITLE = "text-[12px] text-gray-400 mb-6";
export const SECTION_TITLE = "text-[14px] font-bold text-[#0F1B2D]";
export const LABEL_META = "text-[11px] text-gray-400";
export const SECTION_CARD = "bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-4";

/* ── Button variants ── */
export const BTN_PRIMARY = "bg-[#0F1B2D] text-white hover:bg-[#1a2d4a] text-xs font-semibold uppercase tracking-wider rounded px-3 py-2";
export const BTN_SECONDARY = "border border-[#0F1B2D] text-[#0F1B2D] hover:bg-gray-50 text-xs font-semibold uppercase tracking-wider rounded px-3 py-2";
export const BTN_SUCCESS = "bg-[#0D7377] text-white hover:bg-[#0a5c60] text-xs font-semibold uppercase tracking-wider rounded px-3 py-2";
export const BTN_DANGER = "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-semibold uppercase tracking-wider rounded px-3 py-2";

/* ── KPI styling for project headers ── */
export const KPI_VALUE = "text-[20px] font-bold text-white";
export const KPI_LABEL = "text-[10px] uppercase text-gray-400";

/* ── Helper to format badge className ── */
export const badgeClass = (bg: string, text: string) => `${bg} ${text} border-0 font-semibold text-[11px]`;

/* ── Currency formatter ── */
export const fmt = (n: number | null) =>
  n != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n) : "—";
