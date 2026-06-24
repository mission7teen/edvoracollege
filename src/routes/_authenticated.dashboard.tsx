import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  UserX,
  Percent,
  GraduationCap,
  Layers,
  TrendingUp,
  Activity,
  BookOpen,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useData } from "@/lib/store";
import {
  attendanceForDate,
  monthlySeries,
  overallRate,
  todayStr,
  topStudents,
} from "@/lib/metrics";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { students, courses, batches, teachers, attendance } = useData();
  const today = todayStr();
  const todays = useMemo(() => attendanceForDate(attendance, today), [attendance, today]);
  const presentToday = todays.filter((r) => r.status === "Present").length;
  const absentToday = todays.filter((r) => r.status === "Absent").length;
  const overall = overallRate(attendance);
  const series = useMemo(() => monthlySeries(attendance), [attendance]);
  const top = useMemo(() => topStudents(attendance, students, 5), [attendance, students]);

  const breakdown = useMemo(() => {
    const map = { Present: 0, Absent: 0 } as Record<string, number>;
    for (const r of todays) map[r.status]++;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [todays]);

  const COLORS = ["var(--success)", "var(--destructive)"];

  const recent = useMemo(() => {
    const sMap = new Map(students.map((s) => [s.id, s]));
    return [...attendance]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .map((r) => ({ ...r, student: sMap.get(r.studentId) }));
  }, [attendance, students]);

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Welcome back — here is what is happening today, ${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
        <StatCard
          label="Total Students"
          value={students.length}
          icon={Users}
          delta="+12 this month"
          accent="primary"
          delay={0}
        />
        <StatCard
          label="Present Today"
          value={presentToday}
          icon={UserCheck}
          delta={`${todays.length ? Math.round((presentToday / todays.length) * 100) : 0}% turnout`}
          accent="success"
          delay={0.05}
        />
        <StatCard
          label="Absent Today"
          value={absentToday}
          icon={UserX}
          trend="down"
          delta={`${todays.length ? Math.round((absentToday / todays.length) * 100) : 0}% of marked`}
          accent="destructive"
          delay={0.1}
        />
        <StatCard
          label="Avg Attendance"
          value={`${overall}%`}
          icon={Percent}
          delta="30-day rolling"
          accent="primary"
          delay={0.15}
        />
        <StatCard
          label="Subjects"
          value={courses.length}
          icon={BookOpen}
          accent="warning"
          delay={0.2}
        />
        <StatCard
          label="Teachers"
          value={teachers.length}
          icon={GraduationCap}
          accent="primary"
          delay={0.25}
        />
        <StatCard
          label="Batches"
          value={batches.length}
          icon={Layers}
          accent="primary"
          delay={0.3}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold tracking-tight">Monthly Attendance Trend</h3>
              <p className="text-xs text-muted-foreground">
                Daily attendance rate across the last 30 sessions
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-success font-medium">
              <TrendingUp size={14} /> Healthy
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="rate"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#rateGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="font-semibold tracking-tight">Today's Breakdown</h3>
          <p className="text-xs text-muted-foreground">Marked sessions for {today}</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={breakdown}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {breakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-2 glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold tracking-tight flex items-center gap-2">
              <Activity size={16} /> Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-border">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-3">
                <img
                  src={r.student?.photoUrl}
                  alt=""
                  className="w-9 h-9 rounded-full bg-secondary"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.student?.fullName}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.student?.studentId} · {r.date}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="font-semibold tracking-tight">Top Performers</h3>
          <p className="text-xs text-muted-foreground mb-3">By attendance rate</p>
          <div className="space-y-3">
            {top.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md grid place-items-center text-[11px] font-bold bg-secondary text-secondary-foreground">
                  {i + 1}
                </div>
                <img src={s.photoUrl} alt="" className="w-8 h-8 rounded-full bg-secondary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.fullName}</div>
                  <div className="text-xs text-muted-foreground">{s.studentId}</div>
                </div>
                <div className="text-sm font-semibold text-success">{s.rate}%</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
