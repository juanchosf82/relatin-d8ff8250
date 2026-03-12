
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS assigned_to TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows: set title from description if null
UPDATE public.issues SET title = LEFT(description, 80) WHERE title IS NULL;

-- Fix RLS: add client read policy for visible_to_client
DROP POLICY IF EXISTS "client_issues" ON public.issues;
CREATE POLICY "client_issues" ON public.issues
FOR SELECT TO public
USING (
  (visible_to_client = true) AND 
  (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = issues.project_id AND p.client_user_id = auth.uid()
  ))
);
