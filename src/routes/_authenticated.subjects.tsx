import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Layers,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  Clock,
  Tag,
  FolderPlus,
  Briefcase,
  Users,
  Search,
  HelpCircle,
  FolderOpen,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Course } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/subjects")({
  component: SubjectsPage,
  head: () => ({
    meta: [
      { title: "Subjects · EDVORA COLLEGE" },
      { name: "description", content: "Manage subjects and courses offered at EDVORA COLLEGE." },
      { property: "og:title", content: "Subjects · EDVORA COLLEGE" },
      { property: "og:description", content: "Manage subjects and courses offered at EDVORA COLLEGE." },
      { property: "og:url", content: "https://edvoracollege.lovable.app/subjects" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://edvoracollege.lovable.app/subjects" }],
  }),
});

interface SubjectRow {
  name: string;
  code: string;
  description: string;
}

const defaultSubjectRow = (): SubjectRow => ({
  name: "",
  code: "",
  description: "",
});

export function SubjectsPage() {
  const courses = useData((s) => s.courses);
  const addCourse = useData((s) => s.addCourse);
  const updateCourse = useData((s) => s.updateCourse);
  const deleteCourse = useData((s) => s.deleteCourse);
  const batches = useData((s) => s.batches);
  const teachers = useData((s) => s.teachers);

  // Search and filter keys
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("ALL_GROUPS");

  // Multi-Creation & Single Dialog State
  const [multiDialogOpen, setMultiDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Multi-creation wizard states
  const [groupSelectionType, setGroupSelectionType] = useState<"existing" | "new">("new");
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  // Common subject metadata
  const [commonDuration, setCommonDuration] = useState("2 Years (A/L)");
  const [commonStartDate, setCommonStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [commonEndDate, setCommonEndDate] = useState("2026-12-15");

  // List of dynamic subject input lines
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([defaultSubjectRow()]);

  // Edit single subject state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingForm, setEditingForm] = useState<Omit<Course, "id">>({
    name: "",
    code: "",
    description: "",
    duration: "2 Years (A/L)",
    startDate: "",
    endDate: "",
    group: "General",
  });

  // Safe delete confirmation state
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; name: string } | null>(null);

  // Calculate unique existing groups from courses
  const existingGroups = useMemo(() => {
    const groups = new Set<string>();
    courses.forEach((c) => {
      if (c.group) {
        groups.add(c.group);
      }
    });
    return Array.from(groups).sort();
  }, [courses]);

  // Set initial selected existing group for new inputs if available
  const handleOpenMultiDialog = () => {
    if (existingGroups.length > 0) {
      setSelectedGroupName(existingGroups[0]);
      setGroupSelectionType("existing");
    } else {
      setGroupSelectionType("new");
    }
    setNewGroupName("");
    setCommonDuration("2 Years (A/L)");
    setCommonStartDate(new Date().toISOString().slice(0, 10));
    setCommonEndDate("2026-12-15");
    setSubjectRows([defaultSubjectRow()]);
    setMultiDialogOpen(true);
  };

  // Add a dynamic row
  const addRow = () => {
    setSubjectRows((prev) => [...prev, defaultSubjectRow()]);
  };

  // Delete a dynamic row
  const removeRow = (idx: number) => {
    if (subjectRows.length <= 1) return;
    setSubjectRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Multi save button handler
  const handleSaveMulti = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Group Validation
    const groupName = (groupSelectionType === "new" ? newGroupName : selectedGroupName).trim();
    if (!groupName) {
      toast.error("Please provide or select a Subject Group name!");
      return;
    }

    // 2. Rows Validation
    const sanitizedRows = subjectRows.map((r) => ({
      name: r.name.trim(),
      code: r.code.toUpperCase().trim(),
      description: r.description.trim(),
    }));

    const duplicates = sanitizedRows.filter(
      (r) =>
        !r.name ||
        !r.code ||
        courses.some(
          (c) =>
            c.code.toLowerCase() === r.code.toLowerCase() ||
            c.name.toLowerCase() === r.name.toLowerCase(),
        ),
    );

    if (duplicates.length > 0) {
      toast.error(
        "Ensure all subject entries have a unique name & code that doesn't already exist.",
      );
      return;
    }

    // 3. Save looping through addCourse
    sanitizedRows.forEach((subj) => {
      addCourse({
        name: subj.name,
        code: subj.code,
        description: subj.description || `Grouped under ${groupName}`,
        duration: commonDuration,
        startDate: commonStartDate,
        endDate: commonEndDate,
        group: groupName,
      });
    });

    toast.success(`Success! Added ${sanitizedRows.length} subjects under Group "${groupName}"`);
    setMultiDialogOpen(false);
  };

  // Edit action handler
  const handleOpenEdit = (c: Course) => {
    setEditingCourse(c);
    setEditingForm({
      name: c.name,
      code: c.code,
      description: c.description || "",
      duration: c.duration,
      startDate: c.startDate,
      endDate: c.endDate,
      group: c.group || "General",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    if (!editingForm.name || !editingForm.code || !editingForm.group) {
      toast.error("Subject name, code, and group are required!");
      return;
    }

    // Validate duplicate code
    const keyMatch = courses.some(
      (c) => c.id !== editingCourse.id && c.code.toLowerCase() === editingForm.code.toLowerCase(),
    );
    if (keyMatch) {
      toast.error(
        `Code "${editingForm.code.toUpperCase()}" is already registered by another subject!`,
      );
      return;
    }

    updateCourse(editingCourse.id, editingForm);
    toast.success(`Subject "${editingForm.name}" updated successfully!`);
    setEditDialogOpen(false);
  };

  const handleDeleteSubject = (id: string, name: string) => {
    // Check if linked to active batches
    const linkedBatches = batches.filter((b) => b.courseId === id);
    if (linkedBatches.length > 0) {
      toast.error(
        `Cannot delete "${name}". It is associated with active batches: ${linkedBatches.map((b) => b.name).join(", ")}`,
      );
      return;
    }

    setCourseToDelete({ id, name });
    setDeleteConfirmationOpen(true);
  };

  const confirmDeleteSubject = () => {
    if (!courseToDelete) return;
    deleteCourse(courseToDelete.id);
    toast.success(`Subject "${courseToDelete.name}" deleted from records.`);
    setCourseToDelete(null);
    setDeleteConfirmationOpen(false);
  };

  // Computed display data
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.group && c.group.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchGroup =
        selectedGroupFilter === "ALL_GROUPS" || (c.group || "General") === selectedGroupFilter;

      return matchSearch && matchGroup;
    });
  }, [courses, searchTerm, selectedGroupFilter]);

  // Grouped courses structure for rendering
  const coursesByGroup = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    filteredCourses.forEach((c) => {
      const g = c.group || "General";
      if (!groups[g]) {
        groups[g] = [];
      }
      groups[g].push(c);
    });
    return groups;
  }, [filteredCourses]);

  const uniqueGroupsAll = useMemo(() => {
    const groups = new Set<string>();
    courses.forEach((c) => {
      groups.add(c.group || "General");
    });
    return Array.from(groups).sort();
  }, [courses]);

  return (
    <AppShell
      title="Subjects Manager"
      subtitle="Organize, group, and register course streams for Colombo College classes"
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Total Subjects
            </p>
            <h4 className="text-2xl font-bold mt-0.5">{courses.length}</h4>
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Subject Streams / Groups
            </p>
            <h4 className="text-2xl font-bold mt-0.5">{uniqueGroupsAll.length}</h4>
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
            <FolderPlus size={22} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Action Shortcut
            </p>
            <button
              onClick={handleOpenMultiDialog}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
            >
              <Plus size={13} /> Add Group of Subjects
            </button>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={17}
          />
          <Input
            placeholder="Search subjects by name, code or stream theme..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 w-full rounded-xl"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-56">
            <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
              <SelectTrigger className="h-10 rounded-xl bg-background">
                <SelectValue placeholder="All Streams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_GROUPS">All Subject Groups</SelectItem>
                {uniqueGroupsAll.map((g) => (
                  <SelectItem key={g} value={g}>
                    Group: {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="h-10 rounded-xl font-bold gap-1.5 gradient-primary text-primary-foreground shrink-0 cursor-pointer"
            onClick={handleOpenMultiDialog}
          >
            <FolderPlus size={16} /> Group-by-Group Creator
          </Button>
        </div>
      </div>

      {/* Grouped Lists display */}
      <div className="space-y-8">
        {Object.entries(coursesByGroup).length === 0 ? (
          <div className="bg-card rounded-2xl border border-border border-dashed p-12 text-center max-w-xl mx-auto mt-8">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center border text-muted-foreground mx-auto mb-4">
              <HelpCircle size={28} />
            </div>
            <h3 className="font-bold text-lg text-foreground">No matching subjects found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
              No registered subjects match your search keyword or selected group filter. Change
              filters or onboard custom subjects.
            </p>
            <Button
              onClick={handleOpenMultiDialog}
              variant="outline"
              className="mt-4 rounded-xl font-bold border-dashed hover:border-primary/50 text-foreground cursor-pointer"
            >
              Onboard New Group now
            </Button>
          </div>
        ) : (
          Object.entries(coursesByGroup).map(([groupName, list]) => (
            <div key={groupName} className="space-y-3">
              {/* Group Title Section */}
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <FolderOpen className="text-primary" size={17} />
                <h3 className="font-bold text-sm tracking-tight text-foreground uppercase">
                  {groupName} Group
                </h3>
                <span className="bg-primary/10 text-primary font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                  {list.length} {list.length === 1 ? "Subject" : "Subjects"}
                </span>
              </div>

              {/* Subject Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((c) => {
                  // Calculate active batches
                  const activeBCount = batches.filter((b) => b.courseId === c.id).length;
                  // Calculate linked teachers
                  const teachersTeaching = teachers.filter(
                    (t) => t.subjectId === c.id || t.subjectIds?.includes(c.id),
                  );

                  return (
                    <motion.div
                      layout
                      key={c.id}
                      className="bg-card hover:bg-secondary/10 border border-border/80 hover:border-primary/20 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-elegant relative overflow-hidden group"
                    >
                      <div className="space-y-2">
                        {/* Title and actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold bg-primary/10 text-primary mb-1">
                              {c.code}
                            </span>
                            <h4 className="font-bold text-base leading-tight text-foreground group-hover:text-primary transition-colors">
                              {c.name}
                            </h4>
                          </div>

                          <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenEdit(c)}
                              className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                              title="Edit Subject"
                            >
                              <Pencil size={12} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteSubject(c.id, c.name)}
                              className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete Subject"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>

                        {/* Description */}
                        {c.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {c.description}
                          </p>
                        )}

                        {/* Metadata pills */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="shrink-0 text-muted-foreground/60" />
                            <span className="truncate">{c.duration}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="shrink-0 text-muted-foreground/60" />
                            <span className="truncate">{c.startDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Batches and Teachers relations footer */}
                      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                          <Layers size={11} className="text-primary/70" />
                          <span>
                            {activeBCount} {activeBCount === 1 ? "Batch" : "Batches"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Briefcase size={11} />
                          <span className="font-semibold">
                            {teachersTeaching.length}{" "}
                            {teachersTeaching.length === 1 ? "Teacher" : "Teachers"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* WIZARD 1: GROUP-BY-GROUP BATCH MULTI-CREATOR SYSTEM */}
      <Dialog open={multiDialogOpen} onOpenChange={setMultiDialogOpen}>
        <DialogContent className="max-w-3xl rounded-2xl">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FolderPlus className="text-primary" size={20} />
              Onboard Subject Group
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMulti} className="space-y-5">
            {/* Group Selection Section */}
            <div className="bg-secondary/15 p-4 rounded-xl border border-border/85 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Group Association
              </h4>

              <div className="flex items-center gap-4 text-xs font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="groupType"
                    checked={groupSelectionType === "existing"}
                    disabled={existingGroups.length === 0}
                    onChange={() => setGroupSelectionType("existing")}
                    className="accent-primary"
                  />
                  <span>Select Existing Group ({existingGroups.length})</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="groupType"
                    checked={groupSelectionType === "new"}
                    onChange={() => setGroupSelectionType("new")}
                    className="accent-primary"
                  />
                  <span>Create New Custom Group</span>
                </label>
              </div>

              {groupSelectionType === "existing" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Existing Groups List</Label>
                  <Select value={selectedGroupName} onValueChange={setSelectedGroupName}>
                    <SelectTrigger className="h-10 bg-card">
                      <SelectValue placeholder="Choose Group..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingGroups.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g} Group
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">New Group Name *</Label>
                  <Input
                    placeholder="e.g. Science Stream, Primary Grade, Accounting Dept"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="h-10 text-xs"
                    required={groupSelectionType === "new"}
                  />
                </div>
              )}
            </div>

            {/* Common Settings Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-secondary/5 p-4 rounded-xl border border-border/40">
              <div className="space-y-1.5 col-span-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Default Duration
                </Label>
                <Input
                  value={commonDuration}
                  onChange={(e) => setCommonDuration(e.target.value)}
                  placeholder="e.g. 2 Years (A/L)"
                  className="h-9 text-xs bg-card"
                />
              </div>

              <div className="space-y-1.5 col-span-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Default Start Date
                </Label>
                <Input
                  type="date"
                  value={commonStartDate}
                  onChange={(e) => setCommonStartDate(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>

              <div className="space-y-1.5 col-span-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Default End Date
                </Label>
                <Input
                  type="date"
                  value={commonEndDate}
                  onChange={(e) => setCommonEndDate(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>
            </div>

            {/* Dynamic Subjects List Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. Subjects Rows ({subjectRows.length})
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="h-7 text-[11px] px-2.5 font-bold text-primary hover:bg-primary/5 cursor-pointer"
                >
                  <Plus size={11} className="mr-1" /> Add Subject Raw
                </Button>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1.5 scrollbar-thin">
                {subjectRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row gap-3 p-3 bg-card border border-border rounded-xl shadow-sm relative group/row items-start"
                  >
                    <div className="w-6 h-6 rounded-full bg-secondary text-muted-foreground border flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-1">
                      {idx + 1}
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
                      <div className="md:col-span-4 space-y-1">
                        <Label className="text-[10px] font-semibold">Subject Name *</Label>
                        <Input
                          placeholder="e.g. Physics, Chemistry"
                          value={row.name}
                          onChange={(e) => {
                            const newRows = [...subjectRows];
                            newRows[idx].name = e.target.value;
                            setSubjectRows(newRows);
                          }}
                          className="h-8 text-xs font-semibold"
                          required
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[10px] font-semibold">Subject Code *</Label>
                        <Input
                          placeholder="e.g. PHY, CHM"
                          value={row.code}
                          onChange={(e) => {
                            const newRows = [...subjectRows];
                            newRows[idx].code = e.target.value;
                            setSubjectRows(newRows);
                          }}
                          className="h-8 text-xs font-bold uppercase text-primary font-mono"
                          required
                        />
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <Label className="text-[10px] font-semibold">Description / Notes</Label>
                        <Input
                          placeholder="Brief information for syllabuses"
                          value={row.description}
                          onChange={(e) => {
                            const newRows = [...subjectRows];
                            newRows[idx].description = e.target.value;
                            setSubjectRows(newRows);
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {subjectRows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(idx)}
                        className="w-8 h-8 rounded-lg mt-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Remove Row"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMultiDialogOpen(false)}
                className="h-9 font-semibold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 gradient-primary text-primary-foreground font-bold text-xs cursor-pointer"
              >
                Assemble Group of Subjects
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SINGLE SUBJECT EDIT DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Pencil className="text-primary" size={16} />
              Edit Subject Info
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subject Name *</Label>
              <Input
                value={editingForm.name}
                onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                required
                className="h-10 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subject Code *</Label>
                <Input
                  value={editingForm.code}
                  onChange={(e) => setEditingForm({ ...editingForm, code: e.target.value })}
                  required
                  className="h-10 text-xs font-bold uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subject Stream/Group *</Label>
                <Input
                  value={editingForm.group}
                  onChange={(e) => setEditingForm({ ...editingForm, group: e.target.value })}
                  required
                  placeholder="e.g. Commerce Stream, Languages"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description / syllabus notes</Label>
              <Textarea
                value={editingForm.description}
                onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                className="min-h-[80px] max-h-[120px] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Duration
                </Label>
                <Input
                  value={editingForm.duration}
                  onChange={(e) => setEditingForm({ ...editingForm, duration: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={editingForm.startDate}
                  onChange={(e) => setEditingForm({ ...editingForm, startDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditDialogOpen(false)}
                className="h-9 font-semibold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 gradient-primary text-primary-foreground font-bold text-xs cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE SUBJECT CONFIRMATION DIALOG */}
      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5 animate-pulse">
              <Trash2 size={18} />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete the subject{" "}
              <strong className="text-foreground">"{courseToDelete?.name}"</strong>? This will
              permanently remove it from records and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-9 font-semibold text-xs rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSubject}
              className="h-9 font-bold text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl cursor-pointer"
            >
              Delete Subject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
