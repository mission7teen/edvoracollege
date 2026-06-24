
CREATE TABLE public.courses (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  description text DEFAULT '',
  duration text DEFAULT '',
  start_date text DEFAULT '',
  end_date text DEFAULT '',
  group_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.batches (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  course_id text,
  academic_year text DEFAULT '',
  schedule text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.teachers (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  photo_url text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  qualification text DEFAULT '',
  subject_id text,
  subject_ids text[] DEFAULT '{}',
  joined_date text DEFAULT '',
  status text DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.students (
  id text PRIMARY KEY,
  student_id text NOT NULL,
  full_name text NOT NULL,
  photo_url text DEFAULT '',
  gender text DEFAULT 'Male',
  dob text DEFAULT '',
  nic text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  guardian_name text DEFAULT '',
  guardian_phone text DEFAULT '',
  course_id text,
  batch_id text,
  registration_date text DEFAULT '',
  status text DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.attendance (
  id text PRIMARY KEY,
  student_id text NOT NULL,
  batch_id text,
  course_id text,
  teacher_id text,
  date text NOT NULL,
  status text NOT NULL,
  remarks text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attendance_batch_date_idx ON public.attendance(batch_id, date);
CREATE INDEX attendance_student_idx ON public.attendance(student_id);

CREATE TABLE public.app_settings (
  id text PRIMARY KEY DEFAULT 'default',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subject_sheets (
  key text PRIMARY KEY,
  spreadsheet_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grants: app uses a shared admin login (no per-user Supabase auth), so anon needs full access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_sheets TO anon, authenticated;
GRANT ALL ON public.courses, public.batches, public.teachers, public.students, public.attendance, public.app_settings, public.subject_sheets TO service_role;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access" ON public.courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.subject_sheets FOR ALL USING (true) WITH CHECK (true);
