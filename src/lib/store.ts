import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Student,
  Course,
  Batch,
  AttendanceRecord,
  CollegeSettings,
  AttendanceStatus,
  Teacher,
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
  subjectSheetIds: Record<string, string>;
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
  setSubjectSheetId: (key: string, spreadsheetId: string) => void;
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

// Fire-and-forget helpers (log on failure but don't throw)
const fnf = (p: PromiseLike<any>) => {
  Promise.resolve(p)
    .then((r) => { if (r?.error) console.error("[supabase]", r.error); })
    .catch((e) => console.error("[supabase]", e));
};

async function fetchAll() {
  const [c, b, t, s, a, set, sh] = await Promise.all([
    supabase.from("courses").select("*"),
    supabase.from("batches").select("*"),
    supabase.from("teachers").select("*"),
    supabase.from("students").select("*"),
    supabase.from("attendance").select("*"),
    supabase.from("app_settings").select("*").eq("id", "default").maybeSingle(),
    supabase.from("subject_sheets").select("*"),
  ]);
  return { c, b, t, s, a, set, sh };
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
      subjectSheetIds: {},
      hydrated: false,
      hydrate: async () => {
        if (get().hydrated) return;
        try {
          let { c, b, t, s, a, set: settingsRow, sh } = await fetchAll();
          const isEmpty =
            !c.error && !b.error && !s.error &&
            (c.data?.length ?? 0) === 0 &&
            (b.data?.length ?? 0) === 0 &&
            (s.data?.length ?? 0) === 0;
          if (isEmpty) {
            await seedCloudIfEmpty();
            ({ c, b, t, s, a, set: settingsRow, sh } = await fetchAll());
          }
          const settings = settingsRow?.data?.data
            ? { ...defaultSettings, ...(settingsRow.data.data as any) }
            : defaultSettings;
          if (!settingsRow?.data) {
            fnf(supabase.from("app_settings").upsert({ id: "default", data: settings as any }));
          }
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
      setSubjectSheetId: (key, spreadsheetId) => {
        set({ subjectSheetIds: { ...get().subjectSheetIds, [key]: spreadsheetId } });
        fnf(supabase.from("subject_sheets").upsert({ key, spreadsheet_id: spreadsheetId }));
      },
      reset: async () => {
        // wipe cloud then re-seed
        await Promise.all([
          supabase.from("attendance").delete().neq("id", ""),
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
      partialize: (s) => ({ theme: s.theme }) as any,
    },
  ),
);

interface AuthState {
  isAuthed: boolean;
  username: string | null;
  rememberedUser: string | null;
  login: (u: string, p: string, remember: boolean) => { ok: boolean; error?: string };
  logout: () => void;
}

const ADMIN_USER = "Edvora";
const ADMIN_PASS = "Edvora@1234";

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      isAuthed: false,
      username: null,
      rememberedUser: null,
      login: (u, p, remember) => {
        if (u === ADMIN_USER && p === ADMIN_PASS) {
          set({ isAuthed: true, username: u, rememberedUser: remember ? u : null });
          return { ok: true };
        }
        return { ok: false, error: "Invalid username or password" };
      },
      logout: () => set({ isAuthed: false, username: null }),
    }),
    { name: "edvora-auth-v1" },
  ),
);
