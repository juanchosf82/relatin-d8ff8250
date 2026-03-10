
-- Bank SOV lines (38-line simplified SOV the bank uses)
CREATE TABLE public.bank_sov_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  description TEXT NOT NULL,
  scheduled_value NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Draw line items (per-draw breakdown by bank SOV line)
CREATE TABLE public.draw_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_id UUID REFERENCES public.draws(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  bank_sov_line_id UUID REFERENCES public.bank_sov_lines(id) ON DELETE SET NULL,
  line_number INT,
  description TEXT NOT NULL,
  scheduled_value NUMERIC(12,2) DEFAULT 0,
  amount_previous NUMERIC(12,2) DEFAULT 0,
  amount_this_draw NUMERIC(12,2) DEFAULT 0,
  amount_cumulative NUMERIC(12,2) DEFAULT 0,
  pct_complete NUMERIC(5,2) DEFAULT 0,
  balance_to_finish NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add source column to draws table
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Enable RLS
ALTER TABLE public.bank_sov_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_line_items ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_all_bank_sov" ON public.bank_sov_lines FOR ALL USING (is_admin());
CREATE POLICY "admin_all_draw_lines" ON public.draw_line_items FOR ALL USING (is_admin());

-- Client read access for draw line items
CREATE POLICY "client_read_draw_lines" ON public.draw_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.draws d ON d.project_id = p.id
      WHERE d.id = draw_line_items.draw_id
      AND p.client_user_id = auth.uid()
    )
  );

-- Client read access for bank SOV
CREATE POLICY "client_read_bank_sov" ON public.bank_sov_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = bank_sov_lines.project_id
      AND p.client_user_id = auth.uid()
    )
  );
