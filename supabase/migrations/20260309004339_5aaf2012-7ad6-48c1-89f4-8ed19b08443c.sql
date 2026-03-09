-- Create project_files bucket for draws and reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project_files', 'project_files', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the bucket
CREATE POLICY "Public access to project_files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'project_files');

CREATE POLICY "Admins can upload to project_files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'project_files' AND public.is_admin());

CREATE POLICY "Admins can update project_files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'project_files' AND public.is_admin());

CREATE POLICY "Admins can delete project_files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'project_files' AND public.is_admin());