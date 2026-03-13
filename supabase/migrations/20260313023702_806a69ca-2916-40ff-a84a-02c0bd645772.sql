
-- Add new columns to project_documents for Pinellas County document management
ALTER TABLE public.project_documents
  ADD COLUMN IF NOT EXISTS tab TEXT NOT NULL DEFAULT 'inicio',
  ADD COLUMN IF NOT EXISTS discipline TEXT,
  ADD COLUMN IF NOT EXISTS is_florida_specific BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinellas_reference TEXT,
  ADD COLUMN IF NOT EXISTS assigned_role TEXT DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS expiration_alert_days INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS sequence INT DEFAULT 0;

-- Update existing RLS policies for GC insert to also cover new docs
CREATE POLICY "gc_update_new_docs" ON public.project_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gc_project_access
      WHERE gc_user_id = auth.uid()
      AND project_id = project_documents.project_id
    )
  );
