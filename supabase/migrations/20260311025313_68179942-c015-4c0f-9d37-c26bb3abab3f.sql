
CREATE TABLE gc_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  invoice_number TEXT,
  invoice_date DATE,
  period_from DATE,
  period_to DATE,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  pdf_url TEXT,
  pdf_filename TEXT,
  extraction_method TEXT DEFAULT 'manual',
  notes TEXT,
  visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gc_invoice_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES gc_invoices(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  line_number INT,
  product_service TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  amount NUMERIC(12,2) DEFAULT 0,
  sov_line_id UUID REFERENCES sov_lines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gc_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_invoices" ON gc_invoices
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_invoices" ON gc_invoices
  FOR SELECT USING (
    visible_to_client = true AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = gc_invoices.project_id
      AND p.client_user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_invoice_lines" ON gc_invoice_lines
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_invoice_lines" ON gc_invoice_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gc_invoices i
      JOIN projects p ON p.id = i.project_id
      WHERE i.id = gc_invoice_lines.invoice_id
      AND p.client_user_id = auth.uid()
      AND i.visible_to_client = true
    )
  );
