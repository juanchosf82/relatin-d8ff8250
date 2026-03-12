
-- GC company profiles
CREATE TABLE public.gc_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  license_number TEXT,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- GC project assignments
CREATE TABLE public.gc_project_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gc_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  permissions JSONB DEFAULT '{"sov_update": true, "photos_upload": true, "issues_manage": true, "invoices_upload": true, "visits_report": true, "waivers_upload": true}'::jsonb,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(gc_user_id, project_id)
);

-- Waivers and releases table
CREATE TABLE public.gc_waivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  gc_user_id UUID REFERENCES auth.users(id),
  draw_id UUID REFERENCES public.draws(id) ON DELETE SET NULL,
  waiver_type TEXT NOT NULL,
  amount NUMERIC(12,2),
  through_date DATE,
  file_url TEXT,
  file_filename TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_waivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "admin_all_gc_profiles" ON public.gc_profiles FOR ALL USING (is_admin());
CREATE POLICY "gc_own_profile" ON public.gc_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "gc_update_own_profile" ON public.gc_profiles FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "admin_all_gc_access" ON public.gc_project_access FOR ALL USING (is_admin());
CREATE POLICY "gc_own_access" ON public.gc_project_access FOR SELECT USING (gc_user_id = auth.uid());

CREATE POLICY "admin_all_waivers" ON public.gc_waivers FOR ALL USING (is_admin());
CREATE POLICY "gc_read_own_waivers" ON public.gc_waivers FOR SELECT USING (gc_user_id = auth.uid());
CREATE POLICY "gc_insert_waivers" ON public.gc_waivers FOR INSERT WITH CHECK (gc_user_id = auth.uid());
CREATE POLICY "gc_update_own_waivers" ON public.gc_waivers FOR UPDATE USING (gc_user_id = auth.uid() AND status IN ('pending', 'submitted'));

-- Create is_gc function
CREATE OR REPLACE FUNCTION public.is_gc()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'gc'
  )
$$;

-- GC access to related tables
CREATE POLICY "gc_projects" ON public.projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = projects.id)
  );

CREATE POLICY "gc_sov" ON public.sov_lines
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = sov_lines.project_id)
  );

CREATE POLICY "gc_update_sov" ON public.sov_lines
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = sov_lines.project_id)
  );

CREATE POLICY "gc_read_issues" ON public.issues
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = issues.project_id)
  );

CREATE POLICY "gc_insert_issues" ON public.issues
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = issues.project_id)
  );

CREATE POLICY "gc_read_photos" ON public.visit_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = visit_photos.project_id)
  );

CREATE POLICY "gc_insert_photos" ON public.visit_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = visit_photos.project_id)
  );

CREATE POLICY "gc_read_invoices" ON public.gc_invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = gc_invoices.project_id)
  );

CREATE POLICY "gc_insert_invoices" ON public.gc_invoices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = gc_invoices.project_id)
  );

CREATE POLICY "gc_read_visits" ON public.field_visits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = field_visits.project_id)
  );

CREATE POLICY "gc_insert_visits" ON public.field_visits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = field_visits.project_id)
  );

CREATE POLICY "gc_read_draws" ON public.draws
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gc_project_access WHERE gc_user_id = auth.uid() AND project_id = draws.project_id)
  );
