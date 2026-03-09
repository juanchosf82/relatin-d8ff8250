
CREATE TABLE project_financials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  land_cost NUMERIC(12,2) DEFAULT 0,
  hard_costs NUMERIC(12,2) DEFAULT 0,
  soft_costs NUMERIC(12,2) DEFAULT 0,
  financing_costs NUMERIC(12,2) DEFAULT 0,
  contingency_pct NUMERIC(5,2) DEFAULT 8.0,
  sale_price_target NUMERIC(12,2) DEFAULT 0,
  sale_price_minimum NUMERIC(12,2) DEFAULT 0,
  sale_price_conservative NUMERIC(12,2) DEFAULT 0,
  loan_amount NUMERIC(12,2) DEFAULT 0,
  equity_invested NUMERIC(12,2) DEFAULT 0,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  loan_term_months INT DEFAULT 12,
  loan_start_date DATE,
  loan_maturity_date DATE,
  arv_original NUMERIC(12,2) DEFAULT 0,
  arv_current NUMERIC(12,2) DEFAULT 0,
  arv_updated_at DATE,
  estimated_days_to_sell INT DEFAULT 90,
  exit_strategy TEXT DEFAULT 'sale',
  cost_variance_pct NUMERIC(5,2) DEFAULT 10.0,
  price_variance_pct NUMERIC(5,2) DEFAULT 8.0,
  time_variance_months INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cashflow_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  week_number INT,
  entry_type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  direction TEXT NOT NULL,
  is_projected BOOLEAN DEFAULT false,
  draw_id UUID REFERENCES draws(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_financials" ON project_financials
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_financials" ON project_financials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_financials.project_id
      AND p.client_user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_cashflow_entries" ON cashflow_entries
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_cashflow_entries" ON cashflow_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = cashflow_entries.project_id
      AND p.client_user_id = auth.uid()
    )
  );
