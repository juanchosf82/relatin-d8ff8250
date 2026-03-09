
CREATE TABLE project_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size_kb INT,
  status TEXT DEFAULT 'pending',
  expiration_date DATE,
  is_required BOOLEAN DEFAULT true,
  visible_to_client BOOLEAN DEFAULT true,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_project_docs" ON project_documents
  FOR ALL USING (is_admin());

CREATE POLICY "client_read_project_docs" ON project_documents
  FOR SELECT USING (
    visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_documents.project_id
      AND p.client_user_id = auth.uid()
    )
  );
