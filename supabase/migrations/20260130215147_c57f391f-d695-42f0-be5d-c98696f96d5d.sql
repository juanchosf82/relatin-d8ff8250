-- Add SELECT policy for administrators on profiles table
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin());