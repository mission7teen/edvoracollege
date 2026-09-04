import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_ACCENT } from "./theme";
import type {
  Student,
  Course,
  Batch,
  AttendanceRecord,
  CollegeSettings,
  AttendanceStatus,
  Teacher,
  Exam,
  ExamMark,
  PaymentPackage,
  StudentPayment,
} from "./types";
import {
  generateAttendance,
  generateStudents,
  seedBatches,
  seedCourses,
  seedTeachers,
} from "./seed";
import { supabase } from "@/integrations/supabase/client";

interface DataState {
  students: Student[];
  courses: Course[];
  batches: Batch[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  settings: CollegeSettings;
  theme: "light" | "dark";
  accent: string;
  customAccents: string[];
  subjectSheetIds: Record<string, string>;
  exams: Exam[];
  examMarks: ExamMark[];
  paymentPackages: PaymentPackage[];
  studentPayments: StudentPayment[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addStudent: (
    s: Omit<Student, "id" | "studentId" | "registrationDate"> & { studentId?: string },
  ) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addCourse: (c: Omit<Course, "id">) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  addBatch: (b: Omit<Batch, "id">) => void;
  updateBatch: (id: string, patch: Partial<Batch>) => void;
  deleteBatch: (id: string) => void;
  addTeacher: (t: Omit<Teacher, "id">) => void;
  updateTeacher: (id: string, patch: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  saveAttendance: (
    date: string,
    batchId: string,
    courseId: string,
    marks: Record<string, AttendanceStatus>,
    remarks?: Record<string, string>,
    teacherId?: string,
  ) => void;
  deleteAttendanceRecord: (id: string) => void;
  updateAttendanceRecord: (id: string, patch: Partial<AttendanceRecord>) => void;
  updateSettings: (patch: Partial<CollegeSettings>) => void;
  setTheme: (t: "light" | "dark") => void;
  setAccent: (hex: string) => void;
  addCustomAccent: (hex: string) => void;
  removeCustomAccent: (hex: string) => void;
  setSubjectSheetId: (key: string, spreadsheetId: string) => void;
  addExam: (e: Omit<Exam, "id">) => string;
  updateExam: (id: string, patch: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  saveExamMarks: (examId: string, marks: Record<string, number>) => void;
  addPaymentPackage: (p: Omit<PaymentPackage, "id">) => void;
  updatePaymentPackage: (id: string, patch: Partial<PaymentPackage>) => void;
  deletePaymentPackage: (id: string) => void;
  addStudentPayment: (p: Omit<StudentPayment, "id">) => void;
  deleteStudentPayment: (id: string) => void;
  reset: () => void;
}

const defaultSettings: CollegeSettings = {
  name: "EDVORA COLLEGE",
  tagline: "A/L Commerce in English — Business Studies, Accounting & Economics.",
  logo: "",
  email: "info@edvoracollege.com",
  phone: "071 612 6128",
  address: "No. 24, Galle Road, Colombo 03, Sri Lanka",
  academicYear: "2025/2026",
  attendanceThreshold: 80,
};

function genId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function nextStudentId(students: Student[]) {
  const nums = students.map((s) => parseInt(s.studentId.replace(/\D/g, ""), 10) || 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return `EDV-${(max + 1).toString().padStart(4, "0")}`;
}

// ============ Supabase row mappers ============
const courseToRow = (c: Course) => ({
  id: c.id, name: c.name, code: c.code, description: c.description || "",
  duration: c.duration || "", start_date: c.startDate || "", end_date: c.endDate || "",
  group_name: c.group || "",
});
const rowToCourse = (r: any): Course => ({
  id: r.id, name: r.name, code: r.code, description: r.description || "",
  duration: r.duration || "", startDate: r.start_date || "", endDate: r.end_date || "",
  group: r.group_name || "",
});

const batchToRow = (b: Batch) => ({
  id: b.id, name: b.name, code: b.code, course_id: b.courseId,
  academic_year: b.academicYear || "", schedule: b.schedule || "",
});
const rowToBatch = (r: any): Batch => ({
  id: r.id, name: r.name, code: r.code, courseId: r.course_id || "",
  academicYear: r.academic_year || "", schedule: r.schedule || "",
});

const teacherToRow = (t: Teacher) => ({
  id: t.id, full_name: t.fullName, photo_url: t.photoUrl || "", email: t.email || "",
  phone: t.phone || "", qualification: t.qualification || "",
  subject_id: t.subjectId || null, subject_ids: t.subjectIds || [],
  joined_date: t.joinedDate || "", status: t.status,
});
const rowToTeacher = (r: any): Teacher => ({
  id: r.id, fullName: r.full_name, photoUrl: r.photo_url || "", email: r.email || "",
  phone: r.phone || "", qualification: r.qualification || "",
  subjectId: r.subject_id || "", subjectIds: r.subject_ids || [],
  joinedDate: r.joined_date || "", status: (r.status as any) || "Active",
});

const studentToRow = (s: Student) => ({
  id: s.id, student_id: s.studentId, full_name: s.fullName, photo_url: s.photoUrl || "",
  gender: s.gender, dob: s.dob || "", nic: s.nic || "", phone: s.phone || "",
  email: s.email || "", address: s.address || "", guardian_name: s.guardianName || "",
  guardian_phone: s.guardianPhone || "", course_id: s.courseId || null,
  batch_id: s.batchId || null, registration_date: s.registrationDate || "",
  status: s.status,
});
const rowToStudent = (r: any): Student => ({
  id: r.id, studentId: r.student_id, fullName: r.full_name, photoUrl: r.photo_url || "",
  gender: (r.gender as any) || "Male", dob: r.dob || "", nic: r.nic || "",
  phone: r.phone || "", email: r.email || "", address: r.address || "",
  guardianName: r.guardian_name || "", guardianPhone: r.guardian_phone || "",
  courseId: r.course_id || "", batchId: r.batch_id || "",
  registrationDate: r.registration_date || "", status: (r.status as any) || "Active",
});

const attToRow = (a: AttendanceRecord) => ({
  id: a.id, student_id: a.studentId, batch_id: a.batchId || null,
  course_id: a.courseId || null, teacher_id: a.teacherId || null,
  date: a.date, status: a.status, remarks: a.remarks || "",
});
const rowToAtt = (r: any): AttendanceRecord => ({
  id: r.id, studentId: r.student_id, batchId: r.batch_id || "",
  courseId: r.course_id || "", teacherId: r.teacher_id || undefined,
  date: r.date, status: r.status, remarks: r.remarks || "",
});

// ============ Exam / Payment mappers ============
const examToRow = (e: Exam) => ({
  id: e.id, name: e.name, type: e.type, subject_id: e.subjectId || null,
  batch_id: e.batchId || null, date: e.date || "", max_marks: e.maxMarks || 100,
});
const rowToExam = (r: any): Exam => ({
  id: r.id, name: r.name, type: (r.type as any) || "Monthly",
  subjectId: r.subject_id || "", batchId: r.batch_id || "",
  date: r.date || "", maxMarks: Number(r.max_marks) || 100,
});
const markToRow = (m: ExamMark) => ({
  id: m.id, exam_id: m.examId, student_id: m.studentId,
  marks: m.marks, grade: m.grade,
});
const rowToMark = (r: any): ExamMark => ({
  id: r.id, examId: r.exam_id, studentId: r.student_id,
  marks: Number(r.marks) || 0, grade: r.grade || "",
});
const pkgToRow = (p: PaymentPackage) => ({
  id: p.id, name: p.name, amount: p.amount, description: p.description || "",
});
const rowToPkg = (r: any): PaymentPackage => ({
  id: r.id, name: r.name, amount: Number(r.amount) || 0, description: r.description || "",
});
const payToRow = (p: StudentPayment) => ({
  id: p.id, student_id: p.studentId, package_id: p.packageId || null,
  month: p.month, amount: p.amount, paid_on: p.paidOn || "",
});
const rowToPay = (r: any): StudentPayment => ({
  id: r.id, studentId: r.student_id, packageId: r.package_id || undefined,
  month: r.month, amount: Number(r.amount) || 0, paidOn: r.paid_on || "",
});

export function computeGrade(marks: number, max: number): string {
  if (!max || max <= 0) return "";
  const pct = (marks / max) * 100;
  if (pct >= 75) return "A";
  if (pct >= 65) return "B";
  if (pct >= 55) return "C";
  if (pct >= 35) return "S";
  return "F";
}

// Fire-and-forget helpers (log on failure but don't throw)
const fnf = (p: PromiseLike<any>) => {
  Promise.resolve(p)
    .then((r) => { if (r?.error) console.error("[supabase]", r.error); })
    .catch((e) => console.error("[supabase]", e));
};

async function fetchAll() {
  const [c, b, t, s, a, set, sh, ex, em, pp, sp] = await Promise.all([
    supabase.from("courses").select("*"),
    supabase.from("batches").select("*"),
    supabase.from("teachers").select("*"),
    supabase.from("students").select("*"),
    supabase.from("attendance").select("*"),
    supabase.from("app_settings").select("*").eq("id", "default").maybeSingle(),
    supabase.from("subject_sheets").select("*"),
    supabase.from("exams").select("*"),
    supabase.from("exam_marks").select("*"),
    supabase.from("payment_packages").select("*"),
    supabase.from("student_payments").select("*"),
  ]);
  return { c, b, t, s, a, set, sh, ex, em, pp, sp };
}

async function seedCloudIfEmpty() {
  const students = generateStudents();
  const attendance = generateAttendance(students);
  await supabase.from("courses").insert(seedCourses.map(courseToRow));
  await supabase.from("batches").insert(seedBatches.map(batchToRow));
  await supabase.from("teachers").insert(seedTeachers.map(teacherToRow));
  // chunk students/attendance to be safe
  for (let i = 0; i < students.length; i += 200) {
    await supabase.from("students").insert(students.slice(i, i + 200).map(studentToRow));
  }
  for (let i = 0; i < attendance.length; i += 500) {
    await supabase.from("attendance").insert(attendance.slice(i, i + 500).map(attToRow));
  }
  return { students, attendance };
}

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      students: [],
      courses: [],
      batches: [],
      teachers: [],
      attendance: [],
      settings: defaultSettings,
      theme: "light",
      accent: DEFAULT_ACCENT,
      customAccents: [],
      subjectSheetIds: {},
      exams: [],
      examMarks: [],
      paymentPackages: [],
      studentPayments: [],
      hydrated: false,
      hydrate: async () => {
        if (get().hydrated) return;
        try {
          const { c, b, t, s, a, set: settingsRow, sh, ex, em, pp, sp } = await fetchAll();
          const settings = settingsRow?.data?.data
            ? { ...defaultSettings, ...(settingsRow.data.data as any) }
            : defaultSettings;
          const subjectSheetIds: Record<string, string> = {};
          for (const row of sh.data || []) subjectSheetIds[row.key] = row.spreadsheet_id;
          set({
            courses: (c.data || []).map(rowToCourse),
            batches: (b.data || []).map(rowToBatch),
            teachers: (t.data || []).map(rowToTeacher),
            students: (s.data || []).map(rowToStudent),
            attendance: (a.data || []).map(rowToAtt),
            settings,
            subjectSheetIds,
            exams: (ex?.data || []).map(rowToExam),
            examMarks: (em?.data || []).map(rowToMark),
            paymentPackages: (pp?.data || []).map(rowToPkg),
            studentPayments: (sp?.data || []).map(rowToPay),
            hydrated: true,
          });
        } catch (e) {
          console.error("[hydrate]", e);
          set({ hydrated: true });
        }
      },
      addStudent: (s) => {
        const student: Student = {
          ...s,
          id: genId("s"),
          studentId: s.studentId || nextStudentId(get().students),
          registrationDate: new Date().toISOString().slice(0, 10),
        };
        set({ students: [student, ...get().students] });
        fnf(supabase.from("students").insert(studentToRow(student)));
      },
      updateStudent: (id, patch) => {
        const next = get().students.map((s) => (s.id === id ? { ...s, ...patch } : s));
        set({ students: next });
        const row = next.find((s) => s.id === id);
        if (row) fnf(supabase.from("students").update(studentToRow(row)).eq("id", id));
      },
      deleteStudent: (id) => {
        set({
          students: get().students.filter((s) => s.id !== id),
          attendance: get().attendance.filter((a) => a.studentId !== id),
        });
        fnf(supabase.from("attendance").delete().eq("student_id", id));
        fnf(supabase.from("students").delete().eq("id", id));
      },
      addCourse: (c) => {
        const course: Course = { ...c, id: genId("c") };
        set({ courses: [course, ...get().courses] });
        fnf(supabase.from("courses").insert(courseToRow(course)));
      },
      updateCourse: (id, patch) => {
        const next = get().courses.map((c) => (c.id === id ? { ...c, ...patch } : c));
        set({ courses: next });
        const row = next.find((c) => c.id === id);
        if (row) fnf(supabase.from("courses").update(courseToRow(row)).eq("id", id));
      },
      deleteCourse: (id) => {
        set({ courses: get().courses.filter((c) => c.id !== id) });
        fnf(supabase.from("courses").delete().eq("id", id));
      },
      addBatch: (b) => {
        const batch: Batch = { ...b, id: genId("b") };
        set({ batches: [batch, ...get().batches] });
        fnf(supabase.from("batches").insert(batchToRow(batch)));
      },
      updateBatch: (id, patch) => {
        const next = get().batches.map((b) => (b.id === id ? { ...b, ...patch } : b));
        set({ batches: next });
        const row = next.find((b) => b.id === id);
        if (row) fnf(supabase.from("batches").update(batchToRow(row)).eq("id", id));
      },
      deleteBatch: (id) => {
        set({ batches: get().batches.filter((b) => b.id !== id) });
        fnf(supabase.from("batches").delete().eq("id", id));
      },
      addTeacher: (t) => {
        const teacher: Teacher = { ...t, id: genId("t") };
        set({ teachers: [teacher, ...get().teachers] });
        fnf(supabase.from("teachers").insert(teacherToRow(teacher)));
      },
      updateTeacher: (id, patch) => {
        const next = get().teachers.map((t) => (t.id === id ? { ...t, ...patch } : t));
        set({ teachers: next });
        const row = next.find((t) => t.id === id);
        if (row) fnf(supabase.from("teachers").update(teacherToRow(row)).eq("id", id));
      },
      deleteTeacher: (id) => {
        set({ teachers: get().teachers.filter((t) => t.id !== id) });
        fnf(supabase.from("teachers").delete().eq("id", id));
      },
      saveAttendance: (date, batchId, courseId, marks, remarks = {}, teacherId) => {
        const others = get().attendance.filter((a) => !(a.date === date && a.batchId === batchId));
        const newOnes: AttendanceRecord[] = Object.entries(marks).map(([studentId, status]) => ({
          id: genId("a"),
          studentId,
          batchId,
          courseId,
          teacherId,
          date,
          status,
          remarks: remarks[studentId] || "",
        }));
        set({ attendance: [...others, ...newOnes] });
        fnf(
          (async () => {
            await supabase.from("attendance").delete().eq("date", date).eq("batch_id", batchId);
            if (newOnes.length) {
              await supabase.from("attendance").insert(newOnes.map(attToRow));
            }
          })(),
        );
      },
      deleteAttendanceRecord: (id) => {
        set({ attendance: get().attendance.filter((a) => a.id !== id) });
        fnf(supabase.from("attendance").delete().eq("id", id));
      },
      updateAttendanceRecord: (id, patch) => {
        const next = get().attendance.map((a) => (a.id === id ? { ...a, ...patch } : a));
        set({ attendance: next });
        const row = next.find((a) => a.id === id);
        if (row) fnf(supabase.from("attendance").update(attToRow(row)).eq("id", id));
      },
      updateSettings: (patch) => {
        const settings = { ...get().settings, ...patch };
        set({ settings });
        fnf(supabase.from("app_settings").upsert({ id: "default", data: settings as any, updated_at: new Date().toISOString() }));
      },
      setTheme: (t) => set({ theme: t }),
      setAccent: (hex) => set({ accent: hex }),
      addCustomAccent: (hex) => {
        const list = get().customAccents;
        set({ customAccents: list.includes(hex) ? list : [...list, hex], accent: hex });
      },
      removeCustomAccent: (hex) =>
        set({ customAccents: get().customAccents.filter((c) => c !== hex) }),
      setSubjectSheetId: (key, spreadsheetId) => {
        set({ subjectSheetIds: { ...get().subjectSheetIds, [key]: spreadsheetId } });
        fnf(supabase.from("subject_sheets").upsert({ key, spreadsheet_id: spreadsheetId }));
      },
      addExam: (e) => {
        const exam: Exam = { ...e, id: genId("e") };
        set({ exams: [exam, ...get().exams] });
        fnf(supabase.from("exams").insert(examToRow(exam)));
        return exam.id;
      },
      updateExam: (id, patch) => {
        const next = get().exams.map((e) => (e.id === id ? { ...e, ...patch } : e));
        set({ exams: next });
        const row = next.find((e) => e.id === id);
        if (row) fnf(supabase.from("exams").update(examToRow(row)).eq("id", id));
      },
      deleteExam: (id) => {
        set({
          exams: get().exams.filter((e) => e.id !== id),
          examMarks: get().examMarks.filter((m) => m.examId !== id),
        });
        fnf(supabase.from("exam_marks").delete().eq("exam_id", id));
        fnf(supabase.from("exams").delete().eq("id", id));
      },
      saveExamMarks: (examId, marks) => {
        const exam = get().exams.find((e) => e.id === examId);
        if (!exam) return;
        const others = get().examMarks.filter((m) => m.examId !== examId);
        const rows: ExamMark[] = Object.entries(marks)
          .filter(([, v]) => v !== null && v !== undefined && !Number.isNaN(v))
          .map(([studentId, m]) => ({
            id: genId("em"),
            examId,
            studentId,
            marks: Number(m) || 0,
            grade: computeGrade(Number(m) || 0, exam.maxMarks),
          }));
        set({ examMarks: [...others, ...rows] });
        fnf(
          (async () => {
            await supabase.from("exam_marks").delete().eq("exam_id", examId);
            if (rows.length) await supabase.from("exam_marks").insert(rows.map(markToRow));
          })(),
        );
      },
      addPaymentPackage: (p) => {
        const pkg: PaymentPackage = { ...p, id: genId("pkg") };
        set({ paymentPackages: [pkg, ...get().paymentPackages] });
        fnf(supabase.from("payment_packages").insert(pkgToRow(pkg)));
      },
      updatePaymentPackage: (id, patch) => {
        const next = get().paymentPackages.map((p) => (p.id === id ? { ...p, ...patch } : p));
        set({ paymentPackages: next });
        const row = next.find((p) => p.id === id);
        if (row) fnf(supabase.from("payment_packages").update(pkgToRow(row)).eq("id", id));
      },
      deletePaymentPackage: (id) => {
        set({ paymentPackages: get().paymentPackages.filter((p) => p.id !== id) });
        fnf(supabase.from("payment_packages").delete().eq("id", id));
      },
      addStudentPayment: (p) => {
        const pay: StudentPayment = { ...p, id: genId("pay") };
        set({ studentPayments: [pay, ...get().studentPayments] });
        fnf(supabase.from("student_payments").insert(payToRow(pay)));
      },
      deleteStudentPayment: (id) => {
        set({ studentPayments: get().studentPayments.filter((p) => p.id !== id) });
        fnf(supabase.from("student_payments").delete().eq("id", id));
      },
      reset: async () => {
        // wipe cloud then re-seed
        await Promise.all([
          supabase.from("attendance").delete().neq("id", ""),
          supabase.from("exam_marks").delete().neq("id", ""),
          supabase.from("exams").delete().neq("id", ""),
          supabase.from("student_payments").delete().neq("id", ""),
          supabase.from("payment_packages").delete().neq("id", ""),
          supabase.from("students").delete().neq("id", ""),
          supabase.from("teachers").delete().neq("id", ""),
          supabase.from("batches").delete().neq("id", ""),
          supabase.from("courses").delete().neq("id", ""),
          supabase.from("subject_sheets").delete().neq("key", ""),
        ]);
        await seedCloudIfEmpty();
        set({ hydrated: false });
        await get().hydrate();
        get().updateSettings(defaultSettings);
      },
    }),
    {
      name: "edvora-ui-v1",
      // Only persist UI preferences locally; data lives in Lovable Cloud.
      partialize: (s) => ({ theme: s.theme, accent: s.accent, customAccents: s.customAccents }) as any,
    },
  ),
);

interface AuthState {
  isAuthed: boolean;
  username: string | null;
  rememberedUser: string | null;
  ready: boolean;
  init: () => void;
  login: (email: string, password: string, remember: boolean) => Promise<{ ok: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthed: false,
      username: null,
      rememberedUser: null,
      ready: false,
      init: () => {
        if (typeof window === "undefined") return;
        if ((get() as any).__initted) return;
        (set as any)({ __initted: true } as any);
        supabase.auth.getSession().then(({ data }) => {
          const u = data.session?.user;
          set({ isAuthed: !!u, username: u?.email ?? null, ready: true });
        });
        supabase.auth.onAuthStateChange((_event, session) => {
          const u = session?.user;
          set({ isAuthed: !!u, username: u?.email ?? null, ready: true });
        });
      },
      login: async (email, password, remember) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, error: error.message };
        set({
          isAuthed: true,
          username: data.user?.email ?? email,
          rememberedUser: remember ? email : null,
        });
        return { ok: true };
      },
      signup: async (email, password) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
      logout: async () => {
        await supabase.auth.signOut();
        set({ isAuthed: false, username: null });
      },
    }),
    {
      name: "edvora-auth-v1",
      partialize: (s) => ({ rememberedUser: s.rememberedUser }) as any,
    },
  ),
);
