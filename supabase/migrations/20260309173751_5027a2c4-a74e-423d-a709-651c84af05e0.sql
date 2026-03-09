
CREATE TABLE milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase TEXT NOT NULL,
  sequence INT NOT NULL DEFAULT 0,
  baseline_start DATE,
  baseline_end DATE,
  actual_start DATE,
  actual_end DATE,
  status TEXT DEFAULT 'pending',
  is_critical_path BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_milestones" ON milestones
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_milestones" ON milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = milestones.project_id
      AND p.client_user_id = auth.uid()
    )
  );
