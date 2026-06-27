import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  GraduationCap,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BookOpen,
  Users,
} from "lucide-react";
import { markCheckinByStudentId, getStudentPortfolio } from "@/lib/checkin.functions";

export const Route = createFileRoute("/checkin/$studentId")({
  component: CheckinPage,
  head: () => ({
    meta: [
      { title: "Student Portfolio · EDVORA COLLEGE" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Portfolio = Awaited<ReturnType<typeof getStudentPortfolio>>;
type CheckinState =
  | { kind: "loading" }
  | { kind: "ok"; date: string; already: boolean }
  | { kind: "error"; message: string };

function CheckinPage() {
  const { studentId } = Route.useParams();
  const markFn = useServerFn(markCheckinByStudentId);
  const portfolioFn = useServerFn(getStudentPortfolio);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioErr, setPortfolioErr] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<CheckinState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await portfolioFn({ data: { studentId } });
        if (!cancelled) setPortfolio(p);
      } catch (e) {
        if (!cancelled) setPortfolioErr((e as Error)?.message ?? "Student not found");
      }
      try {
        const res = await markFn({ data: { studentId } });
        if (cancelled) return;
        setCheckin({ kind: "ok", date: res.date, already: res.alreadyPresent });
        if (navigator.vibrate) navigator.vibrate(120);
      } catch (e) {
        const err = e as Error;
        if (!cancelled) setCheckin({ kind: "error", message: err?.message ?? "Check-in failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, markFn, portfolioFn]);

  if (portfolioErr && !portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-6 text-center">
          <XCircle size={64} className="text-destructive mx-auto" />
          <h1 className="mt-3 text-xl font-bold text-foreground">Student not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">{portfolioErr}</p>
          <p className="mt-2 text-xs font-mono text-muted-foreground">ID: {studentId}</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={42} className="animate-spin text-primary" />
      </div>
    );
  }

  const s = portfolio.student;
  const a = portfolio.attendance;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="w-full max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
          <GraduationCap size={18} />
          EDVORA COLLEGE
        </div>

        <div className="rounded-xl border border-border bg-card p-3 text-sm flex items-center gap-3">
          {checkin.kind === "loading" && (
            <>
              <Loader2 size={18} className="animate-spin text-primary" />
              <span className="text-muted-foreground">Marking attendance…</span>
            </>
          )}
          {checkin.kind === "ok" && (
            <>
              <CheckCircle2 size={18} className="text-success" />
              <span className="text-foreground font-medium">
                {checkin.already ? "Already present" : "Marked Present"} · {checkin.date}
              </span>
            </>
          )}
          {checkin.kind === "error" && (
            <>
              <XCircle size={18} className="text-destructive" />
              <span className="text-muted-foreground">{checkin.message}</span>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="bg-primary/10 p-5 flex items-center gap-4">
            {s.photoUrl ? (
              <img
                src={s.photoUrl}
                alt={s.fullName}
                className="w-20 h-20 rounded-full object-cover border-2 border-background shadow"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <User size={36} className="text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{s.fullName}</h1>
              <p className="text-xs font-mono text-muted-foreground">{s.studentId}</p>
              <span
                className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  s.status === "Active"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.status}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-3 text-sm">
            {s.courseName && (
              <Row icon={<BookOpen size={16} />} label="Course" value={s.courseName} />
            )}
            {s.batchName && (
              <Row icon={<Users size={16} />} label="Batch" value={s.batchName} />
            )}
            {s.phone && <Row icon={<Phone size={16} />} label="Phone" value={s.phone} />}
            {s.email && <Row icon={<Mail size={16} />} label="Email" value={s.email} />}
            {s.address && (
              <Row icon={<MapPin size={16} />} label="Address" value={s.address} />
            )}
            {s.guardianName && (
              <Row
                icon={<User size={16} />}
                label="Guardian"
                value={`${s.guardianName}${s.guardianPhone ? ` · ${s.guardianPhone}` : ""}`}
              />
            )}
            {s.registrationDate && (
              <Row
                icon={<Calendar size={16} />}
                label="Registered"
                value={s.registrationDate}
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Last 30 days</h2>
            <span className="text-xs text-muted-foreground">
              {a.presentCount}/{a.totalCount} · {a.percentage}%
            </span>
          </div>
          {a.last30.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent attendance.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {a.last30.map((r) => (
                <li
                  key={r.date}
                  className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0"
                >
                  <span className="font-mono text-muted-foreground">{r.date}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      r.status === "Present"
                        ? "bg-success/15 text-success"
                        : r.status === "Absent"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}