ALTER TABLE public.sov_lines
ADD COLUMN fase TEXT,
ADD COLUMN subfase TEXT,
ADD COLUMN budget_progress_pct NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.sov_lines.progress_pct IS 'Avance físico 0-100';
COMMENT ON COLUMN public.sov_lines.budget_progress_pct IS 'Avance del presupuesto 0-100';