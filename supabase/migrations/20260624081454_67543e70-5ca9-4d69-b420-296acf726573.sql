
-- Revoke broad anon access; keep authenticated + service_role
REVOKE ALL ON public.students, public.teachers, public.attendance, public.courses, public.batches, public.app_settings, public.subject_sheets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_sheets TO authenticated;
GRANT ALL ON public.students, public.teachers, public.attendance, public.courses, public.batches, public.app_settings, public.subject_sheets TO service_role;

-- Drop the old "Public full access" policies
DROP POLICY IF EXISTS "Public full access" ON public.students;
DROP POLICY IF EXISTS "Public full access" ON public.teachers;
DROP POLICY IF EXISTS "Public full access" ON public.attendance;
DROP POLICY IF EXISTS "Public full access" ON public.courses;
DROP POLICY IF EXISTS "Public full access" ON public.batches;
DROP POLICY IF EXISTS "Public full access" ON public.app_settings;
DROP POLICY IF EXISTS "Public full access" ON public.subject_sheets;

-- Authenticated-only full access on every table
CREATE POLICY "Authenticated full access" ON public.students
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.teachers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.attendance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.courses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.app_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.subject_sheets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
