CREATE TABLE project_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🔗',
  color TEXT DEFAULT '0D7377',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_links" ON project_links FOR ALL USING (is_admin());
CREATE POLICY "client_links" ON project_links FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE client_user_id = auth.uid())
);