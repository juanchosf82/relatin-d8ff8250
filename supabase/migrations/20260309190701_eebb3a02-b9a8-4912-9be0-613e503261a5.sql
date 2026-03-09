
CREATE TABLE risks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  probability TEXT NOT NULL DEFAULT 'medium',
  impact TEXT NOT NULL DEFAULT 'medium',
  level TEXT GENERATED ALWAYS AS (
    CASE
      WHEN probability = 'high' AND impact = 'high' THEN 'critical'
      WHEN probability = 'high' AND impact = 'medium' THEN 'high'
      WHEN probability = 'medium' AND impact = 'high' THEN 'high'
      WHEN probability = 'low' AND impact = 'high' THEN 'medium'
      WHEN probability = 'high' AND impact = 'low' THEN 'medium'
      ELSE 'low'
    END
  ) STORED,
  mitigation TEXT,
  owner TEXT,
  status TEXT DEFAULT 'open',
  visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_risks" ON risks
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_risks" ON risks
  FOR SELECT USING (
    visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = risks.project_id
      AND p.client_user_id = auth.uid()
    )
  );
