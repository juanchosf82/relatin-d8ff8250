
CREATE TABLE permits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  permit_number TEXT,
  issuing_authority TEXT,
  status TEXT DEFAULT 'pending',
  applied_date DATE,
  issued_date DATE,
  expiration_date DATE,
  inspection_required BOOLEAN DEFAULT false,
  inspection_status TEXT DEFAULT 'pending',
  inspection_date DATE,
  inspection_result TEXT,
  inspector_name TEXT,
  notes TEXT,
  visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  permit_id UUID REFERENCES permits(id) ON DELETE SET NULL,
  phase TEXT NOT NULL,
  name TEXT NOT NULL,
  sequence INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  scheduled_date DATE,
  completed_date DATE,
  result TEXT,
  inspector_name TEXT,
  re_inspection_required BOOLEAN DEFAULT false,
  re_inspection_date DATE,
  notes TEXT,
  visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_permits" ON permits
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_permits" ON permits
  FOR SELECT USING (
    visible_to_client = true AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = permits.project_id
      AND p.client_user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_inspections" ON inspections
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_inspections" ON inspections
  FOR SELECT USING (
    visible_to_client = true AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = inspections.project_id
      AND p.client_user_id = auth.uid()
    )
  );
