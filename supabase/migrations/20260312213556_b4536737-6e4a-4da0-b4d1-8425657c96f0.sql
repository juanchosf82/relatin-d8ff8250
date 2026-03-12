
CREATE TABLE public.bookkeeping_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income','expense')),
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  vendor_payee TEXT,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  file_url TEXT,
  file_filename TEXT,
  extraction_method TEXT DEFAULT 'manual',
  linked_draw_id UUID REFERENCES public.draws(id) ON DELETE SET NULL,
  linked_invoice_id UUID REFERENCES public.gc_invoices(id) ON DELETE SET NULL,
  linked_wire_id UUID REFERENCES public.developer_wires(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookkeeping_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_bookkeeping" ON public.bookkeeping_entries
  FOR ALL USING (public.is_admin());

CREATE POLICY "client_read_bookkeeping" ON public.bookkeeping_entries
  FOR SELECT USING (
    visible_to_client = true AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = bookkeeping_entries.project_id
      AND p.client_user_id = auth.uid()
    )
  );
