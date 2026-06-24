import type { AttendanceRecord, Student } from "./types";

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function attendanceForDate(records: AttendanceRecord[], date: string) {
  return records.filter((r) => r.date === date);
}

export function studentRate(records: AttendanceRecord[], studentId: string) {
  const mine = records.filter((r) => r.studentId === studentId);
  if (!mine.length) return 0;
  const present = mine.filter((r) => r.status === "Present").length;
  return Math.round((present / mine.length) * 100);
}

export function overallRate(records: AttendanceRecord[]) {
  if (!records.length) return 0;
  const present = records.filter((r) => r.status === "Present").length;
  return Math.round((present / records.length) * 100);
}

export function monthlySeries(records: AttendanceRecord[]) {
  const buckets = new Map<string, { present: number; absent: number; total: number }>();
  for (const r of records) {
    const key = r.date.slice(0, 10);
    const cur = buckets.get(key) ?? { present: 0, absent: 0, total: 0 };
    cur.total++;
    if (r.status === "Present") cur.present++;
    else if (r.status === "Absent") cur.absent++;
    buckets.set(key, cur);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, v]) => ({
      date,
      label: date.slice(5),
      rate: v.total ? Math.round((v.present / v.total) * 100) : 0,
      ...v,
    }));
}

export function topStudents(records: AttendanceRecord[], students: Student[], limit = 5) {
  return students
    .map((s) => ({ ...s, rate: studentRate(records, s.id) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit);
}

export function lowAttendance(records: AttendanceRecord[], students: Student[], threshold: number) {
  return students
    .map((s) => ({ ...s, rate: studentRate(records, s.id) }))
    .filter((s) => s.rate < threshold)
    .sort((a, b) => a.rate - b.rate);
}
