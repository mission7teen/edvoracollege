REVOKE ALL ON FUNCTION public.create_my_college(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_my_setup() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_app_settings(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_subject_sheet(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_college_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_my_college(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_setup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_app_settings(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_subject_sheet(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_college_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;