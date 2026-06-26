import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ClipboardCheck, Save, X, Sheet as SheetIcon, QrCode, Nfc } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveAttendanceToSheets } from "@/lib/sheets.functions";
import { sendAttendanceWhatsApp } from "@/lib/whatsapp.functions";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/QRScanner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/lib/store";
import type { AttendanceStatus } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { todayStr } from "@/lib/metrics";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/attendance")({ component: AttendancePage });

const statusConfig: {
  value: AttendanceStatus;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  cls: string;
}[] = [
  { value: "Present", label: "Present", icon: Check, cls: "bg-success text-success-foreground" },
  { value: "Absent", label: "Absent", icon: X, cls: "bg-destructive text-destructive-foreground" },
];

function AttendancePage() {
  const {
    courses,
    batches,
    students,
    teachers,
    attendance,
    saveAttendance,
    subjectSheetIds,
    setSubjectSheetId,
  } = useData();
  const [courseId, setCourseId] = useState<string>(courses[0]?.id ?? "");
  const [batchId, setBatchId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [date, setDate] = useState<string>(todayStr());
  const [savingSheet, setSavingSheet] = useState(false);
  const [qrActive, setQrActive] = useState(false);
  const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
  const [nfcActive, setNfcActive] = useState(false);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const saveToSheetsFn = useServerFn(saveAttendanceToSheets);
  const sendWhatsAppFn = useServerFn(sendAttendanceWhatsApp);
  const notifyParents = true;

  const courseBatches = batches;
  const subjectTeachers = useMemo(
    () =>
      teachers.filter((t) => {
        const isMatch =
          t.subjectId === courseId || (t.subjectIds && t.subjectIds.includes(courseId));
        return isMatch && t.status === "Active";
      }),
    [teachers, courseId],
  );
  const roster = useMemo(
    () => students.filter((s) => s.batchId === batchId && s.status === "Active"),
    [students, batchId],
  );

  const existing = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const r of attendance)
      if (r.date === date && r.batchId === batchId) map[r.studentId] = r.status;
    return map;
  }, [attendance, date, batchId]);

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const effective = useMemo(() => {
    return { ...existing, ...marks };
  }, [existing, marks]);

  const handleStudentScanned = (id: string) => {
    setScannedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setMarks((prev) => ({
      ...prev,
      [id]: "Present",
    }));
  };

  const extractStudentIdFromText = (raw: string): string | null => {
    const t = raw.trim();
    if (!t) return null;
    const m = t.match(/\/checkin\/([A-Za-z0-9_\-]+)/i);
    if (m) return m[1];
    return t.replace(/^edvora_stu:/i, "");
  };

  const stopNfc = () => {
    nfcAbortRef.current?.abort();
    nfcAbortRef.current = null;
    setNfcActive(false);
  };

  const startNfcSession = async () => {
    if (!batchId) return toast.error("Please select a batch first!");
    const NDEFReaderCtor = (globalThis as any).NDEFReader as
      | { new (): { scan: (opts?: { signal?: AbortSignal }) => Promise<void>; onreading: any; onreadingerror: any } }
      | undefined;
    if (!NDEFReaderCtor) {
      return toast.error("Web NFC is not supported on this device. Use Chrome on Android.");
    }
    try {
      const reader = new NDEFReaderCtor();
      const ctrl = new AbortController();
      nfcAbortRef.current = ctrl;
      await reader.scan({ signal: ctrl.signal });

      // Default everyone Absent on session start
      const initial: Record<string, AttendanceStatus> = {};
      roster.forEach((s) => (initial[s.id] = "Absent"));
      setMarks((prev) => ({ ...prev, ...initial }));
      setScannedIds(new Set());
      setNfcActive(true);
      toast.info("NFC tap session active — tap student NFC tags to mark Present.", {
        duration: 5000,
      });

      reader.onreadingerror = () => toast.error("Couldn't read NFC tag — try again.");
      reader.onreading = (event: any) => {
        try {
          let candidate: string | null = null;
          for (const rec of event.message?.records ?? []) {
            if (rec.recordType === "url" || rec.recordType === "absolute-url") {
              const dec = new TextDecoder();
              candidate = dec.decode(rec.data);
            } else if (rec.recordType === "text") {
              const lang = rec.encoding || "utf-8";
              candidate = new TextDecoder(lang).decode(rec.data);
            }
            if (candidate) break;
          }
          if (!candidate && event.serialNumber) candidate = event.serialNumber;
          if (!candidate) return;
          const sid = extractStudentIdFromText(candidate);
          if (!sid) return;
          const match = roster.find((s) => s.studentId === sid || s.id === sid);
          if (!match) {
            toast.warning(`Tag "${sid}" is not in this batch roster.`);
            return;
          }
          if (scannedIds.has(match.id)) return;
          handleStudentScanned(match.id);
          if (navigator.vibrate) navigator.vibrate(80);
          toast.success(`Present: ${match.fullName}`);
        } catch (err) {
          console.error(err);
        }
      };
    } catch (e: any) {
      nfcAbortRef.current = null;
      setNfcActive(false);
      const msg = e?.message || "Failed to start NFC reader";
      toast.error(`NFC: ${msg}`);
    }
  };

  const startQrSession = () => {
    if (!batchId) {
      toast.error("Please select a batch first!");
      return;
    }
    // Start everyone on the active roster in the batch as ABSENT
    // Scanned students will dynamically toggle to PRESENT in real time
    const initialMarks: Record<string, AttendanceStatus> = {};
    roster.forEach((s) => {
      initialMarks[s.id] = "Absent";
    });
    setMarks((prev) => ({ ...prev, ...initialMarks }));
    setScannedIds(new Set());
    setQrActive(true);
    toast.info("QR scan session active! All batch students defaulted to Absent until checked in.", {
      duration: 5000,
    });
  };

  function mark(id: string, s: AttendanceStatus) {
    setMarks((m) => ({ ...m, [id]: s }));
  }
  function markAll(s: AttendanceStatus) {
    setMarks(Object.fromEntries(roster.map((r) => [r.id, s])));
  }

  function save() {
    if (!batchId) return toast.error("Select a batch first");
    if (!teacherId) return toast.error("Select a teacher first");
    const final: Record<string, AttendanceStatus> = {};
    for (const r of roster) final[r.id] = effective[r.id] ?? "Absent";
    saveAttendance(date, batchId, courseId, final, undefined, teacherId);
    setMarks({});
    toast.success(`Attendance saved for ${roster.length} students`);

    if (notifyParents) {
      const subject = courses.find((c) => c.id === courseId);
      const batch = batches.find((b) => b.id === batchId);
      const recipients = roster
        .filter((s) => (s.guardianPhone || "").trim().length > 0)
        .map((s) => ({
          studentName: s.fullName,
          studentCode: s.studentId,
          guardianName: s.guardianName,
          guardianPhone: s.guardianPhone,
          status: final[s.id],
        }));
      if (!recipients.length) {
        toast.info("No parent phone numbers on file — skipped WhatsApp notifications.");
        return;
      }
      toast.info(`Sending WhatsApp to ${recipients.length} parents…`);
      sendWhatsAppFn({
        data: {
          date,
          batchName: batch?.name ?? "",
          subjectName: subject?.name ?? "",
          collegeName: "EDVORA COLLEGE",
          recipients,
        },
      })
        .then((res) => {
          toast.success(
            `WhatsApp: ${res.sent} sent · ${res.skipped} skipped · ${res.failed} failed`,
          );
          if (res.errors?.length) console.warn("WAAPI errors:", res.errors);
        })
        .catch((e: Error) => toast.error(`WhatsApp failed: ${e.message}`));
    }
  }

  async function saveToSheets() {
    if (!batchId) return toast.error("Select a batch first");
    if (!courseId) return toast.error("Select a course first");
    const subject = courses.find((c) => c.id === courseId);
    const batch = batches.find((b) => b.id === batchId);
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!subject || !batch) return toast.error("Subject/Batch missing");
    const rows = roster.map((s) => ({
      date,
      studentId: s.studentId,
      name: s.fullName,
      status: (effective[s.id] ?? "Absent") as string,
      remarks: "",
      batch: batch.name,
      teacher: teacher?.fullName ?? "",
    }));
    if (!rows.length) return toast.error("No students to save");
    setSavingSheet(true);
    try {
      const month = date.slice(0, 7); // YYYY-MM
      const sheetKey = `${batchId}_${month}`;
      const res = await saveToSheetsFn({
        data: {
          spreadsheetId: subjectSheetIds[sheetKey] ?? null,
          subjectName: subject.name,
          batchName: batch.name,
          month,
          date,
          rows,
        },
      });
      setSubjectSheetId(sheetKey, res.spreadsheetId);
      toast.success(`Saved ${res.rowsSaved} rows to Google Sheets`, {
        action: { label: "Open", onClick: () => window.open(res.url, "_blank") },
      });
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err?.message ?? "Failed to save to Google Sheets");
    } finally {
      setSavingSheet(false);
    }
  }

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Unmarked: 0 };
    for (const r of roster) {
      const s = effective[r.id];
      if (s === "Present" || s === "Absent") {
        c[s]++;
      } else {
        c.Unmarked++;
      }
    }
    return c;
  }, [roster, effective]);

  return (
    <AppShell
      title="Mark Attendance"
      subtitle="Select a batch and date to record attendance for the session"
    >
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1">Course</div>
          <Select
            value={courseId}
            onValueChange={(v) => {
              setCourseId(v);
              setBatchId("");
              setMarks({});
              setQrActive(false);
              setScannedIds(new Set());
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1">Teacher</div>
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue
                placeholder={subjectTeachers.length ? "Select teacher" : "No teachers for subject"}
              />
            </SelectTrigger>
            <SelectContent>
              {subjectTeachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1">Batch</div>
          <Select
            value={batchId}
            onValueChange={(v) => {
              setBatchId(v);
              setMarks({});
              setQrActive(false);
              setScannedIds(new Set());
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent>
              {courseBatches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <div className="text-xs text-muted-foreground mb-1">Date</div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="w-full grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:ml-auto sm:flex-wrap">
          <Button
            variant="outline"
            onClick={startQrSession}
            disabled={!roster.length}
            className={cn(
              "w-full sm:w-auto border-dashed hover:border-primary/50 transition-colors",
              qrActive ? "bg-primary/10 border-primary text-primary" : "",
            )}
          >
            <QrCode size={15} /> {qrActive ? "Scanning active" : "Scan QR Codes"}
          </Button>
          <Button
            variant="outline"
            onClick={nfcActive ? stopNfc : startNfcSession}
            disabled={!roster.length}
            className={cn(
              "w-full sm:w-auto border-dashed hover:border-primary/50 transition-colors",
              nfcActive ? "bg-primary/10 border-primary text-primary" : "",
            )}
          >
            <Nfc size={15} /> {nfcActive ? "Tap session active" : "Tap to Mark (NFC)"}
          </Button>
          <Button
            variant="outline"
            onClick={() => markAll("Present")}
            disabled={!roster.length}
            className="w-full sm:w-auto"
          >
            <Check size={15} /> All Present
          </Button>
          <Button
            variant="outline"
            onClick={() => markAll("Absent")}
            disabled={!roster.length}
            className="w-full sm:w-auto"
          >
            <X size={15} /> All Absent
          </Button>
          <Button
            onClick={save}
            disabled={!roster.length}
            className="w-full sm:w-auto gradient-primary text-primary-foreground"
          >
            <Save size={15} /> Save
          </Button>
          <Button
            onClick={saveToSheets}
            disabled={!roster.length || savingSheet}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <SheetIcon size={15} /> {savingSheet ? "Saving…" : "Save to Sheets"}
          </Button>
        </div>
      </div>

      {batchId && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { k: "Total", v: roster.length, c: "text-foreground" },
            { k: "Present", v: counts.Present, c: "text-success" },
            { k: "Absent", v: counts.Absent, c: "text-destructive" },
            { k: "Unmarked", v: counts.Unmarked, c: "text-muted-foreground" },
          ].map((it) => (
            <div key={it.k} className="glass-card rounded-xl p-3 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{it.k}</div>
              <div className={cn("text-2xl font-bold mt-1", it.c)}>{it.v}</div>
            </div>
          ))}
        </div>
      )}

      {qrActive && batchId && (
        <div className="mt-4">
          <QRScanner
            roster={roster}
            onStudentScanned={handleStudentScanned}
            scannedIds={scannedIds}
            onClose={() => setQrActive(false)}
          />
        </div>
      )}

      <motion.div layout className="mt-4 glass-card rounded-2xl overflow-hidden">
        {!batchId ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Select a course and batch"
            description="Choose a batch above to load its roster and start marking attendance."
          />
        ) : roster.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No active students in this batch" />
        ) : (
          <div className="divide-y divide-border">
            {roster.map((s, i) => {
              const cur = effective[s.id];
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015 }}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/40"
                >
                  <img src={s.photoUrl} alt="" className="w-10 h-10 rounded-full bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.fullName}</div>
                    <div className="text-xs text-muted-foreground">{s.studentId}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {statusConfig.map((sc) => (
                      <button
                        key={sc.value}
                        onClick={() => mark(s.id, sc.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                          cur === sc.value
                            ? `${sc.cls} border-transparent shadow-elegant`
                            : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary",
                        )}
                      >
                        <sc.icon size={13} /> <span className="hidden sm:inline">{sc.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </AppShell>
  );
}
