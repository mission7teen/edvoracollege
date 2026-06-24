import type { AttendanceRecord, Student, Batch, Course } from "./types";

export function exportCSV(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function exportJSON(filename: string, data: unknown) {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}

export function exportExcel(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1"><Table>
  <Row>${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>
  ${rows.map((r) => `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(String(r[h] ?? ""))}</Data></Cell>`).join("")}</Row>`).join("")}
 </Table></Worksheet></Workbook>`;
  downloadBlob(
    filename.replace(/\.xlsx?$/i, "") + ".xls",
    new Blob([xml], { type: "application/vnd.ms-excel" }),
  );
}

export function exportPDF(title: string, headers: string[], rows: string[][]) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeXml(title)}</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:32px;color:#0f172a}
h1{font-size:22px;margin:0 0 4px}.sub{color:#64748b;margin-bottom:24px;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left}
th{background:#1A4DCC;color:#fff;font-weight:600}
tr:nth-child(even) td{background:#f8fafc}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:20px}</style></head><body>
<div class="brand"><svg viewBox="0 0 100 100" style="width:36px;height:36px;border-radius:8px;"><rect width="100" height="100" rx="20" fill="#1A4DCC"/><path d="M50 20 C75 20, 75 22.5, 75 42.5 C75 72.5, 50 85, 50 85 C50 85, 25 72.5, 25 42.5 C25 22.5, 25 20, 50 20 Z" stroke="white" stroke-width="8" fill="none" stroke-linejoin="round"/><path d="M38 60 L62 35" stroke="white" stroke-width="8" stroke-linecap="round"/></svg><div><div style="font-weight:700">EDVORA COLLEGE</div><div class="sub">Student Attendance Management System</div></div></div>
<h1>${escapeXml(title)}</h1><div class="sub">Generated on ${new Date().toLocaleString()}</div>
<table><thead><tr>${headers.map((h) => `<th>${escapeXml(h)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeXml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeXml(s: string) {
  return s.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function attendanceRowsForExport(
  records: AttendanceRecord[],
  students: Student[],
  batches: Batch[],
  courses: Course[],
) {
  const sMap = new Map(students.map((s) => [s.id, s]));
  const bMap = new Map(batches.map((b) => [b.id, b]));
  const cMap = new Map(courses.map((c) => [c.id, c]));
  return records.map((r) => ({
    Date: r.date,
    StudentID: sMap.get(r.studentId)?.studentId ?? "",
    Name: sMap.get(r.studentId)?.fullName ?? "",
    Course: cMap.get(r.courseId)?.name ?? "",
    Batch: bMap.get(r.batchId)?.name ?? "",
    Status: r.status,
    Remarks: r.remarks ?? "",
  }));
}
