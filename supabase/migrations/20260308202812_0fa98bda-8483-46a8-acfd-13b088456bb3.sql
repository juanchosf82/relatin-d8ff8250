
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  gc_name TEXT,
  gc_license TEXT,
  lender_name TEXT,
  loan_amount NUMERIC,
  eac NUMERIC,
  progress_pct INTEGER DEFAULT 0,
  status TEXT DEFAULT 'on_track',
  co_target_date DATE,
  permit_no TEXT,
  permit_status TEXT DEFAULT 'active',
  liens_count INTEGER DEFAULT 0,
  last_visit_date DATE,
  client_user_id UUID REFERENCES auth.users(id),
  lender_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sov_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  line_number TEXT NOT NULL,
  name TEXT NOT NULL,
  budget NUMERIC DEFAULT 0,
  progress_pct INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE draws (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  draw_number INTEGER NOT NULL,
  amount_requested NUMERIC,
  amount_certified NUMERIC,
  status TEXT DEFAULT 'pending',
  certificate_url TEXT,
  request_date DATE,
  sent_to_bank_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE weekly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  week_number INTEGER,
  report_date DATE,
  pdf_url TEXT,
  highlight_text TEXT,
  closing_balance NUMERIC,
  published_at TIMESTAMPTZ
);

CREATE TABLE issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT
);

CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT,
  name TEXT NOT NULL,
  file_url TEXT,
  visible_to_client BOOLEAN DEFAULT true,
  visible_to_lender BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cashflow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  week_label TEXT,
  inflows NUMERIC DEFAULT 0,
  outflows NUMERIC DEFAULT 0,
  balance NUMERIC,
  week_order INTEGER
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sov_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_projects" ON projects FOR ALL USING (is_admin());
CREATE POLICY "admin_all_sov" ON sov_lines FOR ALL USING (is_admin());
CREATE POLICY "admin_all_draws" ON draws FOR ALL USING (is_admin());
CREATE POLICY "admin_all_reports" ON weekly_reports FOR ALL USING (is_admin());
CREATE POLICY "admin_all_issues" ON issues FOR ALL USING (is_admin());
CREATE POLICY "admin_all_docs" ON documents FOR ALL USING (is_admin());
CREATE POLICY "admin_all_cashflow" ON cashflow FOR ALL USING (is_admin());

CREATE POLICY "client_projects" ON projects FOR SELECT USING (client_user_id = auth.uid());
CREATE POLICY "client_sov" ON sov_lines FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE client_user_id = auth.uid()));
CREATE POLICY "client_draws" ON draws FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE client_user_id = auth.uid()));
CREATE POLICY "client_reports" ON weekly_reports FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE client_user_id = auth.uid()) AND published_at IS NOT NULL);
CREATE POLICY "client_issues" ON issues FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE client_user_id = auth.uid()));
CREATE POLICY "client_docs" ON documents FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE client_user_id = auth.uid()) AND visible_to_client = true);
CREATE POLICY "client_cashflow" ON cashflow FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE client_user_id = auth.uid()));

CREATE POLICY "lender_draws" ON draws FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE lender_user_id = auth.uid()) AND status IN ('sent', 'paid'));
CREATE POLICY "lender_docs" ON documents FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE lender_user_id = auth.uid()) AND visible_to_lender = true);
