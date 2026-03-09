
-- Add permissions JSONB column to user_project_access
ALTER TABLE user_project_access 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"view_financials": true, "download_reports": true, "view_draws": true}'::jsonb;

-- Add editor and viewer to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'viewer';
