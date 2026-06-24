import { useState, useRef, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  CheckCircle,
  Download,
  Loader2,
  X,
  Info,
  Layers,
  ChevronRight,
  Clipboard,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Student, Course, Batch, Gender, StudentStatus } from "@/lib/types";

interface StudentCSVImporterProps {
  courses: Course[];
  batches: Batch[];
  existingStudents: Student[];
  onImport: (newStudents: Omit<Student, "id" | "registrationDate">[]) => void;
  onClose: () => void;
}

interface ParsedStudent {
  studentId?: string;
  fullName: string;
  gender: Gender;
  dob: string;
  nic: string;
  phone: string;
  email: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  courseId: string;
  batchId: string;
  status: StudentStatus;

  // Mapping helpers & logs
  courseLabel?: string;
  batchLabel?: string;
  errors: string[];
  warnings: string[];
}

export function StudentCSVImporter({
  courses,
  batches,
  existingStudents,
  onImport,
  onClose,
}: StudentCSVImporterProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Default values to fallback to if courseId/batchId missing from CSV
  const [defaultBatchId, setDefaultBatchId] = useState<string>("");
  const [isTemplateDownloaded, setIsTemplateDownloaded] = useState(false);

  // Set default batch on mount if batches are available
  useEffect(() => {
    if (batches.length > 0) {
      setDefaultBatchId(batches[0].id);
    }
  }, [batches]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // RFC 4180 standard compliant CSV Parser
  const parseRawCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // skip next double quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = "";
      } else if ((char === "\r" || char === "\n") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        row.push(currentVal.trim());
        lines.push(row);
        row = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }

    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      lines.push(row);
    }

    // Filter out completely blank rows
    return lines.filter((r) => r.some((cell) => cell.length > 0));
  };

  const normalizeHeader = (h: string): string => {
    return h
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");
  };

  const processImportData = (rawRows: string[][]) => {
    if (rawRows.length < 2) {
      toast.error("CSV must contain at least a header row and one student data row!");
      return;
    }

    setIsParsing(true);

    try {
      const headers = rawRows[0];
      const dataRows = rawRows.slice(1);

      // Auto-Detecting Headings Indexes
      const indexMap: Record<string, number> = {};
      headers.forEach((h, idx) => {
        const norm = normalizeHeader(h);
        if (norm === "id" || norm.includes("studentid")) indexMap["studentId"] = idx;
        else if (norm.includes("name") || norm.includes("fullname")) indexMap["fullName"] = idx;
        else if (norm === "gender" || norm === "sex" || norm === "g") indexMap["gender"] = idx;
        else if (norm === "dob" || norm.includes("birth") || norm === "birthday")
          indexMap["dob"] = idx;
        else if (norm === "nic" || norm === "passport" || norm.includes("nic"))
          indexMap["nic"] = idx;
        else if (norm === "phone" || norm === "mobile" || norm === "contact" || norm === "tel")
          indexMap["phone"] = idx;
        else if (norm.includes("email") || norm === "mail") indexMap["email"] = idx;
        else if (norm.includes("address") || norm === "residence") indexMap["address"] = idx;
        else if (
          norm.includes("guardianname") ||
          norm.includes("guardian_name") ||
          norm === "guardian"
        )
          indexMap["guardianName"] = idx;
        else if (norm.includes("guardianphone") || norm.includes("guardian_phone"))
          indexMap["guardianPhone"] = idx;
        else if (norm.includes("course") || norm.includes("subject")) indexMap["course"] = idx;
        else if (norm.includes("batch") || norm.includes("class")) indexMap["batch"] = idx;
        else if (norm === "status" || norm === "active") indexMap["status"] = idx;
      });

      const list: ParsedStudent[] = [];

      dataRows.forEach((row, rowIdx) => {
        // Safe cell accessor helper
        const cell = (key: string): string => {
          const pos = indexMap[key];
          if (pos !== undefined && pos < row.length) {
            return row[pos].trim();
          }
          return "";
        };

        const fullName = cell("fullName");
        const studentIdValue = cell("studentId");
        const genderInput = cell("gender");
        const dobInput = cell("dob");
        const nicInput = cell("nic");
        const phoneInput = cell("phone");
        const emailInput = cell("email");
        const addressInput = cell("address");
        const guardianNameInput = cell("guardianName");
        const guardianPhoneInput = cell("guardianPhone");
        const courseInput = cell("course");
        const batchInput = cell("batch");
        const statusInput = cell("status");

        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. Mandatory Validations
        if (!fullName) {
          errors.push("Missing Full Name");
        }

        // 2. Gender normalizer
        let parsedGender: Gender = "Male";
        const normGen = genderInput.toLowerCase();
        if (normGen.startsWith("f")) {
          parsedGender = "Female";
        } else if (normGen.startsWith("o") || normGen.startsWith("m")) {
          parsedGender = normGen.startsWith("o") ? "Other" : "Male";
        } else if (genderInput) {
          warnings.push(`Gender "${genderInput}" normalized to Male`);
        }

        // 3. Status normalizer
        let parsedStatus: StudentStatus = "Active";
        if (statusInput) {
          const normStat = statusInput.toLowerCase();
          if (normStat.includes("in") || normStat === "false" || normStat === "0") {
            parsedStatus = "Inactive";
          }
        }

        // 4. Match Batch & Course Codes or Names
        const fallBackBatch = batches.find((b) => b.id === defaultBatchId);
        let finalBatchId = fallBackBatch?.id ?? "";
        let finalCourseId = fallBackBatch?.courseId ?? "";

        let batchMatchedLabel = "";
        let courseMatchedLabel = "";

        if (batchInput) {
          const foundBatch = batches.find(
            (b) =>
              b.code.toLowerCase() === batchInput.toLowerCase() ||
              b.name.toLowerCase() === batchInput.toLowerCase() ||
              b.id === batchInput,
          );
          if (foundBatch) {
            finalBatchId = foundBatch.id;
            finalCourseId = foundBatch.courseId;
            batchMatchedLabel = foundBatch.name;
          } else {
            warnings.push(`Batch "${batchInput}" not found. Used fallback batch.`);
          }
        }

        if (courseInput && !batchMatchedLabel) {
          const foundCourse = courses.find(
            (c) =>
              c.code.toLowerCase() === courseInput.toLowerCase() ||
              c.name.toLowerCase() === courseInput.toLowerCase() ||
              c.id === courseInput,
          );
          if (foundCourse) {
            finalCourseId = foundCourse.id;
            courseMatchedLabel = foundCourse.name;
          } else {
            warnings.push(`Course "${courseInput}" not found.`);
          }
        }

        if (!finalBatchId) {
          errors.push("No Batch specified and no valid default batch selected");
        }

        // 5. Duplicate ID Checks
        if (studentIdValue) {
          const isDuplicate = existingStudents.some(
            (s) => s.studentId.toLowerCase() === studentIdValue.toLowerCase(),
          );
          if (isDuplicate) {
            errors.push(`Duplicate ID: Student ID "${studentIdValue}" already registered`);
          }
        }

        // Final structured object
        list.push({
          studentId: studentIdValue || undefined,
          fullName,
          gender: parsedGender,
          dob: dobInput,
          nic: nicInput,
          phone: phoneInput,
          email: emailInput,
          address: addressInput,
          guardianName: guardianNameInput,
          guardianPhone: guardianPhoneInput,
          courseId: finalCourseId,
          batchId: finalBatchId,
          status: parsedStatus,
          courseLabel: courseMatchedLabel || courses.find((c) => c.id === finalCourseId)?.name,
          batchLabel: batchMatchedLabel || batches.find((b) => b.id === finalBatchId)?.name,
          errors,
          warnings,
        });
      });

      setParsedData(list);
      toast.success(`Successfully parsed ${list.length} rows. Please review before importing.`);
    } catch (err) {
      console.error("Error parsing CSV data: ", err);
      toast.error("Failed to parse the CSV input. Verify column formats conform to standards.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      readAndProcessFile(selectedFile);
    }
  };

  const readAndProcessFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const rawRows = parseRawCSV(text);
        processImportData(rawRows);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read the uploaded CSV file.");
    };
    reader.readAsText(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv") || droppedFile.type === "text/csv") {
        setFile(droppedFile);
        readAndProcessFile(droppedFile);
      } else {
        toast.error("Only CSV files are supported!");
      }
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste something in the box!");
      return;
    }
    const rawRows = parseRawCSV(pastedText);
    processImportData(rawRows);
  };

  const downloadSampleTemplate = () => {
    const sampleHeaders = [
      "StudentID",
      "FullName",
      "Gender",
      "DOB",
      "NIC",
      "Phone",
      "Email",
      "Address",
      "GuardianName",
      "GuardianPhone",
      "BatchCode",
      "Status",
    ].join(",");

    // Create dual realistic examples mapping Colombo college theme
    const exBatch = batches[0]?.code || batches[0]?.name || "B01";
    const exampleLines = [
      sampleHeaders,
      `EDV-9011,Nishan Fonseka,Male,2007-04-12,200710323943,0715523912,nishanf@gmail.com,"221 Colombo Rd, Galle",Wasantha Fonseka,0713334212,${exBatch},Active`,
      `EDV-9012,Dilini Jayasinghe,Female,2008-01-19,200803403212,0771234912,dilini.j@outlook.com,"No 14 Temple Rd, Horana",S. Jayasinghe,0778888231,${exBatch},Active`,
    ].join("\n");

    const blob = new Blob([exampleLines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "edvora_student_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsTemplateDownloaded(true);
    toast.success("Downloaded Excel-compatible CSV Template!");
  };

  const removeRowFromQueue = (index: number) => {
    setParsedData((prev) => prev.filter((_, idx) => idx !== index));
    toast.info("Row removed from import preview queue");
  };

  const executeImport = () => {
    const validRows = parsedData.filter((p) => p.errors.length === 0);
    if (validRows.length === 0) {
      toast.error(
        "There are no valid rows to import. Please resolve error alerts or check your CSV!",
      );
      return;
    }

    // Construct clean payload for onImport hook matching AppStore's addStudent params
    const payload = validRows.map((row) => ({
      studentId: row.studentId,
      fullName: row.fullName,
      gender: row.gender,
      dob: row.dob,
      nic: row.nic,
      phone: row.phone,
      email: row.email,
      address: row.address,
      guardianName: row.guardianName,
      guardianPhone: row.guardianPhone,
      courseId: row.courseId,
      batchId: row.batchId,
      status: row.status,
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.fullName)}`,
    }));

    onImport(payload);
    toast.success(`Successfully imported ${validRows.length} students into rosters!`);
    onClose();
  };

  return (
    <div className="space-y-4 max-h-[90vh] overflow-y-auto pr-1">
      {/* Step 1 Area: Upload File or Paste */}
      {parsedData.length === 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Import Student Records</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose an Excel .csv file or paste raw rows directly.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleTemplate}
              className="text-[11px] gap-1.5 h-8 font-medium font-mono text-primary/90 border-primary/20 hover:border-primary/55"
            >
              <Download size={13} />{" "}
              {isTemplateDownloaded ? "Template Downloaded" : "Download Sample CSV"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Setup Default Parameters */}
            <div className="md:col-span-4 space-y-3 bg-secondary/15 p-4 rounded-xl border border-border/80">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Layers size={13} />
                <span>Roster Defaults</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                If the CSV rows do not specify a valid Batch or Course Code, they will automatically
                be assigned to the selected default batch/course.
              </p>

              <div className="space-y-1.5 pt-1">
                <Label className="text-[11px] text-foreground font-semibold">
                  Fallback Roster Batch
                </Label>
                <Select value={defaultBatchId} onValueChange={setDefaultBatchId}>
                  <SelectTrigger className="h-9 bg-card text-xs">
                    <SelectValue placeholder="Select fallback" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({courses.find((c) => c.id === b.courseId)?.code || "No Course"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Input Options Column */}
            <div className="md:col-span-8 flex flex-col">
              <div className="flex border-b border-border mb-3 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("file")}
                  className={`text-xs pb-2 font-medium relative border-b-2 transition-colors ${
                    activeTab === "file"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upload Local CSV File
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("paste")}
                  className={`text-xs pb-2 font-medium relative border-b-2 transition-colors ${
                    activeTab === "paste"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Paste Raw CSV / Text Roster
                </button>
              </div>

              {activeTab === "file" ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 min-h-[160px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${
                    dragActive
                      ? "border-primary bg-primary/5 scale-[0.99]"
                      : "border-border hover:border-primary/50 hover:bg-secondary/15"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,text/csv"
                    className="hidden"
                  />

                  <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center border text-muted-foreground mb-2">
                    <Upload size={18} />
                  </div>

                  {file ? (
                    <div>
                      <p className="text-xs font-bold text-foreground">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB · Click or drop another to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Drag and drop file here
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Supports Excel formatted .CSV records
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 flex-1 flex flex-col">
                  <Textarea
                    placeholder="StudentID,FullName,Gender,Phone,Email,Status&#10;EDV-1002,Kasun Perera,Male,0771234567,kasun@tech.com,Active"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="min-h-[120px] max-h-[160px] font-mono text-[11px] leading-relaxed scrollbar-thin"
                  />
                  <Button
                    size="sm"
                    className="w-full h-8 cursor-pointer gradient-primary text-primary-foreground text-xs"
                    onClick={handlePasteSubmit}
                  >
                    <Clipboard size={12} className="mr-1.5" /> Parse Pasted Text
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Step 2 Area: View and Review parsed student roster data */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-border/80">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <h4 className="text-sm font-bold text-foreground">Roster Preview & Validation</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm row mappings below. Red-highlighted items will be ignored.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setParsedData([]);
                  setFile(null);
                  setPastedText("");
                }}
                className="text-xs font-semibold"
              >
                Reset / Back
              </Button>
              <Button
                size="sm"
                onClick={executeImport}
                className="gradient-primary text-primary-foreground font-semibold text-xs"
              >
                Import {parsedData.filter((p) => p.errors.length === 0).length} valid students
              </Button>
            </div>
          </div>

          {/* Validation Metrics Status Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-secondary/10 border border-border/80 rounded-xl p-3 text-center">
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-mono text-foreground">
                {parsedData.length}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Total Rows Found
              </span>
            </div>
            <div className="flex flex-col border-y sm:border-y-0 sm:border-x border-border/60">
              <span className="text-2xl font-bold font-mono text-success">
                {parsedData.filter((p) => p.errors.length === 0).length}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Ready to Import
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-mono text-destructive">
                {parsedData.filter((p) => p.errors.length > 0).length}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Invalid rows (Skipped)
              </span>
            </div>
          </div>

          {/* Scrollable validation checklist grid table */}
          <div className="border border-border rounded-xl spill-hidden max-h-[300px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-secondary/40 sticky top-0 border-b z-10">
                <tr>
                  <th className="px-3 py-2.5 font-bold text-muted-foreground">#</th>
                  <th className="px-3 py-2.5 font-bold text-muted-foreground">StudentID</th>
                  <th className="px-3 py-2.5 font-bold text-muted-foreground">Full Name</th>
                  <th className="px-3 py-2.5 font-bold text-muted-foreground">Gender</th>
                  <th className="px-3 py-2.5 font-bold text-muted-foreground">Roster Batch</th>
                  <th className="px-3 py-2.5 font-bold text-muted-foreground">Phone / Email</th>
                  <th className="px-3 py-2.5 font-bold text-muted-foreground">Status / Checks</th>
                  <th className="px-3 py-2.5 font-bold text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {parsedData.map((row, idx) => {
                  const hasErrors = row.errors.length > 0;
                  const hasWarnings = row.warnings.length > 0;

                  return (
                    <tr
                      key={idx}
                      className={`transition-colors ${
                        hasErrors
                          ? "bg-destructive/5 hover:bg-destructive/10"
                          : "hover:bg-secondary/15"
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-primary text-[10px]">
                        {row.studentId || "Auto"}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-foreground text-[11px] leading-tight">
                          {row.fullName || "—"}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                          {row.nic || "No Resident NIC"}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-[10px]">{row.gender}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-[11px]">
                          {row.batchLabel || "Fallback default"}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-mono leading-none mt-0.5">
                          {row.courseLabel || "Class Portal"}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-[10px] font-medium leading-normal">{row.phone || "—"}</p>
                        <p className="text-[9px] text-muted-foreground low-case leading-none mt-0.5">
                          {row.email || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        {hasErrors ? (
                          <div className="space-y-0.5">
                            {row.errors.map((e, eidx) => (
                              <div
                                key={eidx}
                                className="flex items-center gap-1 text-[9px] text-destructive bg-destructive/10 px-1 py-0.5 rounded border border-destructive/20 leading-none"
                              >
                                <AlertTriangle size={10} className="shrink-0" />
                                <span className="truncate">{e}</span>
                              </div>
                            ))}
                          </div>
                        ) : hasWarnings ? (
                          <div className="space-y-0.5">
                            {row.warnings.map((w, widx) => (
                              <div
                                key={widx}
                                className="flex items-center gap-1 text-[9px] text-warning bg-warning/10 px-1 py-0.5 rounded border border-warning/20 leading-none font-medium"
                              >
                                <Info size={10} className="shrink-0" />
                                <span className="truncate">{w}</span>
                              </div>
                            ))}
                            <span className="text-[9px] text-success flex items-center gap-0.5 font-bold text-[10px] mt-0.5">
                              <CheckCircle size={10} /> Valid row
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] text-success font-bold">
                            <CheckCircle size={12} />
                            <span>Valid</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Remove Row"
                          onClick={() => removeRowFromQueue(idx)}
                          className="w-7 h-7 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
