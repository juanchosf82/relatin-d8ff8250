
CREATE TABLE field_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visited_by TEXT NOT NULL,
  phase TEXT,
  physical_progress_observed NUMERIC(5,2),
  weather_conditions TEXT,
  workers_on_site INT,
  general_summary TEXT,
  highlights TEXT,
  concerns TEXT,
  action_items TEXT,
  next_visit_date DATE,
  visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quality_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID REFERENCES field_visits(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  category TEXT NOT NULL,
  item TEXT NOT NULL,
  result TEXT DEFAULT 'pending',
  notes TEXT,
  requires_action BOOLEAN DEFAULT false,
  sequence INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visit_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID REFERENCES field_visits(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  phase TEXT,
  category TEXT,
  is_issue BOOLEAN DEFAULT false,
  visible_to_client BOOLEAN DEFAULT true,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quality_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES field_visits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  phase TEXT,
  category TEXT,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  due_date DATE,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_visits" ON field_visits FOR ALL USING (is_admin());
CREATE POLICY "client_read_visits" ON field_visits FOR SELECT USING (
  visible_to_client = true AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = field_visits.project_id AND p.client_user_id = auth.uid()
  )
);

CREATE POLICY "admin_all_checklist" ON quality_checklist_items FOR ALL USING (is_admin());
CREATE POLICY "client_read_checklist" ON quality_checklist_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM field_visits fv
    JOIN projects p ON p.id = fv.project_id
    WHERE fv.id = quality_checklist_items.visit_id
    AND p.client_user_id = auth.uid()
    AND fv.visible_to_client = true
  )
);

CREATE POLICY "admin_all_photos" ON visit_photos FOR ALL USING (is_admin());
CREATE POLICY "client_read_photos" ON visit_photos FOR SELECT USING (
  visible_to_client = true AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = visit_photos.project_id AND p.client_user_id = auth.uid()
  )
);

CREATE POLICY "admin_all_quality_issues" ON quality_issues FOR ALL USING (is_admin());
CREATE POLICY "client_read_quality_issues" ON quality_issues FOR SELECT USING (
  visible_to_client = true AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = quality_issues.project_id AND p.client_user_id = auth.uid()
  )
);
