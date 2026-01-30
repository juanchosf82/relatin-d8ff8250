-- Add DELETE policy for administrators on profiles table
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (is_admin());