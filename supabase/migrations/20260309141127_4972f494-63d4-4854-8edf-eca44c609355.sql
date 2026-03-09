ALTER TABLE profiles 
ADD COLUMN phone TEXT,
ADD COLUMN company TEXT,
ADD COLUMN preferred_language TEXT DEFAULT 'es',
ADD COLUMN status TEXT DEFAULT 'active',
ADD COLUMN notes TEXT,
ADD COLUMN last_login_at TIMESTAMPTZ;

CREATE TABLE user_project_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  access_level TEXT DEFAULT 'client',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, project_id)
);

ALTER TABLE user_project_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_access" ON user_project_access 
  FOR ALL USING (is_admin());