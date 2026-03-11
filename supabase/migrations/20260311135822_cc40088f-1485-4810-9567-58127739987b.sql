
CREATE TABLE public.developer_wires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  wire_number TEXT,
  wire_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  beneficiary TEXT,
  bank_reference TEXT,
  concept TEXT,
  invoice_id UUID REFERENCES public.gc_invoices(id) ON DELETE SET NULL,
  draw_id UUID REFERENCES public.draws(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent',
  notes TEXT,
  visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.developer_wires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_wires" ON public.developer_wires
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_wires" ON public.developer_wires
  FOR SELECT USING (
    visible_to_client = true AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = developer_wires.project_id
      AND p.client_user_id = auth.uid()
    )
  );
