export const APP_PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "students", label: "Students" },
  { id: "teachers", label: "Teachers" },
  { id: "batches", label: "Batches" },
  { id: "subjects", label: "Subjects" },
  { id: "attendance", label: "Mark Attendance" },
  { id: "history", label: "Attendance History" },
  { id: "exams", label: "Exam Marks" },
  { id: "payments", label: "Payments" },
  { id: "reports", label: "Reports" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
] as const;

export type PageId = (typeof APP_PAGES)[number]["id"];

export const ALL_PAGE_IDS: string[] = APP_PAGES.map((p) => p.id);

export interface AppRoleRow {
  id: string;
  name: string;
  pages: string[];
  is_admin: boolean;
}
