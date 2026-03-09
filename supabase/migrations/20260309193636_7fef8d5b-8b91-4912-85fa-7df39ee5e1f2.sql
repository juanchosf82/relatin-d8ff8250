
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS action_notes TEXT;
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS last_chased_at TIMESTAMPTZ;
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS chase_count INT DEFAULT 0;
