import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Loader2, GraduationCap } from "lucide-react";
import { markCheckinByStudentId } from "@/lib/checkin.functions";

export const Route = createFileRoute("/checkin/$studentId")({
  component: CheckinPage,
  head: () => ({
    meta: [
      { title: "Check-in · EDVORA COLLEGE" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type State =
  | { kind: "loading" }
  | { kind: "ok"; name: string; sid: string; date: string; already: boolean }
  | { kind: "error"; message: string };

function CheckinPage() {
  const { studentId } = Route.useParams();
  const fn = useServerFn(markCheckinByStudentId);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fn({ data: { studentId } });
        if (cancelled) return;
        setState({
          kind: "ok",
          name: res.student.fullName,
          sid: res.student.studentId,
          date: res.date,
          already: res.alreadyPresent,
        });
        if (navigator.vibrate) navigator.vibrate(120);
      } catch (e) {
        const err = e as Error;
        if (!cancelled) setState({ kind: "error", message: err?.message ?? "Check-in failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, fn]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider mb-4">
          <GraduationCap size={18} />
          EDVORA COLLEGE
        </div>

        {state.kind === "loading" && (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 size={42} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Marking your attendance…</p>
          </div>
        )}

        {state.kind === "ok" && (
          <div className="py-6 flex flex-col items-center gap-3">
            <CheckCircle2 size={64} className="text-success" />
            <h1 className="text-xl font-bold text-foreground">
              {state.already ? "Already Checked In" : "Attendance Marked"}
            </h1>
            <p className="text-base font-medium text-foreground">{state.name}</p>
            <p className="text-xs font-mono text-muted-foreground">{state.sid}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Present · {state.date}
            </p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="py-6 flex flex-col items-center gap-3">
            <XCircle size={64} className="text-destructive" />
            <h1 className="text-xl font-bold text-foreground">Check-in failed</h1>
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <p className="text-xs font-mono text-muted-foreground mt-2">ID: {studentId}</p>
          </div>
        )}
      </div>
    </div>
  );
}