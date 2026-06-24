import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
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
import { StatusBadge } from "@/components/StatusBadge";
import { useData } from "@/lib/store";
import type { Teacher } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teachers")({ component: TeachersPage });

const empty: Omit<Teacher, "id"> & { subjectIds?: string[] } = {
  fullName: "",
  photoUrl: "",
  email: "",
  phone: "",
  qualification: "",
  subjectId: "",
  subjectIds: [],
  joinedDate: new Date().toISOString().slice(0, 10),
  status: "Active",
};

function TeachersPage() {
  const { teachers, courses, addTeacher, updateTeacher, deleteTeacher } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState(empty);

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  const subjectMap = new Map(courses.map((c) => [c.id, c]));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalSubjectIds = form.subjectIds || (form.subjectId ? [form.subjectId] : []);
    if (!form.fullName) return toast.error("Full name is required");
    if (finalSubjectIds.length === 0) return toast.error("At least one subject is required");

    const payload = {
      ...form,
      subjectId: finalSubjectIds[0] || "",
      subjectIds: finalSubjectIds,
      photoUrl:
        form.photoUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.fullName)}`,
    };
    if (editing) {
      updateTeacher(editing.id, payload);
      toast.success("Teacher updated");
    } else {
      addTeacher(payload);
      toast.success("Teacher added");
    }
    setOpen(false);
    setEditing(null);
    setForm(empty);
  }

  return (
    <AppShell
      title="Teachers"
      subtitle={`${teachers.length} faculty members teaching ${courses.length} subjects`}
    >
      <div className="flex justify-end mb-4">
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditing(null);
              setForm(empty);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus size={16} /> New teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit teacher" : "New teacher"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <F label="Full name *">
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </F>
              <F label="Photo URL">
                <Input
                  value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  placeholder="https://…"
                />
              </F>
              <F label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </F>
              <F label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </F>
              <div className="col-span-2">
                <F label="Qualification">
                  <Input
                    value={form.qualification}
                    onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                    placeholder="e.g. B.Com (Hons), CA (SL)"
                  />
                </F>
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Subjects Taught * (Select all that apply)
                </Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {courses.map((c) => {
                    const isSelected = form.subjectIds?.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          const current = form.subjectIds || [];
                          let next: string[];
                          if (current.includes(c.id)) {
                            next = current.filter((id) => id !== c.id);
                          } else {
                            next = [...current, c.id];
                          }
                          setForm({
                            ...form,
                            subjectIds: next,
                            subjectId: next[0] || "",
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                        }`}
                      >
                        {isSelected && <span className="text-[10px]">✓</span>}
                        <span>{c.name}</span>
                        <span className="text-[10px] opacity-60">({c.code})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <F label="Joined date">
                <Input
                  type="date"
                  value={form.joinedDate}
                  onChange={(e) => setForm({ ...form, joinedDate: e.target.value })}
                />
              </F>
              <F label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Teacher["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <DialogFooter className="col-span-2">
                <Button type="submit" className="gradient-primary text-primary-foreground">
                  {editing ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teachers.map((t, i) => {
          const subjects =
            t.subjectIds && t.subjectIds.length > 0
              ? t.subjectIds
              : t.subjectId
                ? [t.subjectId]
                : [];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card rounded-2xl p-5 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={t.photoUrl}
                    alt=""
                    className="w-14 h-14 rounded-2xl bg-secondary object-cover"
                  />
                  <div>
                    <h3 className="font-bold text-base leading-tight">{t.fullName}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {subjects.map((sid) => {
                        const sub = subjectMap.get(sid);
                        if (!sub) return null;
                        return (
                          <span
                            key={sid}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-primary/5 text-primary border border-primary/15"
                            title={sub.name}
                          >
                            {sub.code}
                          </span>
                        );
                      })}
                      {subjects.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(t);
                      setForm({
                        ...t,
                        subjectIds:
                          t.subjectIds && t.subjectIds.length > 0
                            ? t.subjectIds
                            : t.subjectId
                              ? [t.subjectId]
                              : [],
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setTeacherToDelete(t);
                      setDeleteConfirmationOpen(true);
                    }}
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 flex items-start gap-2">
                <GraduationCap size={14} className="mt-0.5 shrink-0" /> {t.qualification || "—"}
              </p>
              <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail size={13} /> <span className="truncate">{t.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone size={13} /> {t.phone || "—"}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground">Joined {t.joinedDate}</div>
            </motion.div>
          );
        })}
      </div>

      {/* DELETE TEACHER CONFIRMATION DIALOG */}
      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5 animate-pulse">
              <Trash2 size={18} />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete teacher{" "}
              <strong className="text-foreground">"{teacherToDelete?.fullName}"</strong>? This will
              permanently remove their record from the college platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-9 font-semibold text-xs rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (teacherToDelete) {
                  deleteTeacher(teacherToDelete.id);
                  toast.success(`Teacher "${teacherToDelete.fullName}" removed successfully.`);
                  setTeacherToDelete(null);
                  setDeleteConfirmationOpen(false);
                }
              }}
              className="h-9 font-bold text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl cursor-pointer"
            >
              Delete Teacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
