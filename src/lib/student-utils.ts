import type { Student } from "./types";

/** Sort students by Student ID (natural numeric order). */
export function sortStudentsById(students: Student[]): Student[] {
  return [...students].sort((a, b) =>
    a.studentId.localeCompare(b.studentId, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export interface GenderGroup {
  key: "Male" | "Female" | "Other";
  label: string;
  students: Student[];
}

/**
 * Split students into gender groups: Male first, Female second, Other last.
 * Each group is sorted by Student ID. Empty groups are omitted.
 */
export function groupStudentsByGender(students: Student[]): GenderGroup[] {
  const buckets: Record<"Male" | "Female" | "Other", Student[]> = {
    Male: [],
    Female: [],
    Other: [],
  };
  for (const s of students) {
    const key: "Male" | "Female" | "Other" =
      s.gender === "Male" || s.gender === "Female" ? s.gender : "Other";
    buckets[key].push(s);
  }
  return (["Male", "Female", "Other"] as const)
    .map((key) => ({
      key,
      label: `${key} Students`,
      students: sortStudentsById(buckets[key]),
    }))
    .filter((g) => g.students.length > 0);
}
