import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Eye,
  Users,
  Download,
  QrCode as QrIcon,
  FileSpreadsheet,
  Nfc,
  Copy,
} from "lucide-react";
import QRCode from "qrcode";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { StudentCSVImporter } from "@/components/StudentCSVImporter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { Student } from "@/lib/types";
import { toast } from "sonner";
import { exportCSV } from "@/lib/exporters";
import { studentRate } from "@/lib/metrics";

export const Route = createFileRoute("/_authenticated/students")({
  component: StudentsPage,
});

const empty: Omit<Student, "id" | "studentId" | "registrationDate"> = {
  fullName: "",
  photoUrl: "",
  gender: "Male",
  dob: "",
  nic: "",
  phone: "",
  email: "",
  address: "",
  guardianName: "",
  guardianPhone: "",
  courseId: "",
  batchId: "",
  status: "Active",
};

function QuickQR({ text, size = 150 }: { text: string; size?: number }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(
      text,
      {
        width: size,
        margin: 1,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      },
      (err, url) => {
        if (!err) setSrc(url);
      },
    );
  }, [text, size]);

  if (!src) {
    return (
      <div
        className="animate-pulse bg-secondary rounded mx-auto"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <img src={src} alt="student qr" className="mx-auto rounded border border-border p-1 bg-white" />
  );
}

function StudentsPage() {
  const { students, courses, batches, attendance, addStudent, updateStudent, deleteStudent } =
    useData();
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [editing, setEditing] = useState<Student | null>(null);
  const [viewing, setViewing] = useState<Student | null>(null);
  const [viewingQR, setViewingQR] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const handleBulkImport = (newStudents: Omit<Student, "id" | "registrationDate">[]) => {
    newStudents.forEach((student) => {
      addStudent(student);
    });
  };

  const downloadQR = async (s: Student) => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/checkin/${s.studentId}`
          : `/checkin/${s.studentId}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${s.fullName.replace(/\s+/g, "_")}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded QR Code for ${s.fullName}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate QR code download");
    }
  };

  const copyNfcLink = async (s: Student) => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/checkin/${s.studentId}`
        : `/checkin/${s.studentId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("NFC link copied — write it to the student's NFC tag");
    } catch {
      toast.error("Copy failed");
    }
  };

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        const ql = q.toLowerCase();
        if (ql && !`${s.fullName} ${s.studentId} ${s.email} ${s.phone}`.toLowerCase().includes(ql))
          return false;
        if (batch !== "all" && s.batchId !== batch) return false;
        if (status !== "all" && s.status !== status) return false;
        return true;
      }),
    [students, q, batch, status],
  );

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const batchMap = new Map(batches.map((b) => [b.id, b]));

  function openAdd() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(s: Student) {
    setEditing(s);
    setForm({ ...s });
    setOpen(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName || !form.batchId) {
      toast.error("Name and batch are required");
      return;
    }
    if (editing) {
      updateStudent(editing.id, form);
      toast.success("Student updated");
    } else {
      addStudent({
        ...form,
        photoUrl:
          form.photoUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.fullName)}`,
      });
      toast.success("Student added");
    }
    setOpen(false);
  }
  function remove(s: Student) {
    setStudentToDelete(s);
    setDeleteConfirmationOpen(true);
  }

  function exportList() {
    exportCSV(
      "edvora-students.csv",
      filtered.map((s) => ({
        StudentID: s.studentId,
        Name: s.fullName,
        Gender: s.gender,
        DOB: s.dob,
        Email: s.email,
        Phone: s.phone,
        Course: courseMap.get(s.courseId)?.name ?? "",
        Batch: batchMap.get(s.batchId)?.name ?? "",
        Status: s.status,
      })),
    );
  }

  return (
    <AppShell
      title="Students"
      subtitle={`${students.length} enrolled · ${students.filter((s) => s.status === "Active").length} active`}
    >
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, ID, email…"
            className="pl-9 h-10"
          />
        </div>
        <Select value={batch} onValueChange={setBatch}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Batch" />
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportList}>
          <Download size={16} /> Export
        </Button>
        <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-dashed hover:border-primary/50 text-foreground cursor-pointer"
            >
              <FileSpreadsheet size={16} /> Import CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Bulk Student Onboarding via CSV</DialogTitle>
            </DialogHeader>
            <StudentCSVImporter
              courses={courses}
              batches={batches}
              existingStudents={students}
              onImport={handleBulkImport}
              onClose={() => setCsvDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="gradient-primary text-primary-foreground">
              <Plus size={16} /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit student" : "Add new student"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name *">
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </Field>
              <Field label="Photo URL">
                <Input
                  value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Gender">
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v as Student["gender"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date of birth">
                <Input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
              </Field>
              <Field label="NIC / Passport">
                <Input
                  value={form.nic}
                  onChange={(e) => setForm({ ...form, nic: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
              <Field label="Guardian">
                <Input
                  value={form.guardianName}
                  onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                />
              </Field>
              <Field label="Guardian Phone">
                <Input
                  value={form.guardianPhone}
                  onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                />
              </Field>
              <Field label="Batch *">
                <Select
                  value={form.batchId}
                  onValueChange={(v) => {
                    const b = batches.find((x) => x.id === v);
                    setForm({ ...form, batchId: v, courseId: b?.courseId ?? "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Student["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground">
                  {editing ? "Save changes" : "Create student"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 glass-card rounded-2xl overflow-hidden"
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students match"
            description="Try adjusting your search or filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3 hidden md:table-cell">Course</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Batch</th>
                  <th className="px-4 py-3 hidden md:table-cell">Attendance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const rate = studentRate(attendance, s.id);
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-border hover:bg-secondary/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={s.photoUrl}
                            alt=""
                            className="w-9 h-9 rounded-full bg-secondary"
                          />
                          <div>
                            <div className="font-medium">{s.fullName}</div>
                            <div className="text-xs text-muted-foreground">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{s.studentId}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {courseMap.get(s.courseId)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {batchMap.get(s.batchId)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full gradient-primary"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Student QR Pass"
                            onClick={() => setViewingQR(s)}
                          >
                            <QrIcon size={15} className="text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setViewing(s)}>
                            <Eye size={15} />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                            <Pencil size={15} />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(s)}>
                            <Trash2 size={15} className="text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student profile</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
              <div className="md:col-span-8 space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={viewing.photoUrl}
                    alt=""
                    className="w-16 h-16 rounded-full bg-secondary object-cover border"
                  />
                  <div>
                    <div className="text-lg font-semibold leading-snug">{viewing.fullName}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {viewing.studentId} · {viewing.gender}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={viewing.status} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                  <Info label="Email" value={viewing.email || "—"} />
                  <Info label="Phone" value={viewing.phone || "—"} />
                  <Info label="DOB" value={viewing.dob || "—"} />
                  <Info label="NIC" value={viewing.nic || "—"} />
                  <Info label="Address" value={viewing.address || "—"} />
                  <Info label="Course" value={courseMap.get(viewing.courseId)?.name ?? "—"} />
                  <Info label="Batch" value={batchMap.get(viewing.batchId)?.name ?? "—"} />
                  <Info
                    label="Guardian"
                    value={
                      viewing.guardianName
                        ? `${viewing.guardianName} (${viewing.guardianPhone || "—"})`
                        : "—"
                    }
                  />
                  <Info label="Registered" value={viewing.registrationDate || "—"} />
                  <Info label="Attendance" value={`${studentRate(attendance, viewing.id)}%`} />
                </div>
              </div>

              {/* Profile QR Card Block */}
              <div className="md:col-span-4 border border-border/80 rounded-2xl p-4 bg-secondary/15 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">
                  Digital ID · NFC Link QR
                </span>
                <QuickQR
                  text={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/checkin/${viewing.studentId}`
                      : `/checkin/${viewing.studentId}`
                  }
                  size={130}
                />
                <span className="text-[11px] font-mono text-muted-foreground break-all">
                  {viewing.studentId}
                </span>
                <div className="w-full grid grid-cols-2 gap-1.5 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-7"
                    onClick={() => downloadQR(viewing)}
                  >
                    <Download size={12} className="mr-1" /> QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-7"
                    onClick={() => copyNfcLink(viewing)}
                  >
                    <Nfc size={12} className="mr-1" /> NFC link
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verified QR Pass Passport Modal */}
      <Dialog open={!!viewingQR} onOpenChange={(v) => !v && setViewingQR(null)}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-[24px] p-6 border border-border/60 shadow-2xl bg-gradient-to-b from-card to-secondary/10">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-base tracking-tight text-foreground">
              Verified Student Pass
            </DialogTitle>
          </DialogHeader>
          {viewingQR && (
            <div className="text-center space-y-5 py-2">
              <div className="relative overflow-hidden bg-card border border-border/85 rounded-xl p-4 shadow-sm space-y-4">
                <div className="text-[10px] uppercase tracking-widest text-primary font-mono font-bold border-b border-border pb-1.5">
                  EDVORA COLLEGE · ID CARD
                </div>

                <div className="flex flex-col items-center">
                  <img
                    src={viewingQR.photoUrl}
                    alt=""
                    className="w-16 h-16 rounded-full border-2 border-primary object-cover bg-secondary p-0.5"
                  />
                  <h3 className="text-sm font-bold text-foreground mt-2 leading-tight">
                    {viewingQR.fullName}
                  </h3>
                  <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase mt-0.5">
                    StudentID: {viewingQR.studentId}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {batchMap.get(viewingQR.batchId)?.name ?? "—"}
                  </p>
                </div>

                <div className="py-1">
                  <QuickQR text={viewingQR.studentId} size={140} />
                </div>

                <div className="text-[9px] text-muted-foreground font-mono leading-none">
                  SCAN FROM ATTENDANCE PAGE TO CHECK-IN
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setViewingQR(null)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs gradient-primary text-primary-foreground font-medium"
                  onClick={() => downloadQR(viewingQR)}
                >
                  <Download size={13} className="mr-1.5" /> Download QR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE STUDENT CONFIRMATION DIALOG */}
      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5 animate-pulse">
              <Trash2 size={18} />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete student{" "}
              <strong className="text-foreground">"{studentToDelete?.fullName}"</strong>? This will
              permanently remove their record and attendance history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-9 font-semibold text-xs rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (studentToDelete) {
                  deleteStudent(studentToDelete.id);
                  toast.success(`Student "${studentToDelete.fullName}" removed successfully.`);
                  setStudentToDelete(null);
                  setDeleteConfirmationOpen(false);
                }
              }}
              className="h-9 font-bold text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl cursor-pointer"
            >
              Delete Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}
