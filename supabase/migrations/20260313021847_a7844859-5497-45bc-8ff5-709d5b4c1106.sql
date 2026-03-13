CREATE OR REPLACE FUNCTION public.delete_platform_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Safety: never delete yourself
  IF target_user_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'No puedes eliminarte a ti mismo');
  END IF;

  -- Safety: never delete last admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin'
  ) AND (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
    RETURN json_build_object('success', false, 'error', 'No puedes eliminar el único administrador');
  END IF;

  -- Only admins can call this
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos para eliminar usuarios');
  END IF;

  -- Delete related data
  DELETE FROM public.gc_project_access WHERE gc_user_id = target_user_id;
  DELETE FROM public.user_project_access WHERE user_id = target_user_id;
  DELETE FROM public.gc_profiles WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;