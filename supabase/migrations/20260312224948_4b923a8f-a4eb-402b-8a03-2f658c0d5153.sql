
-- Extend project_documents table with new columns
ALTER TABLE project_documents 
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS visible_to_gc BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES project_documents(id),
  ADD COLUMN IF NOT EXISTS is_current_version BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS uploaded_by_role TEXT,
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_requested_by UUID;

-- Document categories master table
CREATE TABLE IF NOT EXISTS doc_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  sequence INT,
  is_required_check BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#0D7377'
);

ALTER TABLE doc_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_doc_categories" ON doc_categories FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read_doc_categories" ON doc_categories FOR SELECT TO authenticated USING (true);

-- Required documents template per category
CREATE TABLE IF NOT EXISTS doc_required_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_code TEXT REFERENCES doc_categories(code),
  name TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  expiration_required BOOLEAN DEFAULT false,
  expiration_alert_days INT DEFAULT 30,
  responsible_role TEXT DEFAULT 'admin',
  sequence INT
);

ALTER TABLE doc_required_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_doc_templates" ON doc_required_templates FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read_doc_templates" ON doc_required_templates FOR SELECT TO authenticated USING (true);

-- Add GC read policy for project_documents
CREATE POLICY "gc_read_project_docs" ON project_documents
  FOR SELECT USING (
    (visible_to_gc = true) AND EXISTS (
      SELECT 1 FROM gc_project_access
      WHERE gc_project_access.gc_user_id = auth.uid()
        AND gc_project_access.project_id = project_documents.project_id
    )
  );

-- Add GC insert policy for project_documents (upload assigned docs)
CREATE POLICY "gc_insert_project_docs" ON project_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM gc_project_access
      WHERE gc_project_access.gc_user_id = auth.uid()
        AND gc_project_access.project_id = project_documents.project_id
    )
  );

-- Add GC update policy for project_documents (update own docs)
CREATE POLICY "gc_update_project_docs" ON project_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gc_project_access
      WHERE gc_project_access.gc_user_id = auth.uid()
        AND gc_project_access.project_id = project_documents.project_id
    )
  );
