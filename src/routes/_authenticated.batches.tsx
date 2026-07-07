import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
import type { Batch } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/batches")({ component: BatchesPage,
  head: () => ({
    meta: [
      { title: "Batches · EDVORA COLLEGE" },
      { name: "description", content: "Manage class batches and cohorts at EDVORA COLLEGE." },
      { property: "og:title", content: "Batches · EDVORA COLLEGE" },
      { property: "og:description", content: "Manage class batches and cohorts at EDVORA COLLEGE." },
      { property: "og:url", content: "https://edvoracollege.lovable.app/batches" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://edvoracollege.lovable.app/batches" }],
  }) });

const empty: Omit<Batch, "id"> = {
  name: "",
  code: "",
  courseId: "",
  academicYear: "",
  schedule: "",
};

function BatchesPage() {
  const { batches, students, addBatch, updateBatch, deleteBatch } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [form, setForm] = useState(empty);

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.code) return toast.error("Name and code are required");
    if (editing) {
      updateBatch(editing.id, form);
      toast.success("Batch updated");
    } else {
      addBatch(form);
      toast.success("Batch created");
    }
    setOpen(false);
    setEditing(null);
    setForm(empty);
  }

  return (
    <AppShell title="Batches" subtitle={`${batches.length} batches`}>
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
              <Plus size={16} /> New batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit batch" : "New batch"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <F label="Batch name *">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </F>
              <F label="Batch code *">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </F>
              <F label="Academic year">
                <Input
                  value={form.academicYear}
                  onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  placeholder="2025/2026"
                />
              </F>
              <div className="col-span-2">
                <F label="Schedule">
                  <Input
                    value={form.schedule}
                    onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                    placeholder="Mon-Fri 8:00 AM - 12:00 PM"
                  />
                </F>
              </div>
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
        {batches.map((b, i) => {
          const stu = students.filter((s) => s.batchId === b.id);
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card rounded-2xl p-5 group"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl gradient-primary grid place-items-center text-primary-foreground shadow-elegant">
                  <Layers size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(b);
                      setForm(b);
                      setOpen(true);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setBatchToDelete(b);
                      setDeleteConfirmationOpen(true);
                    }}
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {b.code}
                </div>
                <h3 className="font-bold text-lg">{b.name}</h3>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{b.schedule}</div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-muted-foreground">AY</span> ·{" "}
                  <span className="font-semibold">{b.academicYear}</span>
                </div>
                <div className="flex -space-x-2">
                  {stu.slice(0, 5).map((s) => (
                    <img
                      key={s.id}
                      src={s.photoUrl}
                      alt=""
                      className="w-7 h-7 rounded-full border-2 border-card bg-secondary"
                    />
                  ))}
                  {stu.length > 5 && (
                    <div className="w-7 h-7 rounded-full border-2 border-card bg-secondary text-[10px] grid place-items-center font-semibold">
                      +{stu.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* DELETE BATCH CONFIRMATION DIALOG */}
      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5 animate-pulse">
              <Trash2 size={18} />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete the batch{" "}
              <strong className="text-foreground">"{batchToDelete?.name}"</strong>? This will
              permanently remove it from records and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-9 font-semibold text-xs rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (batchToDelete) {
                  deleteBatch(batchToDelete.id);
                  toast.success(`Batch "${batchToDelete.name}" deleted successfully.`);
                  setBatchToDelete(null);
                  setDeleteConfirmationOpen(false);
                }
              }}
              className="h-9 font-bold text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl cursor-pointer"
            >
              Delete Batch
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
