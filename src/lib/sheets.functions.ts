import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const FIXED_SPREADSHEET_ID = "1iA95g6Bt9XV_D1oyiBWZmEzlcRLTgdfHEfM5Gxk21WU";

const RowSchema = z.object({
  date: z.string(),
  studentId: z.string(),
  name: z.string(),
  status: z.string(),
  remarks: z.string().default(""),
  batch: z.string(),
  teacher: z.string().default(""),
});

const InputSchema = z.object({
  spreadsheetId: z.string().nullable().optional(),
  subjectName: z.string().min(1),
  batchName: z.string().min(1),
  month: z.string().min(1),
  date: z.string().min(1),
  rows: z.array(RowSchema).min(1),
});

function authHeaders() {
  const lk = process.env.LOVABLE_API_KEY;
  const gk = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lk || !gk) throw new Error("Google Sheets connection is not configured");
  return {
    Authorization: `Bearer ${lk}`,
    "X-Connection-Api-Key": gk,
    "Content-Type": "application/json",
  };
}

async function gw(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export const saveAttendanceToSheets = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    // Always write to the single shared spreadsheet.
    const spreadsheetId = FIXED_SPREADSHEET_ID;

    // One tab per subject + batch + month
    const tabTitle = `${data.subjectName} - ${data.batchName} - ${data.month}`.slice(0, 95);

    // Ensure tab exists
    const meta = await gw(`/spreadsheets/${spreadsheetId}?fields=sheets.properties`);
    const sheets: Array<{ properties: { title: string; sheetId: number } }> = meta.sheets || [];
    if (!sheets.find((s) => s.properties.title === tabTitle)) {
      await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: tabTitle } } }],
        }),
      });
    }

    // 3. Compute month + day grid (matrix template: days as columns)
    const [yStr, mStr] = data.month.split("-");
    const year = parseInt(yStr, 10);
    const monthIdx = parseInt(mStr, 10) - 1;
    const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const dayOfMonth = parseInt(data.date.slice(8, 10), 10);

    const firstDayCol = 3; // column C
    const lastDayCol = firstDayCol + daysInMonth - 1;
    const absentCol = lastDayCol + 1;
    const presentCol = lastDayCol + 2;
    const lastColLetter = colLetter(presentCol);

    // 4. Read existing tab to preserve marks from other dates this month
    const existing = await gw(
      `/spreadsheets/${spreadsheetId}/values/${tabTitle}!A1:${lastColLetter}500`,
    );
    const existingRows = (existing.values || []) as unknown[][];
    // Student data rows start at index 4 (row 5). Skip trailing "Daily Total" / "Subject Teacher's Name" rows.
    const existingStudents: Record<string, unknown[]> = {};
    for (let i = 4; i < existingRows.length; i++) {
      const r = existingRows[i] || [];
      const sid = r[0];
      if (!sid || sid === "Daily Total" || sid === "Subject Teacher's Name") continue;
      existingStudents[String(sid)] = r;
    }

    const teacherName = data.rows.find((r) => r.teacher)?.teacher ?? "";
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const mm = String(monthIdx + 1).padStart(2, "0");

    // 5. Build the matrix (exactly matching template)
    const row1: unknown[] = ["Subject And Month", "", `${data.subjectName} - ${data.month}`];
    while (row1.length < presentCol) row1.push("");

    const row2: unknown[] = ["Batch Name", data.batchName];
    for (let d = 1; d <= daysInMonth; d++) row2.push(`${mm}/${String(d).padStart(2, "0")}`);
    row2.push("Absence", "Present");

    const row3: unknown[] = ["", ""];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(Date.UTC(year, monthIdx, d)).getUTCDay();
      row3.push(weekdays[dow]);
    }
    row3.push(0, 1);

    const row4: unknown[] = ["", ""];
    for (let d = 1; d <= daysInMonth; d++) row4.push(data.subjectName);
    row4.push("", "");

    const studentRows: unknown[][] = [];
    data.rows.forEach((stu, idx) => {
      const excelRow = 5 + idx;
      const prev = existingStudents[stu.studentId] || [];
      const out: unknown[] = [stu.studentId, stu.name];
      for (let d = 1; d <= daysInMonth; d++) {
        const col = firstDayCol + d - 1; // 1-based col
        if (d === dayOfMonth) {
          out.push(stu.status === "Present" ? 1 : 0);
        } else {
          const prevVal = prev[col - 1];
          out.push(prevVal === undefined || prevVal === null || prevVal === "" ? "" : prevVal);
        }
      }
      const firstColL = colLetter(firstDayCol);
      const lastColL = colLetter(lastDayCol);
      out.push(`=COUNTIF(${firstColL}${excelRow}:${lastColL}${excelRow},0)`);
      out.push(`=COUNTIF(${firstColL}${excelRow}:${lastColL}${excelRow},1)`);
      studentRows.push(out);
    });

    const fullMatrix = [row1, row2, row3, row4, ...studentRows];

    // 6. Clear and write
    await gw(`/spreadsheets/${spreadsheetId}/values/${tabTitle}!A1:${lastColLetter}500:clear`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await gw(`/spreadsheets/${spreadsheetId}/values/${tabTitle}!A1?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: JSON.stringify({ values: fullMatrix }),
    });

    return {
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      rowsSaved: data.rows.length,
    };
  });
