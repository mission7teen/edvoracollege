import type { Student, Course, Batch, AttendanceRecord, AttendanceStatus, Teacher } from "./types";

// Subjects offered — A/L Commerce stream (taught in English medium)
export const seedCourses: Course[] = [
  {
    id: "c1",
    name: "Business Studies",
    code: "BST",
    description: "G.C.E. A/L Business Studies — English medium.",
    duration: "2 Years (A/L)",
    startDate: "2025-01-15",
    endDate: "2026-12-15",
    group: "Commerce Stream",
  },
  {
    id: "c2",
    name: "Accounting",
    code: "ACC",
    description: "G.C.E. A/L Accounting — English medium.",
    duration: "2 Years (A/L)",
    startDate: "2025-01-15",
    endDate: "2026-12-15",
    group: "Commerce Stream",
  },
  {
    id: "c3",
    name: "Economics",
    code: "ECO",
    description: "G.C.E. A/L Economics — English medium.",
    duration: "2 Years (A/L)",
    startDate: "2025-01-15",
    endDate: "2026-12-15",
    group: "Commerce Stream",
  },
  {
    id: "c4",
    name: "General English",
    code: "ENG",
    description: "General English for A/L commerce students.",
    duration: "2 Years (A/L)",
    startDate: "2025-01-15",
    endDate: "2026-12-15",
    group: "Languages",
  },
];

export const seedBatches: Batch[] = [
  {
    id: "b1",
    name: "A/L Commerce 2026",
    code: "ALC-26",
    courseId: "c1",
    academicYear: "2025/2026",
    schedule: "Sat 8:00 AM - 11:00 AM",
  },
  {
    id: "b2",
    name: "A/L Commerce 2027",
    code: "ALC-27",
    courseId: "c1",
    academicYear: "2025/2026",
    schedule: "Sun 8:00 AM - 11:00 AM",
  },
  {
    id: "b3",
    name: "Accounting Theory 2026",
    code: "ACC-26",
    courseId: "c2",
    academicYear: "2025/2026",
    schedule: "Sat 12:00 PM - 3:00 PM",
  },
  {
    id: "b4",
    name: "Economics 2026",
    code: "ECO-26",
    courseId: "c3",
    academicYear: "2025/2026",
    schedule: "Sun 12:00 PM - 3:00 PM",
  },
  {
    id: "b5",
    name: "English Medium 2026",
    code: "ENG-26",
    courseId: "c4",
    academicYear: "2025/2026",
    schedule: "Fri 4:00 PM - 6:00 PM",
  },
];

export const seedTeachers: Teacher[] = [
  {
    id: "t1",
    fullName: "Mr. Nuwan Perera",
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nuwan",
    email: "nuwan@edvoracollege.com",
    phone: "0771234561",
    qualification: "B.Com (Hons), University of Colombo",
    subjectId: "c1",
    subjectIds: ["c1", "c4"],
    joinedDate: "2022-01-10",
    status: "Active",
  },
  {
    id: "t2",
    fullName: "Mrs. Sanduni Fernando",
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sanduni",
    email: "sanduni@edvoracollege.com",
    phone: "0771234562",
    qualification: "CA (SL), B.Sc Accounting",
    subjectId: "c2",
    subjectIds: ["c2"],
    joinedDate: "2021-08-15",
    status: "Active",
  },
  {
    id: "t3",
    fullName: "Mr. Kasun Wickramasinghe",
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kasun",
    email: "kasun@edvoracollege.com",
    phone: "0771234563",
    qualification: "M.A. Economics, University of Peradeniya",
    subjectId: "c3",
    subjectIds: ["c3"],
    joinedDate: "2023-03-01",
    status: "Active",
  },
  {
    id: "t4",
    fullName: "Ms. Hiruni Bandara",
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hiruni",
    email: "hiruni@edvoracollege.com",
    phone: "0771234564",
    qualification: "B.A. English (Hons), TESL Diploma",
    subjectId: "c4",
    subjectIds: ["c4", "c1"],
    joinedDate: "2024-01-12",
    status: "Active",
  },
];

const firstNames = [
  "Aisha",
  "Mohammed",
  "Sanduni",
  "Kavindu",
  "Nimal",
  "Tharushi",
  "Hiruni",
  "Dilshan",
  "Ravindu",
  "Pasindu",
  "Sahan",
  "Nadeesha",
  "Amaya",
  "Tharindu",
  "Janith",
  "Imeshi",
  "Senuri",
  "Kasun",
  "Dinithi",
  "Buddhika",
  "Nuwan",
  "Ishara",
  "Chamod",
  "Yasiru",
  "Oneli",
  "Sithum",
  "Lakshan",
  "Methma",
  "Yenuli",
  "Rashmika",
];
const lastNames = [
  "Perera",
  "Silva",
  "Fernando",
  "Jayawardena",
  "Wickramasinghe",
  "Bandara",
  "Rathnayake",
  "Karunaratne",
  "Senanayake",
  "Gunawardena",
  "Dias",
  "Mendis",
  "Liyanage",
  "Weerasinghe",
  "Abeysekara",
];

const photoSeeds = ["avataaars", "lorelei", "personas", "notionists", "thumbs"];

function randPhoto(seed: string, idx: number) {
  const style = photoSeeds[idx % photoSeeds.length];
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

function pad(n: number, w = 4) {
  return n.toString().padStart(w, "0");
}

function randomDate(start: Date, end: Date) {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t).toISOString().slice(0, 10);
}

export function generateStudents(): Student[] {
  const out: Student[] = [];
  let counter = 1;
  for (const batch of seedBatches) {
    const count = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const fn = firstNames[(counter * 7) % firstNames.length];
      const ln = lastNames[(counter * 3) % lastNames.length];
      const full = `${fn} ${ln}`;
      out.push({
        id: `s${counter}`,
        studentId: `EDV-${pad(counter)}`,
        fullName: full,
        photoUrl: randPhoto(full + counter, counter),
        gender: counter % 2 === 0 ? "Female" : "Male",
        dob: randomDate(new Date(2000, 0, 1), new Date(2006, 11, 31)),
        nic: `${200000000 + counter * 137}V`,
        phone: `07${counter % 10}${pad(1000000 + counter * 91, 7)}`.slice(0, 10),
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${counter}@edvora.lk`,
        address: `${counter} Galle Road, Colombo`,
        guardianName: `${lastNames[(counter * 5) % lastNames.length]} ${ln}`,
        guardianPhone: `077${pad(1000000 + counter * 53, 7)}`.slice(0, 10),
        courseId: batch.courseId,
        batchId: batch.id,
        registrationDate: randomDate(new Date(2024, 0, 1), new Date(2025, 8, 1)),
        status: counter % 17 === 0 ? "Inactive" : "Active",
      });
      counter++;
    }
  }
  return out;
}

export function generateAttendance(students: Student[]): AttendanceRecord[] {
  const out: AttendanceRecord[] = [];
  const today = new Date();
  const statuses: AttendanceStatus[] = [
    "Present",
    "Present",
    "Present",
    "Present",
    "Present",
    "Present",
    "Present",
    "Present",
    "Absent",
    "Absent",
  ];
  let id = 1;
  for (let d = 29; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const day = date.getDay();
    if (day === 0) continue; // skip Sundays
    const dateStr = date.toISOString().slice(0, 10);
    for (const s of students) {
      if (s.status === "Inactive") continue;
      const status = statuses[(id + d) % statuses.length];
      out.push({
        id: `a${id++}`,
        studentId: s.id,
        batchId: s.batchId,
        courseId: s.courseId,
        date: dateStr,
        status,
        remarks: "",
      });
    }
  }
  return out;
}
