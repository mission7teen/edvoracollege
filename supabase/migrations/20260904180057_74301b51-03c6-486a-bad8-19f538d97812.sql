-- 1. Colleges + membership
CREATE TABLE public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My College',
  owner_id uuid,
  setup_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.colleges TO authenticated;
GRANT ALL ON public.colleges TO service_role;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.college_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.college_members TO authenticated;
GRANT ALL ON public.college_members TO service_role;
ALTER TABLE public.college_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_college_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT college_id FROM public.college_members WHERE user_id = auth.uid()
$$;

CREATE POLICY "Members read their college" ON public.colleges
  FOR SELECT TO authenticated USING (id = public.current_college_id());
CREATE POLICY "Members update their college" ON public.colleges
  FOR UPDATE TO authenticated USING (id = public.current_college_id()) WITH CHECK (id = public.current_college_id());
CREATE POLICY "Members read their membership" ON public.college_members
  FOR SELECT TO authenticated USING (college_id = public.current_college_id());

-- 2. Backfill: one main college holding all existing data
DO $$
DECLARE v_owner uuid; v_college uuid;
BEGIN
  SELECT id INTO v_owner FROM auth.users ORDER BY created_at ASC LIMIT 1;
  INSERT INTO public.colleges (name, owner_id, setup_completed)
  VALUES ('EDVORA COLLEGE', v_owner, true) RETURNING id INTO v_college;
  INSERT INTO public.college_members (user_id, college_id)
  SELECT id, v_college FROM auth.users ON CONFLICT DO NOTHING;
END $$;

-- 3. Add college_id to every tenant table
ALTER TABLE public.students ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.teachers ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.courses ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.batches ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.exams ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.exam_marks ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.payment_packages ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.student_payments ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.subject_sheets ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.user_access ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.app_roles ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;

DO $$
DECLARE v_college uuid;
BEGIN
  SELECT id INTO v_college FROM public.colleges ORDER BY created_at ASC LIMIT 1;
  UPDATE public.students SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.teachers SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.courses SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.batches SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.attendance SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.exams SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.exam_marks SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.payment_packages SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.student_payments SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.subject_sheets SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.app_settings SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.user_roles SET college_id = v_college WHERE college_id IS NULL;
  UPDATE public.user_access SET college_id = v_college WHERE college_id IS NULL;
END $$;

ALTER TABLE public.students ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.teachers ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.courses ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.batches ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.attendance ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.exams ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.exam_marks ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.payment_packages ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.student_payments ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.subject_sheets ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.app_settings ALTER COLUMN college_id SET NOT NULL, ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.user_roles ALTER COLUMN college_id SET DEFAULT public.current_college_id();
ALTER TABLE public.user_access ALTER COLUMN college_id SET DEFAULT public.current_college_id();

-- 4. Per-college keys
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (college_id);
ALTER TABLE public.subject_sheets DROP CONSTRAINT IF EXISTS subject_sheets_pkey;
ALTER TABLE public.subject_sheets ADD PRIMARY KEY (college_id, key);

-- 5. Admin check scoped to the caller's college
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        AND (ur.college_id IS NULL OR ur.college_id = public.current_college_id())
    )
    OR EXISTS (
      SELECT 1 FROM public.colleges c
      WHERE c.id = public.current_college_id() AND c.owner_id = auth.uid()
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.college_id = public.current_college_id()
    )
$$;

-- 6. Replace blanket policies with college-scoped ones
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','teachers','courses','batches','attendance','exams','exam_marks','payment_packages','student_payments','subject_sheets','app_settings','user_roles','user_access','app_roles']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['students','teachers','courses','batches','attendance','exams','exam_marks','payment_packages','student_payments','subject_sheets','app_settings']
  LOOP
    EXECUTE format(
      'CREATE POLICY "College members full access" ON public.%I FOR ALL TO authenticated USING (college_id = public.current_college_id()) WITH CHECK (college_id = public.current_college_id())', t);
  END LOOP;
END $$;

CREATE POLICY "Read roles in my college" ON public.user_roles
  FOR SELECT TO authenticated USING (college_id = public.current_college_id());
CREATE POLICY "Admins manage roles in my college" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin() AND college_id = public.current_college_id())
  WITH CHECK (public.is_admin() AND college_id = public.current_college_id());

CREATE POLICY "Read access rows in my college" ON public.user_access
  FOR SELECT TO authenticated USING (college_id = public.current_college_id());
CREATE POLICY "Admins manage access in my college" ON public.user_access
  FOR ALL TO authenticated USING (public.is_admin() AND college_id = public.current_college_id())
  WITH CHECK (public.is_admin() AND college_id = public.current_college_id());

CREATE POLICY "Read shared and own roles catalog" ON public.app_roles
  FOR SELECT TO authenticated USING (college_id IS NULL OR college_id = public.current_college_id());
CREATE POLICY "Admins manage own roles catalog" ON public.app_roles
  FOR ALL TO authenticated USING (public.is_admin() AND college_id = public.current_college_id())
  WITH CHECK (public.is_admin() AND college_id = public.current_college_id());

-- 7. Setup + save helpers
CREATE OR REPLACE FUNCTION public.create_my_college(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT college_id INTO v_id FROM public.college_members WHERE user_id = v_uid;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.colleges (name, owner_id) VALUES (COALESCE(NULLIF(trim(_name), ''), 'My College'), v_uid)
  RETURNING id INTO v_id;
  INSERT INTO public.college_members (user_id, college_id) VALUES (v_uid, v_id);
  INSERT INTO public.user_roles (user_id, role, college_id) VALUES (v_uid, 'admin', v_id);
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.create_my_college(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_my_setup()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.colleges SET setup_completed = true, updated_at = now()
  WHERE id = public.current_college_id();
$$;
GRANT EXECUTE ON FUNCTION public.complete_my_setup() TO authenticated;

CREATE OR REPLACE FUNCTION public.save_app_settings(_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := public.current_college_id();
BEGIN
  IF v_id IS NULL THEN RAISE EXCEPTION 'No college'; END IF;
  INSERT INTO public.app_settings (id, college_id, data, updated_at)
  VALUES ('default', v_id, _data, now())
  ON CONFLICT (college_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
  UPDATE public.colleges SET name = COALESCE(NULLIF(_data->>'name',''), name), updated_at = now() WHERE id = v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.save_app_settings(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_subject_sheet(_key text, _spreadsheet_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := public.current_college_id();
BEGIN
  IF v_id IS NULL THEN RAISE EXCEPTION 'No college'; END IF;
  INSERT INTO public.subject_sheets (key, college_id, spreadsheet_id)
  VALUES (_key, v_id, _spreadsheet_id)
  ON CONFLICT (college_id, key) DO UPDATE SET spreadsheet_id = EXCLUDED.spreadsheet_id;
END $$;
GRANT EXECUTE ON FUNCTION public.save_subject_sheet(text, text) TO authenticated;