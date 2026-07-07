import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { History, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useData } from "@/lib/store";
import type { AttendanceStatus } from "@/lib/types";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/history")({ component: HistoryPage,
  head: () => ({
    meta: [
      { title: "Attendance History · EDVORA COLLEGE" },
      { name: "description", content: "Browse and edit historical attendance records for EDVORA COLLEGE classes." },
      { property: "og:title", content: "Attendance History · EDVORA COLLEGE" },
      { property: "og:description", content: "Browse and edit historical attendance records for EDVORA COLLEGE classes." },
      { property: "og:url", content: "https://edvoracollege.lovable.app/history" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://edvoracollege.lovable.app/history" }],
  }) });

function HistoryPage() {
  const { attendance, students, batches, courses, deleteAttendanceRecord, updateAttendanceRecord } =
    useData();
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [course, setCourse] = useState("all");
  const [batch, setBatch] = useState("all");

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const sMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const bMap = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const cMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const filtered = useMemo(() => {
    return attendance
      .filter((r) => {
        const s = sMap.get(r.studentId);
        if (q && !`${s?.fullName} ${s?.studentId}`.toLowerCase().includes(q.toLowerCase()))
          return false;
        if (date && r.date !== date) return false;
        if (course !== "all" && r.courseId !== course) return false;
        if (batch !== "all" && r.batchId !== batch) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 300);
  }, [attendance, q, date, course, batch, sMap]);

  return (
    <AppShell title="Attendance History" subtitle={`${attendance.length} records on file`}>
      <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student"
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-[180px]"
        />
        <Select value={course} onValueChange={setCourse}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={batch} onValueChange={setBatch}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All batches</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 glass-card rounded-2xl overflow-hidden"
      >
        {filtered.length === 0 ? (
          <EmptyState icon={History} title="No records match" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 hidden md:table-cell">Course</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Batch</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const s = sMap.get(r.studentId);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-secondary/40">
                      <td className="px-4 py-3 font-mono text-xs">{r.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={s?.photoUrl}
                            alt=""
                            className="w-8 h-8 rounded-full bg-secondary"
                          />
                          <div>
                            <div className="font-medium">{s?.fullName}</div>
                            <div className="text-xs text-muted-foreground">{s?.studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {cMap.get(r.courseId)?.name}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {bMap.get(r.batchId)?.name}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={r.status}
                          onValueChange={(v) => {
                            updateAttendanceRecord(r.id, { status: v as AttendanceStatus });
                            toast.success("Updated");
                          }}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["Present", "Absent"] as AttendanceStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>
                                <StatusBadge status={s} />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete attendance record"
                          onClick={() => {
                            setRecordToDelete(r.id);
                            setDeleteConfirmationOpen(true);
                          }}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* DELETE RECORD CONFIRMATION DIALOG */}
      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5 animate-pulse">
              <Trash2 size={18} />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete this attendance record? This will permanently remove
              it from the historical attendance database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-9 font-semibold text-xs rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (recordToDelete) {
                  deleteAttendanceRecord(recordToDelete);
                  toast.success("Attendance record removed.");
                  setRecordToDelete(null);
                  setDeleteConfirmationOpen(false);
                }
              }}
              className="h-9 font-bold text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl cursor-pointer"
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
