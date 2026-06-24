
DROP POLICY IF EXISTS "Authenticated full access" ON public.students;
DROP POLICY IF EXISTS "Authenticated full access" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated full access" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated full access" ON public.courses;
DROP POLICY IF EXISTS "Authenticated full access" ON public.batches;
DROP POLICY IF EXISTS "Authenticated full access" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated full access" ON public.subject_sheets;

CREATE POLICY "Signed-in users full access" ON public.students
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users full access" ON public.teachers
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users full access" ON public.attendance
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users full access" ON public.courses
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users full access" ON public.batches
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users full access" ON public.app_settings
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users full access" ON public.subject_sheets
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
