export type Gender = "Male" | "Female" | "Other";
export type StudentStatus = "Active" | "Inactive";
export type AttendanceStatus = "Present" | "Absent";

export interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  duration: string;
  startDate: string;
  endDate: string;
  group?: string; // category or group of subjects
}

export interface Batch {
  id: string;
  name: string;
  code: string;
  courseId: string;
  academicYear: string;
  schedule: string;
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  photoUrl?: string;
  gender: Gender;
  dob: string;
  nic: string;
  phone: string;
  email: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  courseId: string;
  batchId: string;
  registrationDate: string;
  status: StudentStatus;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  batchId: string;
  courseId: string;
  teacherId?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  remarks?: string;
}

export interface CollegeSettings {
  name: string;
  tagline: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  academicYear: string;
  attendanceThreshold: number;
}

export interface Teacher {
  id: string;
  fullName: string;
  photoUrl?: string;
  email: string;
  phone: string;
  qualification: string;
  subjectId: string; // references Course.id (subject)
  subjectIds?: string[]; // list of Course.id references
  joinedDate: string;
  status: "Active" | "Inactive";
}

export type ExamType = "Monthly" | "Term" | "Final";

export interface Exam {
  id: string;
  name: string;
  type: ExamType;
  subjectId: string; // Course.id
  batchId: string;
  date: string; // YYYY-MM-DD
  maxMarks: number;
}

export interface ExamMark {
  id: string;
  examId: string;
  studentId: string; // Student.id
  marks: number;
  grade: string;
}

export interface PaymentPackage {
  id: string;
  name: string;
  amount: number;
  description: string;
}

export interface StudentPayment {
  id: string;
  studentId: string; // Student.id
  packageId?: string;
  month: string; // YYYY-MM
  amount: number;
  paidOn: string; // YYYY-MM-DD
}
