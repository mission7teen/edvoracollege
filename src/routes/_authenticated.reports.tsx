import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileBarChart, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useData } from "@/lib/store";
import { attendanceRowsForExport, exportCSV, exportExcel, exportPDF } from "@/lib/exporters";
import { todayStr } from "@/lib/metrics";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Reports · EDVORA COLLEGE" },
      { name: "description", content: "Generate attendance and academic reports for EDVORA COLLEGE." },
      { property: "og:title", content: "Reports · EDVORA COLLEGE" },
      { property: "og:description", content: "Generate attendance and academic reports for EDVORA COLLEGE." },
      { property: "og:url", content: "https://edvoracollege.lovable.app/reports" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://edvoracollege.lovable.app/reports" }],
  }) });

type ReportType = "daily" | "weekly" | "monthly" | "student" | "course" | "batch";

function ReportsPage() {
  const { attendance, students, batches, courses } = useData();
  const [type, setType] = useState<ReportType>("daily");
  const [date, setDate] = useState(todayStr());
  const [course, setCourse] = useState("all");
  const [batch, setBatch] = useState("all");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");

  const records = useMemo(() => {
    const today = new Date(date);
    return attendance.filter((r) => {
      const d = new Date(r.date);
      if (type === "daily" && r.date !== date) return false;
      if (type === "weekly") {
        const diff = (today.getTime() - d.getTime()) / 86400000;
        if (diff < 0 || diff > 7) return false;
      }
      if (type === "monthly") {
        if (r.date.slice(0, 7) !== date.slice(0, 7)) return false;
      }
      if (type === "student" && r.studentId !== studentId) return false;
      if (type === "course" && course !== "all" && r.courseId !== course) return false;
      if (type === "batch" && batch !== "all" && r.batchId !== batch) return false;
      return true;
    });
  }, [attendance, type, date, course, batch, studentId]);

  const rows = useMemo(
    () => attendanceRowsForExport(records, students, batches, courses),
    [records, students, batches, courses],
  );
  const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Attendance Report`;

  const summary = useMemo(() => {
    const c = { Present: 0, Absent: 0 };
    for (const r of records) {
      if (r.status === "Present" || r.status === "Absent") {
        c[r.status]++;
      }
    }
    const rate = records.length ? Math.round((c.Present / records.length) * 100) : 0;
    return { ...c, total: records.length, rate };
  }, [records]);

  return (
    <AppShell title="Reports" subtitle="Generate and export attendance reports">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 lg:col-span-1 space-y-4"
        >
          <div>
            <div className="text-xs text-muted-foreground mb-1">Report type</div>
            <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly (last 7 days)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="student">By student</SelectItem>
                <SelectItem value="course">By course</SelectItem>
                <SelectItem value="batch">By batch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(type === "daily" || type === "weekly" || type === "monthly") && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Date</div>
              <Input
                type={type === "monthly" ? "month" : "date"}
                value={type === "monthly" ? date.slice(0, 7) : date}
                onChange={(e) =>
                  setDate(type === "monthly" ? `${e.target.value}-01` : e.target.value)
                }
              />
            </div>
          )}
          {type === "student" && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Student</div>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName} ({s.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "course" && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Course</div>
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "batch" && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Batch</div>
              <Select value={batch} onValueChange={setBatch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="pt-4 border-t border-border space-y-2">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => exportCSV(`${title}.csv`, rows)}
            >
              <FileText size={15} /> Export CSV
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => exportExcel(`${title}`, rows)}
            >
              <FileSpreadsheet size={15} /> Export Excel
            </Button>
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={() =>
                exportPDF(
                  title,
                  Object.keys(rows[0] ?? { Date: "" }),
                  rows.map((r) => Object.values(r).map(String)),
                )
              }
            >
              <FileType size={15} /> Export PDF
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold tracking-tight flex items-center gap-2">
                <FileBarChart size={16} /> {title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {records.length} records · {summary.rate}% present
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { k: "Total", v: summary.total },
              { k: "Present", v: summary.Present },
              { k: "Absent", v: summary.Absent },
              { k: "Rate", v: `${summary.rate}%` },
            ].map((it) => (
              <div key={it.k} className="rounded-xl border border-border bg-card p-3 text-center">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {it.k}
                </div>
                <div className="text-xl font-bold">{it.v}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2 hidden md:table-cell">Batch</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{r.Date}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.Name}</div>
                      <div className="text-xs text-muted-foreground">{r.StudentID}</div>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">{r.Batch}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.Status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
