
CREATE TABLE onboarding_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  block TEXT NOT NULL,
  section TEXT NOT NULL,
  sequence INT NOT NULL DEFAULT 0,
  item_text TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  assigned_to TEXT,
  due_date DATE,
  notes TEXT,
  visible_to_client BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE onboarding_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_onboarding" ON onboarding_items
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_onboarding" ON onboarding_items
  FOR SELECT USING (
    visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = onboarding_items.project_id
      AND p.client_user_id = auth.uid()
    )
  );
