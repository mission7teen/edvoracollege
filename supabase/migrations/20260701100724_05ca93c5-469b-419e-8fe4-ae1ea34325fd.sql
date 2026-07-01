
CREATE TABLE public.exams (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Monthly',
  subject_id text,
  batch_id text,
  date text NOT NULL DEFAULT '',
  max_marks numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users full access" ON public.exams FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.exam_marks (
  id text PRIMARY KEY,
  exam_id text NOT NULL,
  student_id text NOT NULL,
  marks numeric NOT NULL DEFAULT 0,
  grade text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_marks TO authenticated;
GRANT ALL ON public.exam_marks TO service_role;
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users full access" ON public.exam_marks FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.payment_packages (
  id text PRIMARY KEY,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_packages TO authenticated;
GRANT ALL ON public.payment_packages TO service_role;
ALTER TABLE public.payment_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users full access" ON public.payment_packages FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.student_payments (
  id text PRIMARY KEY,
  student_id text NOT NULL,
  package_id text,
  month text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_on text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_payments TO authenticated;
GRANT ALL ON public.student_payments TO service_role;
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users full access" ON public.student_payments FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
