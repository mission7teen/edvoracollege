import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileDown,
  FileText,
  GraduationCap,
  LineChart as LineChartIcon,
  Mail,
  MapPin,
  Phone,
  PieChart,
  Printer,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudentPortfolio } from "@/lib/checkin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkin/$studentId")({
  component: StudentPortfolioPage,
  head: ({ params }) => {
    const url = `https://edvoracollege.lovable.app/checkin/${params.studentId}`;
    const title = `Student ${params.studentId} · EDVORA COLLEGE Portfolio`;
    const description = `Public read-only portfolio for EDVORA COLLEGE student ${params.studentId} — attendance, exam results and payment status.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

type Portfolio = Awaited<ReturnType<typeof getStudentPortfolio>>;

const currency = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

const tabs = [
  { value: "overview", label: "Overview", icon: User },
  { value: "attendance", label: "Attendance", icon: Calendar },
  { value: "exams", label: "Exam Results", icon: Award },
  { value: "payments", label: "Payments", icon: Wallet },
  { value: "analytics", label: "Performance Analytics", icon: BarChart3 },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "timeline", label: "Timeline", icon: Clock },
];

function StudentPortfolioPage() {
  const { studentId } = Route.useParams();
  const portfolioFn = useServerFn(getStudentPortfolio);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioErr, setPortfolioErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await portfolioFn({ data: { studentId } });
        if (!cancelled) setPortfolio(p);
      } catch (e) {
        if (!cancelled) setPortfolioErr((e as Error)?.message ?? "Student not found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, portfolioFn]);

  if (portfolioErr && !portfolio) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="glass-card w-full rounded-2xl p-8 text-center shadow-elegant">
            <XCircle size={64} className="mx-auto text-destructive" />
            <h1 className="mt-4 text-2xl font-bold">Student not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">{portfolioErr}</p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">ID: {studentId}</p>
            <Button className="mt-6" variant="outline" onClick={() => history.back()}>
              <ArrowLeft /> Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!portfolio) return <PortfolioSkeleton />;

  return <PortfolioView portfolio={portfolio} query={query} setQuery={setQuery} />;
}

function PortfolioView({
  portfolio,
  query,
  setQuery,
}: {
  portfolio: Portfolio;
  query: string;
  setQuery: (value: string) => void;
}) {
  const s = portfolio.student;
  const metrics = useMemo(() => buildMetrics(portfolio), [portfolio]);
  const chartData = useMemo(() => buildChartData(portfolio), [portfolio]);
  const timeline = useMemo(() => buildTimeline(portfolio), [portfolio]);
  const filteredMarks = portfolio.marks.filter((mark) =>
    `${mark.examName} ${mark.subject} ${mark.examType}`.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredPayments = portfolio.payments.filter((payment) =>
    `${payment.month} ${payment.packageName} ${payment.paidOn}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_30%),radial-gradient(circle_at_90%_10%,color-mix(in_oklab,var(--success)_14%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_oklab,var(--secondary)_45%,transparent),transparent_34%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-card grid gap-5 rounded-2xl p-4 shadow-elegant sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        >
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar student={s} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-primary">
                <GraduationCap size={16} /> EDVORA COLLEGE
                <span className="rounded-full bg-primary/10 px-2 py-1 font-mono text-primary">
                  {s.studentId}
                </span>
              </div>
              <h1 className="mt-2 truncate text-3xl font-extrabold tracking-tight sm:text-4xl">
                {s.fullName}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill icon={<BookOpen size={14} />} label={s.courseName || "Grade/Class not set"} />
                <Pill icon={<Sparkles size={14} />} label={s.courseName || "Stream not set"} />
                <Pill icon={<Users size={14} />} label={s.batchName || "Batch not set"} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <StatusPill status={s.status} />
              <MetricBadge tone={metrics.attendanceTone} label={`${metrics.attendancePct}% Attendance`} />
              <MetricBadge tone={metrics.paymentStatus === "Paid" ? "success" : "warning"} label={metrics.paymentStatus} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
              <ActionButton icon={<Download />} label="Download Report" onClick={() => window.print()} />
              <ActionButton icon={<Printer />} label="Print" onClick={() => window.print()} />
              <ActionButton icon={<FileDown />} label="Export Excel" onClick={() => window.print()} />
              <ActionButton icon={<User />} label="Edit Student" onClick={() => (window.location.href = "/students")} />
              <ActionButton icon={<ArrowLeft />} label="Back" onClick={() => history.back()} />
            </div>
          </div>
        </motion.header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.cards.map((card, index) => (
            <SummaryCard key={card.label} {...card} delay={index * 0.04} />
          ))}
        </section>

        <div className="sticky top-0 z-20 -mx-4 mt-6 border-y border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exams, payments, documents..."
                className="h-10 w-full rounded-xl border border-input bg-card/75 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <BadgeCheck size={16} className="text-success" /> Public read-only portfolio · no attendance is marked
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-5">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl bg-card/70 p-1.5 shadow-card backdrop-blur lg:grid lg:grid-cols-7">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="min-w-max gap-2 rounded-xl px-3 py-2">
                <tab.icon size={15} /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <OverviewTab portfolio={portfolio} metrics={metrics} timeline={timeline.slice(0, 5)} />
          </TabsContent>

          <TabsContent value="attendance" className="mt-5">
            <AttendanceTab portfolio={portfolio} metrics={metrics} chartData={chartData} />
          </TabsContent>

          <TabsContent value="exams" className="mt-5">
            <ExamsTab marks={filteredMarks} metrics={metrics} chartData={chartData} />
          </TabsContent>

          <TabsContent value="payments" className="mt-5">
            <PaymentsTab payments={filteredPayments} metrics={metrics} timeline={timeline} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-5">
            <AnalyticsTab metrics={metrics} chartData={chartData} />
          </TabsContent>

          <TabsContent value="documents" className="mt-5">
            <DocumentsTab payments={filteredPayments} marks={filteredMarks} studentName={s.fullName} />
          </TabsContent>

          <TabsContent value="timeline" className="mt-5">
            <TimelineTab timeline={timeline} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function OverviewTab({
  portfolio,
  metrics,
  timeline,
}: {
  portfolio: Portfolio;
  metrics: ReturnType<typeof buildMetrics>;
  timeline: TimelineItem[];
}) {
  const s = portfolio.student;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Student Information" icon={<User />}>
          <InfoRow label="Full name" value={s.fullName} />
          <InfoRow label="Student ID" value={s.studentId} />
          <InfoRow label="Gender" value={s.gender || "—"} />
          <InfoRow label="Date of birth" value={s.dob || "—"} />
          <InfoRow label="Registered" value={s.registrationDate || "—"} />
        </InfoCard>
        <InfoCard title="Parent Information" icon={<Users />}>
          <InfoRow label="Guardian" value={s.guardianName || "—"} />
          <InfoRow label="Guardian phone" value={s.guardianPhone || "—"} />
          <InfoRow label="Payment status" value={metrics.paymentStatus} />
          <InfoRow label="Next due" value={metrics.nextPaymentDue} />
        </InfoCard>
        <InfoCard title="Contact Information" icon={<Phone />}>
          <InfoRow label="Phone" value={s.phone || "—"} />
          <InfoRow label="Email" value={s.email || "—"} />
          <InfoRow label="Address" value={s.address || "—"} />
        </InfoCard>
        <InfoCard title="Academic Information" icon={<BookOpen />}>
          <InfoRow label="Grade/Class" value={s.courseName || "—"} />
          <InfoRow label="Stream" value={s.courseName || "—"} />
          <InfoRow label="Batch" value={s.batchName || "—"} />
          <InfoRow label="Average marks" value={`${metrics.averageMarks}%`} />
        </InfoCard>
      </div>
      <div className="space-y-5">
        <InfoCard title="Recent Activities" icon={<Activity />}>
          <MiniTimeline items={timeline} />
        </InfoCard>
        <InfoCard title="Teacher Notes" icon={<FileText />}>
          <p className="text-sm leading-6 text-muted-foreground">
            Student profile is active for read-only review. Recent attendance, marks, and payment records are summarized from the current portfolio data.
          </p>
        </InfoCard>
        <InfoCard title="Quick Statistics" icon={<PieChart />}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <QuickStat label="Present" value={metrics.presentDays} />
            <QuickStat label="Absent" value={metrics.absentDays} />
            <QuickStat label="Exams" value={metrics.examsCompleted} />
          </div>
        </InfoCard>
      </div>
    </div>
  );
}

function AttendanceTab({
  portfolio,
  metrics,
  chartData,
}: {
  portfolio: Portfolio;
  metrics: ReturnType<typeof buildMetrics>;
  chartData: ReturnType<typeof buildChartData>;
}) {
  const subjectRows = [
    {
      subject: portfolio.student.courseName || "General Attendance",
      present: metrics.presentDays,
      absent: metrics.absentDays,
      late: 0,
      percentage: metrics.attendancePct,
    },
  ];
  return (
    <div className="space-y-5">
      <FilterBar filters={["Month", "Subject", "Date Range"]} />
      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard title="Monthly Attendance" icon={<BarChart3 />}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData.monthlyAttendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="present" fill="var(--success)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="absent" fill="var(--destructive)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Subject-wise Attendance" icon={<PieChart />}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={subjectRows} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="subject" width={95} />
              <Tooltip />
              <Bar dataKey="percentage" fill="var(--primary)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Weekly Attendance Trend" icon={<LineChartIcon />}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData.weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="var(--success)" fill="var(--success)" fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <DataPanel title="Attendance Summary">
        <Table headers={["Subject", "Present", "Absent", "Late", "Percentage"]}>
          {subjectRows.map((row) => (
            <tr key={row.subject} className="border-b border-border/60 last:border-0">
              <Td>{row.subject}</Td>
              <Td>{row.present}</Td>
              <Td>{row.absent}</Td>
              <Td>{row.late}</Td>
              <Td>
                <MetricBadge tone={attendanceTone(row.percentage)} label={`${row.percentage}%`} />
              </Td>
            </tr>
          ))}
        </Table>
      </DataPanel>
      <DataPanel title="Recent Attendance Records">
        {portfolio.attendance.last30.length === 0 ? <Empty label="No recent attendance records." /> : (
          <Table headers={["Date", "Status", "Remarks"]}>
            {portfolio.attendance.last30.map((record) => (
              <tr key={record.date} className="border-b border-border/60 last:border-0">
                <Td>{record.date}</Td>
                <Td><MetricBadge tone={record.status === "Present" ? "success" : "danger"} label={record.status} /></Td>
                <Td>—</Td>
              </tr>
            ))}
          </Table>
        )}
      </DataPanel>
    </div>
  );
}

function ExamsTab({
  marks,
  metrics,
  chartData,
}: {
  marks: Portfolio["marks"];
  metrics: ReturnType<typeof buildMetrics>;
  chartData: ReturnType<typeof buildChartData>;
}) {
  return (
    <div className="space-y-5">
      <FilterBar filters={["Exam", "Term", "Year"]} />
      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard title="Subject Marks" icon={<BarChart3 />}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.examPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="percentage" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Exam Trend" icon={<LineChartIcon />}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.examPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="percentage" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Performance Comparison" icon={<Activity />}>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={chartData.radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <Radar dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {marks.length === 0 ? <Empty label="No exam marks yet." /> : marks.map((mark) => {
          const percentage = mark.maxMarks > 0 ? Math.round((mark.marks / mark.maxMarks) * 100) : 0;
          return (
            <motion.div key={mark.id} whileHover={{ y: -4 }} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{mark.examName || "Exam"}</p>
                  <p className="text-sm text-muted-foreground">{mark.examType} · {mark.date || "No date"}</p>
                </div>
                <MetricBadge tone={percentage >= 75 ? "success" : percentage >= 55 ? "warning" : "danger"} label={mark.grade || "—"} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <QuickStat label="Subject" value={mark.subject || "—"} />
                <QuickStat label="Marks" value={`${mark.marks}/${mark.maxMarks}`} />
                <QuickStat label="Average" value={`${metrics.averageMarks}%`} />
                <QuickStat label="GPA" value={percentageToGpa(percentage)} />
                <QuickStat label="Highest" value={`${metrics.highestMark}%`} />
                <QuickStat label="Lowest" value={`${metrics.lowestMark}%`} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentsTab({
  payments,
  metrics,
  timeline,
}: {
  payments: Portfolio["payments"];
  metrics: ReturnType<typeof buildMetrics>;
  timeline: TimelineItem[];
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniMetric icon={<Wallet />} label="Total Paid" value={currency.format(metrics.totalPayments)} />
        <MiniMetric icon={<CreditCard />} label="Remaining Balance" value={currency.format(metrics.outstanding)} />
        <MiniMetric icon={<Receipt />} label="Monthly Fee" value={currency.format(metrics.monthlyFee)} />
        <MiniMetric icon={<Calendar />} label="Last Payment" value={metrics.lastPaymentDate} />
        <MiniMetric icon={<Clock />} label="Next Due Date" value={metrics.nextPaymentDue} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <DataPanel title="Payment History">
          {payments.length === 0 ? <Empty label="No payments recorded." /> : (
            <Table headers={["Date", "Receipt No", "Package", "Amount", "Payment Method", "Status", "Remarks", "Actions"]}>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border/60 last:border-0">
                  <Td>{payment.paidOn || payment.month}</Td>
                  <Td><span className="font-mono text-xs">{receiptNo(payment.id)}</span></Td>
                  <Td>{payment.packageName || "—"}</Td>
                  <Td>{currency.format(payment.amount)}</Td>
                  <Td>Cash</Td>
                  <Td><MetricBadge tone="success" label="Paid" /></Td>
                  <Td>{payment.month}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => window.print()} aria-label="Download receipt"><Download /></Button>
                      <Button size="icon" variant="ghost" onClick={() => window.print()} aria-label="Print receipt"><Printer /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </DataPanel>
        <InfoCard title="Payment Timeline" icon={<Receipt />}>
          <MiniTimeline items={timeline.filter((item) => item.type === "payment").slice(0, 8)} />
        </InfoCard>
      </div>
    </div>
  );
}

function AnalyticsTab({
  metrics,
  chartData,
}: {
  metrics: ReturnType<typeof buildMetrics>;
  chartData: ReturnType<typeof buildChartData>;
}) {
  const insights = [
    `Attendance is currently ${metrics.attendancePct}%. ${metrics.attendancePct >= 80 ? "Attendance is in a healthy range." : "Attendance needs improvement this month."}`,
    `${metrics.bestSubject || "Mathematics"} performance is ${metrics.averageMarks >= 75 ? "excellent" : "progressing"}.`,
    `${metrics.lowestSubject || "Economics"} ${metrics.lowestMark < 55 ? "needs improvement" : "is stable"}.`,
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Attendance vs Marks" icon={<Activity />}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[{ name: "Current", attendance: metrics.attendancePct, marks: metrics.averageMarks }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="attendance" fill="var(--success)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="marks" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Progress" icon={<TrendingUp />}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData.monthlyProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Area type="monotone" dataKey="attendance" stroke="var(--success)" fill="var(--success)" fillOpacity={0.16} />
              <Area type="monotone" dataKey="marks" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.14} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Subject Performance Radar" icon={<PieChart />}>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData.radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <Radar dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.26} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Exam Trend" icon={<LineChartIcon />}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.examPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="percentage" stroke="var(--primary)" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <InfoCard title="AI-style Insights" icon={<Sparkles />}>
        <div className="grid gap-3 md:grid-cols-3">
          {insights.map((insight) => (
            <div key={insight} className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm font-medium leading-6">
              “{insight}”
            </div>
          ))}
        </div>
      </InfoCard>
    </div>
  );
}

function DocumentsTab({
  payments,
  marks,
  studentName,
}: {
  payments: Portfolio["payments"];
  marks: Portfolio["marks"];
  studentName: string;
}) {
  const docs = [
    { name: "Student Profile Report", type: "Profile", date: "Current", icon: User },
    ...marks.slice(0, 4).map((mark) => ({ name: `${mark.examName || "Exam"} Report`, type: "Exam Report", date: mark.date || "—", icon: Award })),
    ...payments.slice(0, 4).map((payment) => ({ name: `${payment.month} Payment Receipt`, type: "Payment Receipt", date: payment.paidOn || payment.month, icon: Receipt })),
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {docs.length === 0 ? <Empty label="No documents available." /> : docs.map((doc) => (
        <motion.div key={`${doc.type}-${doc.name}`} whileHover={{ y: -4 }} className="glass-card rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <doc.icon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold">{doc.name}</h3>
              <p className="text-sm text-muted-foreground">{doc.type} · {doc.date}</p>
              <p className="mt-2 text-xs text-muted-foreground">{studentName}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}><FileText /> Preview</Button>
            <Button size="sm" onClick={() => window.print()}><Download /> Download</Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TimelineTab({ timeline }: { timeline: TimelineItem[] }) {
  return (
    <InfoCard title="Student Timeline" icon={<Clock />}>
      <div className="relative space-y-5 before:absolute before:left-5 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
        {timeline.length === 0 ? <Empty label="No timeline activity yet." /> : timeline.map((item) => (
          <div key={`${item.date}-${item.title}`} className="relative flex gap-4">
            <div className={cn("z-10 grid size-10 shrink-0 place-items-center rounded-full text-primary-foreground", item.color)}>
              <item.icon size={18} />
            </div>
            <div className="min-w-0 rounded-2xl border border-border/70 bg-card/65 p-4 shadow-card">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{item.date}</p>
            </div>
          </div>
        ))}
      </div>
    </InfoCard>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex animate-pulse gap-4">
            <div className="size-24 rounded-full bg-primary/10" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-2/3 rounded bg-primary/10" />
              <div className="h-4 w-1/3 rounded bg-primary/10" />
              <div className="h-10 w-full rounded bg-primary/10" />
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-primary/10" />)}
        </div>
      </div>
    </div>
  );
}

function Avatar({ student }: { student: Portfolio["student"] }) {
  return student.photoUrl ? (
    <img src={student.photoUrl} alt={student.fullName} className="size-24 shrink-0 rounded-2xl border border-border object-cover shadow-card sm:size-28" />
  ) : (
    <div className="grid size-24 shrink-0 place-items-center rounded-2xl border border-border bg-primary/10 text-primary shadow-card sm:size-28">
      <User size={42} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  trend,
  tone,
  delay,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  trend: string;
  tone: Tone;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase text-muted-foreground">{label}</p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-2xl font-extrabold">
            {value}
          </motion.p>
          <p className={cn("mt-1 flex items-center gap-1 text-xs font-semibold", toneText(tone))}>
            {tone === "danger" ? <TrendingDown size={13} /> : <TrendingUp size={13} />} {trend}
          </p>
        </div>
        <div className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", toneBg(tone))}>
          <Icon size={21} />
        </div>
      </div>
    </motion.div>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <h2 className="font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DataPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-card overflow-hidden rounded-2xl">
      <div className="border-b border-border/70 p-5">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="overflow-x-auto p-5">{children}</div>
    </section>
  );
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead>
        <tr className="border-b border-border/70 text-xs uppercase text-muted-foreground">
          {headers.map((header) => <th key={header} className="px-3 py-3 font-bold">{header}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-3 py-3 align-middle">{children}</td>;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/65 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function MiniMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-extrabold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniTimeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) return <Empty label="No recent activities." />;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.date}-${item.title}`} className="flex gap-3">
          <div className={cn("grid size-9 shrink-0 place-items-center rounded-full text-primary-foreground", item.color)}>
            <item.icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterBar({ filters }: { filters: string[] }) {
  return (
    <div className="glass-card flex flex-wrap items-center gap-2 rounded-2xl p-3">
      {filters.map((filter) => (
        <button key={filter} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary">
          {filter}
        </button>
      ))}
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="justify-start bg-card/70">
      {icon} {label}
    </Button>
  );
}

function Pill({ icon, label }: { icon: ReactNode; label: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">{icon}{label}</span>;
}

function StatusPill({ status }: { status: string }) {
  return <MetricBadge tone={status === "Active" ? "success" : "neutral"} label={status} />;
}

type Tone = "success" | "warning" | "danger" | "primary" | "neutral";

function MetricBadge({ tone, label }: { tone: Tone; label: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold", badgeTone(tone))}>{label}</span>;
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{label}</div>;
}

type TimelineItem = {
  date: string;
  title: string;
  description: string;
  type: "attendance" | "payment" | "exam" | "profile";
  icon: typeof Activity;
  color: string;
};

function buildMetrics(portfolio: Portfolio) {
  const presentDays = portfolio.attendance.presentCount;
  const totalDays = portfolio.attendance.totalCount;
  const absentDays = Math.max(totalDays - presentDays, 0);
  const attendancePct = totalDays > 0 ? portfolio.attendance.percentage : 0;
  const marksPct = portfolio.marks.map((m) => (m.maxMarks > 0 ? Math.round((m.marks / m.maxMarks) * 100) : 0));
  const averageMarks = marksPct.length ? Math.round(marksPct.reduce((a, b) => a + b, 0) / marksPct.length) : 0;
  const totalPayments = portfolio.payments.reduce((sum, p) => sum + p.amount, 0);
  const monthlyFee = portfolio.payments[0]?.amount || 0;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthPaid = portfolio.payments.filter((p) => p.month === currentMonth).reduce((sum, p) => sum + p.amount, 0);
  const outstanding = Math.max(monthlyFee - currentMonthPaid, 0);
  const paymentStatus = outstanding === 0 && monthlyFee > 0 ? "Paid" : "Due";
  const highestIndex = marksPct.length ? marksPct.indexOf(Math.max(...marksPct)) : -1;
  const lowestIndex = marksPct.length ? marksPct.indexOf(Math.min(...marksPct)) : -1;
  const highestMark = highestIndex >= 0 ? marksPct[highestIndex] : 0;
  const lowestMark = lowestIndex >= 0 ? marksPct[lowestIndex] : 0;
  const nextDue = new Date();
  nextDue.setMonth(nextDue.getMonth() + (paymentStatus === "Paid" ? 1 : 0));
  nextDue.setDate(10);
  const lastPaymentDate = portfolio.payments[0]?.paidOn || portfolio.payments[0]?.month || "—";
  const attendanceToneValue = attendanceTone(attendancePct);

  return {
    attendancePct,
    attendanceTone: attendanceToneValue,
    presentDays,
    absentDays,
    examsCompleted: portfolio.marks.length,
    averageMarks,
    totalPayments,
    outstanding,
    monthlyFee,
    paymentStatus,
    nextPaymentDue: nextDue.toISOString().slice(0, 10),
    lastPaymentDate,
    highestMark,
    lowestMark,
    bestSubject: highestIndex >= 0 ? portfolio.marks[highestIndex]?.subject || portfolio.marks[highestIndex]?.examName : "",
    lowestSubject: lowestIndex >= 0 ? portfolio.marks[lowestIndex]?.subject || portfolio.marks[lowestIndex]?.examName : "",
    cards: [
      { label: "Total Attendance %", value: `${attendancePct}%`, icon: Activity, trend: trendLabel(attendancePct), tone: attendanceToneValue },
      { label: "Present Days", value: presentDays, icon: CheckCircle2, trend: "Recorded", tone: "success" as Tone },
      { label: "Absent Days", value: absentDays, icon: XCircle, trend: absentDays === 0 ? "Excellent" : "Review", tone: absentDays === 0 ? "success" as Tone : "warning" as Tone },
      { label: "Exams Completed", value: portfolio.marks.length, icon: Award, trend: "Published", tone: "primary" as Tone },
      { label: "Average Marks", value: `${averageMarks}%`, icon: GraduationCap, trend: trendLabel(averageMarks), tone: attendanceTone(averageMarks) },
      { label: "Total Payments", value: currency.format(totalPayments), icon: Wallet, trend: "Collected", tone: "success" as Tone },
      { label: "Outstanding Balance", value: currency.format(outstanding), icon: CreditCard, trend: outstanding > 0 ? "Due" : "Clear", tone: outstanding > 0 ? "warning" as Tone : "success" as Tone },
      { label: "Next Payment Due", value: nextDue.toISOString().slice(0, 10), icon: Clock, trend: paymentStatus, tone: paymentStatus === "Paid" ? "success" as Tone : "warning" as Tone },
    ],
  };
}

function buildChartData(portfolio: Portfolio) {
  const last30Asc = [...portfolio.attendance.last30].reverse();
  const monthlyAttendance = Object.values(
    last30Asc.reduce<Record<string, { name: string; present: number; absent: number }>>((acc, row) => {
      const key = row.date.slice(0, 7) || "Current";
      acc[key] ||= { name: key, present: 0, absent: 0 };
      if (row.status === "Present") acc[key].present += 1;
      else acc[key].absent += 1;
      return acc;
    }, {}),
  );
  const weeklyTrend = last30Asc.slice(-7).map((row) => ({
    name: row.date.slice(5),
    value: row.status === "Present" ? 100 : 0,
  }));
  const examPerformance = portfolio.marks.slice().reverse().map((mark, index) => ({
    name: mark.subject || mark.examName || `Exam ${index + 1}`,
    percentage: mark.maxMarks > 0 ? Math.round((mark.marks / mark.maxMarks) * 100) : 0,
  }));
  const radarData = examPerformance.length
    ? examPerformance.slice(-6).map((m) => ({ subject: m.name.slice(0, 14), score: m.percentage }))
    : [{ subject: "No Marks", score: 0 }];
  const averageMarks = examPerformance.length
    ? Math.round(examPerformance.reduce((sum, item) => sum + item.percentage, 0) / examPerformance.length)
    : 0;
  const monthlyProgress = (monthlyAttendance.length ? monthlyAttendance : [{ name: "Current", present: 0, absent: 0 }]).map((row) => {
    const total = row.present + row.absent;
    return {
      name: row.name,
      attendance: total > 0 ? Math.round((row.present / total) * 100) : 0,
      marks: averageMarks,
    };
  });
  return {
    monthlyAttendance: monthlyAttendance.length ? monthlyAttendance : [{ name: "Current", present: 0, absent: 0 }],
    weeklyTrend: weeklyTrend.length ? weeklyTrend : [{ name: "Now", value: 0 }],
    examPerformance: examPerformance.length ? examPerformance : [{ name: "No Exams", percentage: 0 }],
    radarData,
    monthlyProgress,
  };
}

function buildTimeline(portfolio: Portfolio): TimelineItem[] {
  const attendance = portfolio.attendance.last30.map((record) => ({
    date: record.date,
    title: `Attendance ${record.status}`,
    description: `Attendance status recorded as ${record.status}.`,
    type: "attendance" as const,
    icon: record.status === "Present" ? CheckCircle2 : XCircle,
    color: record.status === "Present" ? "bg-success" : "bg-destructive",
  }));
  const payments = portfolio.payments.map((payment) => ({
    date: payment.paidOn || payment.month,
    title: "Payment made",
    description: `${currency.format(payment.amount)} paid for ${payment.packageName || payment.month}.`,
    type: "payment" as const,
    icon: Receipt,
    color: "bg-primary",
  }));
  const exams = portfolio.marks.map((mark) => ({
    date: mark.date || "—",
    title: "Exam results published",
    description: `${mark.examName || "Exam"}: ${mark.marks}/${mark.maxMarks} (${mark.grade || "—"}).`,
    type: "exam" as const,
    icon: Award,
    color: "bg-warning",
  }));
  const profile = portfolio.student.registrationDate
    ? [{
        date: portfolio.student.registrationDate,
        title: "Student profile created",
        description: `${portfolio.student.fullName} registered at EDVORA COLLEGE.`,
        type: "profile" as const,
        icon: ShieldCheck,
        color: "bg-muted-foreground",
      }]
    : [];
  return [...attendance, ...payments, ...exams, ...profile].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

function attendanceTone(value: number): Tone {
  if (value >= 80) return "success";
  if (value >= 60) return "warning";
  return "danger";
}

function trendLabel(value: number) {
  if (value >= 80) return "High";
  if (value >= 60) return "Average";
  return "Low";
}

function percentageToGpa(value: number) {
  if (value >= 85) return "4.0";
  if (value >= 75) return "3.7";
  if (value >= 65) return "3.0";
  if (value >= 55) return "2.3";
  return "1.0";
}

function receiptNo(id: string) {
  return `RC-${id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`;
}

function badgeTone(tone: Tone) {
  switch (tone) {
    case "success": return "border-success/30 bg-success/15 text-success";
    case "warning": return "border-warning/40 bg-warning/15 text-warning";
    case "danger": return "border-destructive/30 bg-destructive/15 text-destructive";
    case "primary": return "border-primary/30 bg-primary/15 text-primary";
    default: return "border-border bg-muted text-muted-foreground";
  }
}

function toneBg(tone: Tone) {
  switch (tone) {
    case "success": return "bg-success/15 text-success";
    case "warning": return "bg-warning/15 text-warning";
    case "danger": return "bg-destructive/15 text-destructive";
    case "primary": return "bg-primary/15 text-primary";
    default: return "bg-muted text-muted-foreground";
  }
}

function toneText(tone: Tone) {
  switch (tone) {
    case "success": return "text-success";
    case "warning": return "text-warning";
    case "danger": return "text-destructive";
    case "primary": return "text-primary";
    default: return "text-muted-foreground";
  }
}