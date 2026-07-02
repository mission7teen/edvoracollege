import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Award, Plus, Trash2, Save, ArrowLeft, ClipboardPaste } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useData, computeGrade } from "@/lib/store";
import type { ExamType } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exams")({
  component: ExamsPage,
});

function ExamsPage() {
  const exams = useData((s) => s.exams);
  const courses = useData((s) => s.courses);
  const batches = useData((s) => s.batches);
  const students = useData((s) => s.students);
  const examMarks = useData((s) => s.examMarks);
  const addExam = useData((s) => s.addExam);
  const deleteExam = useData((s) => s.deleteExam);
  const saveExamMarks = useData((s) => s.saveExamMarks);

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "Monthly" as ExamType,
    subjectId: "",
    batchId: "",
    date: new Date().toISOString().slice(0, 10),
    maxMarks: 100,
  });

  const selectedExam = useMemo(
    () => exams.find((e) => e.id === selectedExamId) || null,
    [exams, selectedExamId],
  );

  if (selectedExam) {
    return (
      <MarksEntry
        examId={selectedExam.id}
        onBack={() => setSelectedExamId(null)}
      />
    );
  }

  const handleCreate = () => {
    if (!form.name.trim() || !form.subjectId || !form.batchId) {
      toast.error("Name, subject, and batch are required");
      return;
    }
    const id = addExam({
      name: form.name.trim(),
      type: form.type,
      subjectId: form.subjectId,
      batchId: form.batchId,
      date: form.date,
      maxMarks: Number(form.maxMarks) || 100,
    });
    toast.success("Exam created");
    setDialogOpen(false);
    setSelectedExamId(id);
  };

  return (
    <AppShell title="Exam Marks" subtitle="Create exams and enter marks per subject and batch">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Award className="text-primary" />
          <h2 className="text-lg font-bold">All Exams</h2>
          <span className="text-xs text-muted-foreground">({exams.length})</span>
        </div>
        <Button className="gap-1 gradient-primary text-primary-foreground" onClick={() => setDialogOpen(true)}>
          <Plus size={16} /> New Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Award className="mx-auto text-muted-foreground" size={40} />
          <p className="mt-3 font-semibold">No exams yet</p>
          <p className="text-sm text-muted-foreground">Create your first exam to start entering marks.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Entries</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((e) => {
                const subj = courses.find((c) => c.id === e.subjectId)?.name || "—";
                const bat = batches.find((b) => b.id === e.batchId)?.name || "—";
                const count = examMarks.filter((m) => m.examId === e.id).length;
                return (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelectedExamId(e.id)}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {e.type}
                      </span>
                    </TableCell>
                    <TableCell>{subj}</TableCell>
                    <TableCell>{bat}</TableCell>
                    <TableCell className="font-mono text-xs">{e.date}</TableCell>
                    <TableCell>{e.maxMarks}</TableCell>
                    <TableCell>{count}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (confirm(`Delete exam "${e.name}"? This will remove all marks.`)) {
                            deleteExam(e.id);
                            toast.success("Exam deleted");
                          }
                        }}
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Exam</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Exam Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Term 1 Test"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as ExamType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Term">Term</SelectItem>
                    <SelectItem value="Final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input
                  type="number"
                  value={form.maxMarks}
                  onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Select
                value={form.subjectId}
                onValueChange={(v) => setForm({ ...form, subjectId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Batch</Label>
              <Select
                value={form.batchId}
                onValueChange={(v) => setForm({ ...form, batchId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create & Enter Marks</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function MarksEntry({ examId, onBack }: { examId: string; onBack: () => void }) {
  const exam = useData((s) => s.exams.find((e) => e.id === examId))!;
  const students = useData((s) => s.students);
  const existingMarks = useData((s) => s.examMarks);
  const courses = useData((s) => s.courses);
  const batches = useData((s) => s.batches);
  const saveExamMarks = useData((s) => s.saveExamMarks);

  const roster = useMemo(
    () =>
      students
        .filter((s) => s.batchId === exam.batchId && s.status === "Active")
        .sort((a, b) => a.studentId.localeCompare(b.studentId, undefined, { numeric: true })),
    [students, exam.batchId],
  );

  const initial = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of roster) {
      const em = existingMarks.find((x) => x.examId === examId && x.studentId === s.id);
      m[s.id] = em ? String(em.marks) : "";
    }
    return m;
  }, [roster, existingMarks, examId]);

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const subject = courses.find((c) => c.id === exam.subjectId)?.name || "";
  const batch = batches.find((b) => b.id === exam.batchId)?.name || "";

  const openImport = () => {
    // Prefill with current roster as template: StudentID<TAB>Name<TAB>Marks
    const template = roster
      .map((s) => `${s.studentId}\t${s.fullName}\t${values[s.id] ?? ""}`)
      .join("\n");
    setImportText(template);
    setImportOpen(true);
  };

  const applyImport = () => {
    const lines = importText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const next: Record<string, string> = { ...values };
    let matched = 0;
    let unknown = 0;
    for (const line of lines) {
      const parts = line.split(/\t|,|;/).map((p) => p.trim());
      if (parts.length === 0) continue;
      // Skip header row
      if (/student/i.test(parts[0]) && /mark/i.test(parts[parts.length - 1])) continue;
      const sid = parts[0];
      const marksRaw = parts[parts.length - 1];
      if (!sid || marksRaw === "") continue;
      const stu = roster.find((s) => s.studentId === sid);
      if (!stu) { unknown++; continue; }
      const n = Number(marksRaw);
      if (Number.isNaN(n)) continue;
      next[stu.id] = String(n);
      matched++;
    }
    setValues(next);
    setImportOpen(false);
    toast.success(`Imported ${matched} marks${unknown ? ` · ${unknown} unknown IDs skipped` : ""}`);
  };

  const handleSave = () => {
    const parsed: Record<string, number> = {};
    for (const [sid, v] of Object.entries(values)) {
      if (v === "" || v === null) continue;
      const n = Number(v);
      if (Number.isNaN(n) || n < 0 || n > exam.maxMarks) {
        const stu = roster.find((s) => s.id === sid);
        toast.error(`Invalid mark for ${stu?.fullName || sid} (0-${exam.maxMarks})`);
        return;
      }
      parsed[sid] = n;
    }
    saveExamMarks(examId, parsed);
    toast.success(`Saved ${Object.keys(parsed).length} marks`);
  };

  return (
    <AppShell title={exam.name} subtitle={`${subject} · ${batch} · Max ${exam.maxMarks}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ArrowLeft size={14} /> Back
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" onClick={openImport} className="gap-1">
            <ClipboardPaste size={14} /> Bulk Import
          </Button>
          <Button className="gap-1 gradient-primary text-primary-foreground" onClick={handleSave}>
            <Save size={14} /> Save
          </Button>
        </div>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Marks</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Paste from Google Sheets / Excel. Format per row: <code>StudentID [Tab] Name [Tab] Marks</code>.
              Only <b>Student ID</b> (first column) and <b>Marks</b> (last column) are used. Comma and semicolon are also accepted.
            </p>
            <Textarea
              rows={14}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="font-mono text-xs"
              placeholder={"S001\tJohn Doe\t85\nS002\tJane Smith\t72"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={applyImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {roster.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No active students in this batch.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-40">Marks (of {exam.maxMarks})</TableHead>
                <TableHead className="w-24">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((s) => {
                const v = values[s.id] ?? "";
                const n = Number(v);
                const grade = v !== "" && !Number.isNaN(n) ? computeGrade(n, exam.maxMarks) : "";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.studentId}</TableCell>
                    <TableCell>{s.fullName}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={exam.maxMarks}
                        value={v}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {grade && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {grade}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}