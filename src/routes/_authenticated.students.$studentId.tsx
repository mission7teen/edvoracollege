import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Printer,
  Download,
  Pencil,
  UserCheck,
  UserX,
  Percent,
  BookOpen,
  Wallet,
  AlertCircle,
  CalendarClock,
  TrendingUp,
  FileText,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  User,
  GraduationCap,
  Users as UsersIcon,
  ClipboardList,
  ReceiptText,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData, computeGrade } from "@/lib/store";
import { studentRate } from "@/lib/metrics";
import { exportCSV, exportExcel, exportPDF } from "@/lib/exporters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  component: StudentPortfolioPage,
  head: ({ params }) => ({
    meta: [
      { title: `Student ${params.studentId} · EDVORA COLLEGE` },
      { name: "description", content: "Student portfolio with attendance, exam and payment insights." },
    ],
  }),
});

function StudentPortfolioPage() {
  const { studentId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const {
    students,
    courses,
    batches,
    attendance,
    exams,
    examMarks,
    paymentPackages,
    studentPayments,
    teachers,
  } = useData();

  // Accept either the DB id or the human student code.
  const student = useMemo(
    () =>
      students.find((s) => s.id === studentId) ||
      students.find((s) => s.studentId === studentId),
    [students, studentId],
  );

  if (!student) {
    return (
      <AppShell title="Student portfolio" subtitle="Not found">
        <EmptyState
          icon={UserX}
          title="Student not found"
          description="This student may have been removed or the link is incorrect."
          action={
            <Button variant="outline" onClick={() => navigate({ to: "/students" })}>
              <ArrowLeft size={14} /> Back to students
            </Button>
          }
        />
      </AppShell>
    );
  }

  const course = courses.find((c) => c.id === student.courseId);
  const batch = batches.find((b) => b.id === student.batchId);
  const rate = studentRate(attendance, student.id);
  const my = attendance.filter((a) => a.studentId === student.id);
  const presentDays = my.filter((r) => r.status === "Present").length;
  const absentDays = my.filter((r) => r.status === "Absent").length;

  const myMarks = examMarks.filter((m) => m.studentId === student.id);
  const examsCompleted = myMarks.length;
  const avgPct = useMemo(() => {
    if (!myMarks.length) return 0;
    const list = myMarks
      .map((m) => {
        const ex = exams.find((e) => e.id === m.examId);
        return ex ? (m.marks / ex.maxMarks) * 100 : null;
      })
      .filter((v): v is number => v !== null);
    if (!list.length) return 0;
    return Math.round(list.reduce((a, b) => a + b, 0) / list.length);
  }, [myMarks, exams]);

  const myPayments = studentPayments.filter((p) => p.studentId === student.id);
  const totalPaid = myPayments.reduce((a, p) => a + p.amount, 0);
  const monthlyFee =
    paymentPackages.find((p) => /month/i.test(p.name))?.amount ??
    paymentPackages[0]?.amount ??
    0;
  const monthsEnrolled = monthsBetween(student.registrationDate, new Date().toISOString().slice(0, 10));
  const expected = monthlyFee * Math.max(monthsEnrolled, 1);
  const outstanding = Math.max(0, expected - totalPaid);
  const lastPayment = [...myPayments].sort((a, b) => b.paidOn.localeCompare(a.paidOn))[0];
  const nextDueDate = computeNextDue(lastPayment?.paidOn || student.registrationDate);
  const paymentStatus: "Paid" | "Due" = outstanding <= 0 ? "Paid" : "Due";

  const attendanceThreshold = 75;
  const attendanceAccent: "success" | "warning" | "destructive" =
    rate >= 85 ? "success" : rate >= attendanceThreshold ? "warning" : "destructive";

  function printReport() {
    const rows = my
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => {
        const c = courses.find((x) => x.id === r.courseId)?.name || "—";
        return [r.date, c, r.status, r.remarks || ""];
      });
    exportPDF(`${student.fullName} — Student Report`, ["Date", "Subject", "Status", "Remarks"], rows);
  }

  function downloadCsv() {
    exportCSV(`${student.studentId}-attendance.csv`, my.map((r) => ({
      Date: r.date,
      Subject: courses.find((c) => c.id === r.courseId)?.name || "",
      Status: r.status,
      Remarks: r.remarks || "",
    })));
  }

  return (
    <AppShell
      title={student.fullName}
      subtitle={`${student.studentId} · ${batch?.name ?? "No batch"}`}
    >
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl glass-card p-5 sm:p-6"
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-success/10 blur-3xl" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 md:flex md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={student.photoUrl}
                alt=""
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-primary/30 bg-secondary shadow-lg"
              />
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-2 ring-background",
                  student.status === "Active" ? "bg-success" : "bg-muted-foreground",
                )}
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl sm:text-2xl font-bold tracking-tight">
                {student.fullName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
                <span>{student.studentId}</span>
                <span>·</span>
                <span>{course?.name ?? "—"}</span>
                <span>·</span>
                <span>{batch?.name ?? "—"}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={student.status} />
                <Badge
                  variant="outline"
                  className={cn(
                    "border-transparent",
                    attendanceAccent === "success" && "bg-success/15 text-success",
                    attendanceAccent === "warning" && "bg-warning/20 text-warning",
                    attendanceAccent === "destructive" && "bg-destructive/15 text-destructive",
                  )}
                >
                  <Percent className="mr-1 h-3 w-3" /> {rate}% attendance
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-transparent",
                    paymentStatus === "Paid"
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive",
                  )}
                >
                  <Wallet className="mr-1 h-3 w-3" /> {paymentStatus}
                </Badge>
                {student.gender && (
                  <Badge variant="secondary" className="text-[10px]">
                    {student.gender}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-2 md:col-auto flex flex-wrap gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
              <ArrowLeft size={14} /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCsv}>
              <Download size={14} /> Report
            </Button>
            <Button variant="outline" size="sm" onClick={printReport}>
              <Printer size={14} /> Print
            </Button>
            <Button asChild size="sm" className="gradient-primary text-primary-foreground">
              <Link to="/students" search={{}}>
                <Pencil size={14} /> Edit
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* SUMMARY */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard label="Attendance %" value={`${rate}%`} icon={Percent} accent={attendanceAccent === "destructive" ? "destructive" : attendanceAccent === "warning" ? "warning" : "success"} delay={0.02} />
        <StatCard label="Present" value={presentDays} icon={UserCheck} accent="success" delay={0.05} />
        <StatCard label="Absent" value={absentDays} icon={UserX} accent="destructive" delay={0.08} />
        <StatCard label="Exams" value={examsCompleted} icon={BookOpen} accent="primary" delay={0.11} />
        <StatCard label="Avg Marks" value={`${avgPct}%`} icon={TrendingUp} accent="primary" delay={0.14} />
        <StatCard label="Total Paid" value={`Rs ${totalPaid.toLocaleString()}`} icon={Wallet} accent="success" delay={0.17} />
        <StatCard label="Outstanding" value={`Rs ${outstanding.toLocaleString()}`} icon={AlertCircle} accent={outstanding > 0 ? "destructive" : "success"} delay={0.2} />
        <StatCard label="Next Due" value={nextDueDate} icon={CalendarClock} accent="warning" delay={0.23} />
      </div>

      {/* TABS */}
      <div className="mt-6">
        <Tabs defaultValue="overview">
          <div className="overflow-x-auto -mx-1 pb-1">
            <TabsList className="h-auto flex-wrap gap-1 bg-secondary/60 p-1">
              {[
                ["overview", "Overview"],
                ["attendance", "Attendance"],
                ["exams", "Exam Results"],
                ["payments", "Payments"],
                ["analytics", "Analytics"],
                ["timeline", "Timeline"],
              ].map(([v, l]) => (
                <TabsTrigger key={v} value={v} className="text-xs sm:text-sm">
                  {l}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ---------- OVERVIEW ---------- */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <InfoCard title="Student Information" icon={User}>
                <Row label="Full name" value={student.fullName} />
                <Row label="Student ID" value={student.studentId} mono />
                <Row label="Gender" value={student.gender} />
                <Row label="Date of birth" value={student.dob || "—"} />
                <Row label="NIC / Passport" value={student.nic || "—"} />
                <Row label="Registered" value={student.registrationDate || "—"} />
              </InfoCard>

              <InfoCard title="Contact" icon={Phone}>
                <Row label="Phone" value={student.phone || "—"} icon={Phone} />
                <Row label="Email" value={student.email || "—"} icon={Mail} />
                <Row label="Address" value={student.address || "—"} icon={MapPin} />
              </InfoCard>

              <InfoCard title="Guardian" icon={UsersIcon}>
                <Row label="Guardian" value={student.guardianName || "—"} />
                <Row label="Guardian Phone" value={student.guardianPhone || "—"} icon={Phone} />
              </InfoCard>

              <InfoCard title="Academic" icon={GraduationCap}>
                <Row label="Course" value={course?.name || "—"} />
                <Row label="Stream / Group" value={course?.group || "—"} />
                <Row label="Batch" value={batch?.name || "—"} />
                <Row label="Academic Year" value={batch?.academicYear || "—"} />
                <Row label="Schedule" value={batch?.schedule || "—"} />
              </InfoCard>

              <InfoCard title="Quick Stats" icon={Sparkles}>
                <Row label="Attendance" value={`${rate}%`} />
                <Row label="Avg marks" value={`${avgPct}%`} />
                <Row label="Exams sat" value={String(examsCompleted)} />
                <Row label="Payments" value={`Rs ${totalPaid.toLocaleString()}`} />
              </InfoCard>

              <InfoCard title="Recent Activity" icon={ClipboardList}>
                {recentActivity(my, myPayments, myMarks, exams, courses).slice(0, 6).map((it, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 text-xs">
                    <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", it.dotClass)} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.title}</div>
                      <div className="text-muted-foreground">{it.date}</div>
                    </div>
                  </div>
                ))}
                {my.length + myPayments.length + myMarks.length === 0 && (
                  <div className="text-xs text-muted-foreground">No recent activity yet.</div>
                )}
              </InfoCard>
            </div>

            {teachers.length > 0 && (
              <InfoCard title="Teacher Notes" icon={FileText}>
                <div className="text-xs text-muted-foreground italic">
                  {rate >= 85
                    ? "Consistently punctual and engaged in class."
                    : rate >= 75
                    ? "Attendance is acceptable — encourage more consistency."
                    : "Low attendance — a parent conversation is recommended."}
                </div>
              </InfoCard>
            )}
          </TabsContent>

          {/* ---------- ATTENDANCE ---------- */}
          <TabsContent value="attendance" className="mt-4 space-y-4">
            <AttendanceTab
              records={my}
              courses={courses}
            />
          </TabsContent>

          {/* ---------- EXAMS ---------- */}
          <TabsContent value="exams" className="mt-4 space-y-4">
            <ExamsTab
              marks={myMarks}
              exams={exams}
              courses={courses}
              batchMarks={examMarks}
            />
          </TabsContent>

          {/* ---------- PAYMENTS ---------- */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            <PaymentsTab
              payments={myPayments}
              packages={paymentPackages}
              totalPaid={totalPaid}
              outstanding={outstanding}
              monthlyFee={monthlyFee}
              lastPayment={lastPayment}
              nextDueDate={nextDueDate}
              studentName={student.fullName}
            />
          </TabsContent>

          {/* ---------- ANALYTICS ---------- */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <AnalyticsTab
              attendance={my}
              marks={myMarks}
              exams={exams}
              courses={courses}
              rate={rate}
              avgPct={avgPct}
            />
          </TabsContent>

          {/* ---------- TIMELINE ---------- */}
          <TabsContent value="timeline" className="mt-4">
            <TimelineTab
              items={recentActivity(my, myPayments, myMarks, exams, courses)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ================= Sub-components ================= */

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="grid place-items-center w-8 h-8 rounded-lg bg-primary/15 text-primary">
          <Icon size={15} />
        </div>
        <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">
        {label}
      </span>
      <span
        className={cn(
          "text-xs sm:text-sm font-medium text-right break-words min-w-0 flex items-center gap-1.5",
          mono && "font-mono",
        )}
      >
        {Icon && <Icon size={12} className="text-muted-foreground" />}
        {value}
      </span>
    </div>
  );
}

/* ---------- Attendance tab ---------- */
function AttendanceTab({
  records,
  courses,
}: {
  records: import("@/lib/types").AttendanceRecord[];
  courses: import("@/lib/types").Course[];
}) {
  const [subject, setSubject] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");

  const months = useMemo(() => {
    const set = new Set(records.map((r) => r.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [records]);

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (subject !== "all" && r.courseId !== subject) return false;
        if (month !== "all" && !r.date.startsWith(month)) return false;
        return true;
      }),
    [records, subject, month],
  );

  const monthly = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    for (const r of filtered) {
      const k = r.date.slice(0, 7);
      const cur = map.get(k) ?? { present: 0, total: 0 };
      cur.total++;
      if (r.status === "Present") cur.present++;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({
        label: k,
        rate: v.total ? Math.round((v.present / v.total) * 100) : 0,
      }));
  }, [filtered]);

  const bySubject = useMemo(() => {
    const map = new Map<string, { present: number; absent: number }>();
    for (const r of filtered) {
      const cur = map.get(r.courseId) ?? { present: 0, absent: 0 };
      if (r.status === "Present") cur.present++;
      else cur.absent++;
      map.set(r.courseId, cur);
    }
    return Array.from(map.entries()).map(([id, v]) => {
      const total = v.present + v.absent;
      return {
        subject: courses.find((c) => c.id === id)?.name || "—",
        present: v.present,
        absent: v.absent,
        pct: total ? Math.round((v.present / total) * 100) : 0,
      };
    });
  }, [filtered, courses]);

  return (
    <>
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-2">Monthly attendance</h3>
          {monthly.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Area type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={2.5} fill="url(#attGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyBlock>No attendance data yet.</EmptyBlock>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-2">Subject-wise</h3>
          {bySubject.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bySubject}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name="Present" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyBlock>No subject data yet.</EmptyBlock>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">Subject summary</h3>
        </div>
        {bySubject.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySubject.map((r) => (
                <TableRow key={r.subject}>
                  <TableCell className="font-medium">{r.subject}</TableCell>
                  <TableCell className="text-success font-semibold">{r.present}</TableCell>
                  <TableCell className="text-destructive font-semibold">{r.absent}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold",
                        r.pct >= 85 && "bg-success/15 text-success",
                        r.pct >= 75 && r.pct < 85 && "bg-warning/20 text-warning",
                        r.pct < 75 && "bg-destructive/15 text-destructive",
                      )}
                    >
                      {r.pct}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8">
            <EmptyBlock>No records for the current filter.</EmptyBlock>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Exams tab ---------- */
function ExamsTab({
  marks,
  exams,
  courses,
  batchMarks,
}: {
  marks: import("@/lib/types").ExamMark[];
  exams: import("@/lib/types").Exam[];
  courses: import("@/lib/types").Course[];
  batchMarks: import("@/lib/types").ExamMark[];
}) {
  const rows = useMemo(
    () =>
      marks
        .map((m) => {
          const ex = exams.find((e) => e.id === m.examId);
          if (!ex) return null;
          const peers = batchMarks.filter((x) => x.examId === m.examId);
          const sorted = [...peers].sort((a, b) => b.marks - a.marks);
          const rank = sorted.findIndex((x) => x.studentId === m.studentId) + 1;
          const avg =
            peers.length ? Math.round(peers.reduce((a, b) => a + b.marks, 0) / peers.length) : 0;
          return {
            id: m.id,
            examName: ex.name,
            examType: ex.type,
            date: ex.date,
            subject: courses.find((c) => c.id === ex.subjectId)?.name || "—",
            marks: m.marks,
            max: ex.maxMarks,
            pct: Math.round((m.marks / ex.maxMarks) * 100),
            grade: m.grade || computeGrade(m.marks, ex.maxMarks),
            rank,
            total: peers.length,
            avg,
            high: peers.length ? Math.max(...peers.map((p) => p.marks)) : m.marks,
            low: peers.length ? Math.min(...peers.map((p) => p.marks)) : m.marks,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null)
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [marks, exams, batchMarks, courses],
  );

  if (!rows.length) {
    return <EmptyBlock>No exam marks recorded yet.</EmptyBlock>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.examType} · {r.date}
                </div>
                <div className="font-semibold truncate">{r.examName}</div>
                <div className="text-xs text-muted-foreground truncate">{r.subject}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold">
                  {r.marks}
                  <span className="text-xs text-muted-foreground">/{r.max}</span>
                </div>
                <Badge variant="secondary">{r.grade}</Badge>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <MiniStat label="Rank" value={`${r.rank}/${r.total}`} />
              <MiniStat label="Avg" value={String(r.avg)} />
              <MiniStat label="High" value={String(r.high)} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-2">Marks trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={[...rows].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="examName" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
              <Line type="monotone" dataKey="pct" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-2">Vs class average</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="examName" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="marks" name="You" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avg" name="Class avg" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

/* ---------- Payments tab ---------- */
function PaymentsTab({
  payments,
  packages,
  totalPaid,
  outstanding,
  monthlyFee,
  lastPayment,
  nextDueDate,
  studentName,
}: {
  payments: import("@/lib/types").StudentPayment[];
  packages: import("@/lib/types").PaymentPackage[];
  totalPaid: number;
  outstanding: number;
  monthlyFee: number;
  lastPayment?: import("@/lib/types").StudentPayment;
  nextDueDate: string;
  studentName: string;
}) {
  const pkgMap = new Map(packages.map((p) => [p.id, p]));
  const sorted = [...payments].sort((a, b) => b.paidOn.localeCompare(a.paidOn));

  function printReceipt(p: import("@/lib/types").StudentPayment) {
    const pkg = p.packageId ? pkgMap.get(p.packageId)?.name : "General payment";
    exportPDF(
      `Payment Receipt — ${studentName}`,
      ["Field", "Value"],
      [
        ["Receipt No", p.id.slice(-8).toUpperCase()],
        ["Date", p.paidOn],
        ["Package", pkg || "—"],
        ["Month", p.month],
        ["Amount (Rs)", p.amount.toLocaleString()],
      ],
    );
  }

  function downloadReceipts() {
    exportExcel(
      `${studentName}-payments.xls`,
      sorted.map((p) => ({
        Date: p.paidOn,
        Receipt: p.id.slice(-8).toUpperCase(),
        Package: (p.packageId && pkgMap.get(p.packageId)?.name) || "—",
        Month: p.month,
        Amount: p.amount,
      })),
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Paid" value={`Rs ${totalPaid.toLocaleString()}`} icon={Wallet} accent="success" />
        <StatCard label="Outstanding" value={`Rs ${outstanding.toLocaleString()}`} icon={AlertCircle} accent={outstanding > 0 ? "destructive" : "success"} />
        <StatCard label="Monthly Fee" value={`Rs ${monthlyFee.toLocaleString()}`} icon={ReceiptText} accent="primary" />
        <StatCard label="Last Payment" value={lastPayment?.paidOn || "—"} icon={CalendarClock} accent="primary" />
        <StatCard label="Next Due" value={nextDueDate} icon={CalendarClock} accent="warning" />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={downloadReceipts}>
          <Download size={14} /> Export Excel
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Payment history</h3>
          <span className="text-xs text-muted-foreground">{sorted.length} records</span>
        </div>
        {sorted.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.paidOn}</TableCell>
                  <TableCell className="font-mono text-xs">{p.id.slice(-8).toUpperCase()}</TableCell>
                  <TableCell>{(p.packageId && pkgMap.get(p.packageId)?.name) || "—"}</TableCell>
                  <TableCell>{p.month}</TableCell>
                  <TableCell className="font-semibold">Rs {p.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className="bg-success/15 text-success border-transparent">Paid</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => printReceipt(p)}>
                      <Printer size={13} /> Receipt
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8">
            <EmptyBlock>No payments recorded yet.</EmptyBlock>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Analytics tab ---------- */
function AnalyticsTab({
  attendance,
  marks,
  exams,
  courses,
  rate,
  avgPct,
}: {
  attendance: import("@/lib/types").AttendanceRecord[];
  marks: import("@/lib/types").ExamMark[];
  exams: import("@/lib/types").Exam[];
  courses: import("@/lib/types").Course[];
  rate: number;
  avgPct: number;
}) {
  const bySubject = useMemo(() => {
    const attMap = new Map<string, { p: number; t: number }>();
    for (const r of attendance) {
      const cur = attMap.get(r.courseId) ?? { p: 0, t: 0 };
      cur.t++;
      if (r.status === "Present") cur.p++;
      attMap.set(r.courseId, cur);
    }
    const markMap = new Map<string, number[]>();
    for (const m of marks) {
      const ex = exams.find((e) => e.id === m.examId);
      if (!ex) continue;
      const arr = markMap.get(ex.subjectId) ?? [];
      arr.push((m.marks / ex.maxMarks) * 100);
      markMap.set(ex.subjectId, arr);
    }
    const ids = new Set<string>([...attMap.keys(), ...markMap.keys()]);
    return Array.from(ids).map((id) => {
      const att = attMap.get(id);
      const arr = markMap.get(id) ?? [];
      return {
        subject: courses.find((c) => c.id === id)?.name || "—",
        attendance: att ? Math.round((att.p / att.t) * 100) : 0,
        marks: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0,
      };
    });
  }, [attendance, marks, exams, courses]);

  const insights = useMemo(() => {
    const out: { tone: "good" | "warn" | "bad"; text: string }[] = [];
    if (rate >= 90) out.push({ tone: "good", text: `Excellent attendance — ${rate}% overall.` });
    else if (rate < 75) out.push({ tone: "bad", text: `Attendance is below target at ${rate}%.` });
    if (avgPct >= 75) out.push({ tone: "good", text: `Strong academic average at ${avgPct}%.` });
    else if (avgPct && avgPct < 50) out.push({ tone: "bad", text: `Average marks are low (${avgPct}%) — extra support recommended.` });
    const best = [...bySubject].sort((a, b) => b.marks - a.marks)[0];
    if (best && best.marks > 0) out.push({ tone: "good", text: `Top subject: ${best.subject} (${best.marks}%).` });
    const worst = [...bySubject].filter((s) => s.marks > 0).sort((a, b) => a.marks - b.marks)[0];
    if (worst && worst.marks < 50) out.push({ tone: "warn", text: `Needs improvement in ${worst.subject}.` });
    return out;
  }, [rate, avgPct, bySubject]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-2">Attendance vs Marks</h3>
          {bySubject.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bySubject}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="attendance" name="Attendance %" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="marks" name="Marks %" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyBlock>Not enough data yet.</EmptyBlock>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-2">Subject radar</h3>
          {bySubject.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={bySubject}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Marks" dataKey="marks" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyBlock>Not enough data yet.</EmptyBlock>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-primary" />
          <h3 className="font-semibold text-sm">Insights</h3>
        </div>
        {insights.length ? (
          <div className="space-y-2">
            {insights.map((it, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm border",
                  it.tone === "good" && "bg-success/10 border-success/30 text-success",
                  it.tone === "warn" && "bg-warning/10 border-warning/30 text-warning",
                  it.tone === "bad" && "bg-destructive/10 border-destructive/30 text-destructive",
                )}
              >
                {it.text}
              </div>
            ))}
          </div>
        ) : (
          <EmptyBlock>Not enough data to generate insights yet.</EmptyBlock>
        )}
      </div>
    </>
  );
}

/* ---------- Timeline tab ---------- */
function TimelineTab({
  items,
}: {
  items: { title: string; date: string; kind: string; dotClass: string }[];
}) {
  if (!items.length) {
    return <EmptyBlock>No timeline events yet.</EmptyBlock>;
  }
  return (
    <div className="glass-card rounded-2xl p-5">
      <ol className="relative border-l-2 border-border ml-3 space-y-4">
        {items.map((it, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="pl-4"
          >
            <span
              className={cn(
                "absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-2 ring-background",
                it.dotClass,
              )}
            />
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {it.kind} · {it.date}
            </div>
            <div className="text-sm font-medium">{it.title}</div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Helpers ---------- */
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function EmptyBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-muted-foreground text-center py-6">{children}</div>
  );
}

function monthsBetween(startISO: string, endISO: string) {
  if (!startISO) return 1;
  const s = new Date(startISO);
  const e = new Date(endISO);
  if (Number.isNaN(s.getTime())) return 1;
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
}

function computeNextDue(fromISO: string) {
  if (!fromISO) return "—";
  const d = new Date(fromISO);
  if (Number.isNaN(d.getTime())) return "—";
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function recentActivity(
  attendance: import("@/lib/types").AttendanceRecord[],
  payments: import("@/lib/types").StudentPayment[],
  marks: import("@/lib/types").ExamMark[],
  exams: import("@/lib/types").Exam[],
  courses: import("@/lib/types").Course[],
) {
  const items: { title: string; date: string; kind: string; dotClass: string }[] = [];
  for (const a of attendance) {
    items.push({
      kind: "Attendance",
      title: `${a.status} — ${courses.find((c) => c.id === a.courseId)?.name || "class"}`,
      date: a.date,
      dotClass: a.status === "Present" ? "bg-success" : "bg-destructive",
    });
  }
  for (const p of payments) {
    items.push({
      kind: "Payment",
      title: `Paid Rs ${p.amount.toLocaleString()} for ${p.month}`,
      date: p.paidOn,
      dotClass: "bg-primary",
    });
  }
  for (const m of marks) {
    const ex = exams.find((e) => e.id === m.examId);
    if (!ex) continue;
    items.push({
      kind: "Exam",
      title: `${ex.name}: ${m.marks}/${ex.maxMarks} (${m.grade || computeGrade(m.marks, ex.maxMarks)})`,
      date: ex.date,
      dotClass: "bg-warning",
    });
  }
  return items.sort((a, b) => (a.date > b.date ? -1 : 1));
}