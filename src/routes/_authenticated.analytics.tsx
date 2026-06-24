import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Award, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useData } from "@/lib/store";
import { lowAttendance, monthlySeries, overallRate, studentRate, topStudents } from "@/lib/metrics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const { attendance, students, courses, batches, settings } = useData();
  const series = useMemo(() => monthlySeries(attendance), [attendance]);
  const overall = overallRate(attendance);
  const top = useMemo(() => topStudents(attendance, students, 8), [attendance, students]);
  const low = useMemo(
    () => lowAttendance(attendance, students, settings.attendanceThreshold),
    [attendance, students, settings.attendanceThreshold],
  );

  const byCourse = useMemo(
    () =>
      courses.map((c) => {
        const recs = attendance.filter((r) => r.courseId === c.id);
        const present = recs.filter((r) => r.status === "Present").length;
        return { name: c.code, rate: recs.length ? Math.round((present / recs.length) * 100) : 0 };
      }),
    [attendance, courses],
  );

  const byBatch = useMemo(
    () =>
      batches.map((b) => {
        const recs = attendance.filter((r) => r.batchId === b.id);
        const present = recs.filter((r) => r.status === "Present").length;
        return { name: b.code, rate: recs.length ? Math.round((present / recs.length) * 100) : 0 };
      }),
    [attendance, batches],
  );

  return (
    <AppShell
      title="Analytics"
      subtitle={`Overall attendance rate ${overall}% · threshold ${settings.attendanceThreshold}%`}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 xl:col-span-2"
        >
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp size={16} /> Attendance Trend
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              <Line dataKey="rate" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="font-semibold flex items-center gap-2">
            <Award size={16} /> Top Students
          </h3>
          <div className="mt-3 space-y-2">
            {top.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-6 text-xs font-bold text-muted-foreground">{i + 1}</div>
                <img src={s.photoUrl} alt="" className="w-7 h-7 rounded-full bg-secondary" />
                <div className="flex-1 min-w-0 text-sm truncate">{s.fullName}</div>
                <div className="text-xs font-semibold text-success">{s.rate}%</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="font-semibold">Course Attendance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byCourse}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                {byCourse.map((_, i) => (
                  <Cell key={i} fill="var(--primary)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="font-semibold">Batch Attendance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byBatch}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              <Bar dataKey="rate" radius={[8, 8, 0, 0]} fill="var(--chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="font-semibold flex items-center gap-2 text-warning-foreground">
            <AlertTriangle size={16} /> Low Attendance Alerts
          </h3>
          <p className="text-xs text-muted-foreground">
            Below {settings.attendanceThreshold}% threshold
          </p>
          <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto">
            {low.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                All students above threshold ✓
              </div>
            )}
            {low.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5 border border-destructive/10"
              >
                <img src={s.photoUrl} alt="" className="w-7 h-7 rounded-full bg-secondary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.fullName}</div>
                  <div className="text-xs text-muted-foreground">{s.studentId}</div>
                </div>
                <div className="text-xs font-bold text-destructive">{s.rate}%</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
