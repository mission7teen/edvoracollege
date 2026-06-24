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

interface DataState {
  students: Student[];
  courses: Course[];
  batches: Batch[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  settings: CollegeSettings;
  theme: "light" | "dark";
  subjectSheetIds: Record<string, string>; // key (e.g. courseId_batchId_YYYY-MM) -> spreadsheetId
  // students
  addStudent: (
    s: Omit<Student, "id" | "studentId" | "registrationDate"> & { studentId?: string },
  ) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  // courses
  addCourse: (c: Omit<Course, "id">) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  // batches
  addBatch: (b: Omit<Batch, "id">) => void;
  updateBatch: (id: string, patch: Partial<Batch>) => void;
  deleteBatch: (id: string) => void;
  // teachers
  addTeacher: (t: Omit<Teacher, "id">) => void;
  updateTeacher: (id: string, patch: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  // attendance
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
  // settings / theme
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

function freshSeed() {
  const students = generateStudents();
  const attendance = generateAttendance(students);
  return {
    students,
    attendance,
    courses: seedCourses,
    batches: seedBatches,
    teachers: seedTeachers,
  };
}

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...freshSeed(),
      settings: defaultSettings,
      theme: "light",
      subjectSheetIds: {},
      addStudent: (s) => {
        const student: Student = {
          ...s,
          id: genId("s"),
          studentId: s.studentId || nextStudentId(get().students),
          registrationDate: new Date().toISOString().slice(0, 10),
        };
        set({ students: [student, ...get().students] });
      },
      updateStudent: (id, patch) =>
        set({ students: get().students.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
      deleteStudent: (id) =>
        set({
          students: get().students.filter((s) => s.id !== id),
          attendance: get().attendance.filter((a) => a.studentId !== id),
        }),
      addCourse: (c) => set({ courses: [{ ...c, id: genId("c") }, ...get().courses] }),
      updateCourse: (id, patch) =>
        set({ courses: get().courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),
      deleteCourse: (id) => set({ courses: get().courses.filter((c) => c.id !== id) }),
      addBatch: (b) => set({ batches: [{ ...b, id: genId("b") }, ...get().batches] }),
      updateBatch: (id, patch) =>
        set({ batches: get().batches.map((b) => (b.id === id ? { ...b, ...patch } : b)) }),
      deleteBatch: (id) => set({ batches: get().batches.filter((b) => b.id !== id) }),
      addTeacher: (t) => set({ teachers: [{ ...t, id: genId("t") }, ...get().teachers] }),
      updateTeacher: (id, patch) =>
        set({ teachers: get().teachers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
      deleteTeacher: (id) => set({ teachers: get().teachers.filter((t) => t.id !== id) }),
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
      },
      deleteAttendanceRecord: (id) =>
        set({ attendance: get().attendance.filter((a) => a.id !== id) }),
      updateAttendanceRecord: (id, patch) =>
        set({ attendance: get().attendance.map((a) => (a.id === id ? { ...a, ...patch } : a)) }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setTheme: (t) => set({ theme: t }),
      setSubjectSheetId: (key, spreadsheetId) =>
        set({ subjectSheetIds: { ...get().subjectSheetIds, [key]: spreadsheetId } }),
      reset: () => set({ ...freshSeed(), settings: defaultSettings }),
    }),
    { name: "edvora-data-v2" },
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
