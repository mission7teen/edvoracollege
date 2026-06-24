import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

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

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const KEY_TAB = "Attendance key";

function sanitizeTab(s: string) {
  return s.replace(/[\/\\?*\[\]:]/g, "-").trim().slice(0, 95);
}

function buildKeyTabRequests(sheetId: number) {
  // Mirrors uploaded template's "Attendance key" tab.
  return [
    {
      updateCells: {
        rows: [
          { values: [{}, { userEnteredValue: { stringValue: "SETTINGS" }, userEnteredFormat: { textFormat: { bold: true, fontSize: 12 } } }] },
          { values: [{}, { userEnteredValue: { stringValue: "ATTENDANCE KEY" }, userEnteredFormat: { textFormat: { bold: true } } }] },
          { values: [{}, { userEnteredValue: { stringValue: "Change the attendance key by updating the values below." } }] },
          { values: [{}, { userEnteredValue: { stringValue: "Add tabs by duplicating a subject sheet. New tabs reference this same attendance key." } }] },
          { values: [] },
          { values: [{}, { userEnteredValue: { stringValue: "ATTENDANCE KEY" }, userEnteredFormat: { textFormat: { bold: true } } }] },
          { values: [{}, { userEnteredValue: { numberValue: 1 } }, { userEnteredValue: { stringValue: "Present" } }] },
          { values: [{}, { userEnteredValue: { numberValue: 0 } }, { userEnteredValue: { stringValue: "Absence" } }] },
        ],
        fields: "userEnteredValue,userEnteredFormat.textFormat",
        start: { sheetId, rowIndex: 0, columnIndex: 0 },
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 4 },
        properties: { pixelSize: 160 },
        fields: "pixelSize",
      },
    },
  ];
}

function buildSubjectTabFormattingRequests(opts: {
  sheetId: number;
  daysInMonth: number;
  presentColIndex: number; // 0-based, last column (= daysInMonth + 3 - 1 + 1 = daysInMonth+3? careful)
}) {
  const { sheetId, daysInMonth, presentColIndex } = opts;
  const lastCol = presentColIndex + 1; // exclusive endIndex
  return [
    // Column widths (match template)
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 70 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 140 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 2, endIndex: 2 + daysInMonth }, properties: { pixelSize: 42 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 2 + daysInMonth, endIndex: lastCol }, properties: { pixelSize: 55 }, fields: "pixelSize" } },
    // Row heights
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 50 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: 46 }, properties: { pixelSize: 24 }, fields: "pixelSize" } },
    // Merges
    { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 }, mergeType: "MERGE_ALL" } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2 }, mergeType: "MERGE_ALL" } },
    { mergeCells: { range: { sheetId, startRowIndex: 40, endRowIndex: 41, startColumnIndex: 0, endColumnIndex: 2 }, mergeType: "MERGE_ALL" } },
    { mergeCells: { range: { sheetId, startRowIndex: 41, endRowIndex: 45, startColumnIndex: 0, endColumnIndex: 2 }, mergeType: "MERGE_ALL" } },
    // Per-column teacher merge (rows 42-45)
    ...Array.from({ length: daysInMonth + 2 }, (_, i) => ({
      mergeCells: { range: { sheetId, startRowIndex: 41, endRowIndex: 45, startColumnIndex: 2 + i, endColumnIndex: 3 + i }, mergeType: "MERGE_ALL" },
    })),
    // Freeze header rows + first 2 columns
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 4, frozenColumnCount: 2 } }, fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount" } },
    // Header formatting
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: lastCol }, cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14 }, horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", backgroundColor: { red: 0.93, green: 0.95, blue: 1 } } }, fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,backgroundColor)" } },
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: lastCol }, cell: { userEnteredFormat: { textFormat: { bold: true }, horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", backgroundColor: { red: 0.97, green: 0.97, blue: 0.97 } } }, fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,backgroundColor)" } },
    { repeatCell: { range: { sheetId, startRowIndex: 4, endRowIndex: 40, startColumnIndex: 2, endColumnIndex: 2 + daysInMonth }, cell: { userEnteredFormat: { horizontalAlignment: "CENTER" } }, fields: "userEnteredFormat.horizontalAlignment" } },
    // Date row number format
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 2, endColumnIndex: 2 + daysInMonth }, cell: { userEnteredFormat: { numberFormat: { type: "DATE", pattern: "d" } } }, fields: "userEnteredFormat.numberFormat" } },
    { repeatCell: { range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 2, endColumnIndex: 2 + daysInMonth }, cell: { userEnteredFormat: { numberFormat: { type: "DATE", pattern: "ddd" } } }, fields: "userEnteredFormat.numberFormat" } },
    // Borders
    { updateBorders: { range: { sheetId, startRowIndex: 0, endRowIndex: 45, startColumnIndex: 0, endColumnIndex: lastCol }, top: { style: "SOLID" }, bottom: { style: "SOLID" }, left: { style: "SOLID" }, right: { style: "SOLID" }, innerHorizontal: { style: "SOLID" }, innerVertical: { style: "SOLID" } } },
  ];
}

function buildSubjectTabValues(opts: {
  subjectName: string;
  batchName: string;
  year: number;
  monthIdx: number; // 0-based
  daysInMonth: number;
}) {
  const { subjectName, batchName, year, monthIdx, daysInMonth } = opts;
  const mShort = MONTHS_SHORT[monthIdx];
  const absentCol = colLetter(3 + daysInMonth); // after C..(C+days-1)
  const presentCol = colLetter(3 + daysInMonth + 1);

  // Row 1: subject + month title (merged A:B), C1 holds an instruction note
  const row1: unknown[] = [`${subjectName} And ${mShort}`, ""];
  row1.push(
    `=IFERROR(CONCATENATE("  Enter ", 'Attendance key'!$B$7, " for ", 'Attendance key'!$C$7, ", ", 'Attendance key'!$B$8, " for ", 'Attendance key'!$C$8, ". Use the 'Attendance key' tab to customise."),"")`,
  );
  while (row1.length < 3 + daysInMonth + 2) row1.push("");

  // Row 2: batch name + serial dates + key labels
  const row2: unknown[] = [batchName, ""];
  for (let d = 1; d <= daysInMonth; d++) {
    // serial date number (Sheets epoch 1899-12-30)
    const dt = Date.UTC(year, monthIdx, d);
    const epoch = Date.UTC(1899, 11, 30);
    const serial = Math.round((dt - epoch) / 86400000);
    row2.push(serial);
  }
  row2.push(`='Attendance key'!$C8`, "Present");

  // Row 3: weekday echo formulas + key codes
  const row3: unknown[] = ["", ""];
  for (let d = 1; d <= daysInMonth; d++) {
    const col = colLetter(2 + d);
    row3.push(`=${col}2`);
  }
  row3.push(`='Attendance key'!$B8`, `='Attendance key'!$B7`);

  // Row 4: empty spacer (kept blank for visual)
  const row4: unknown[] = ["", ""];
  for (let d = 1; d <= daysInMonth; d++) row4.push("");
  row4.push("", "");

  return { row1, row2, row3, row4, absentCol, presentCol };
}
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    // Always write to the single shared spreadsheet.
    const spreadsheetId = FIXED_SPREADSHEET_ID;

    // One tab per subject + batch + month.
    // Google Sheet tab names cannot contain: / \ ? * [ ] : and must be <= 100 chars.
    const sanitize = (s: string) => s.replace(/[\/\\?*\[\]:]/g, "-").trim();
    const tabTitle = sanitize(
      `${data.subjectName} - ${data.batchName} - ${data.month}`,
    ).slice(0, 95);
    const encodedTab = encodeURIComponent(tabTitle);

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
      `/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1:${lastColLetter}500`,
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
    await gw(`/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1:${lastColLetter}500:clear`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await gw(`/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: JSON.stringify({ values: fullMatrix }),
    });

    return {
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      rowsSaved: data.rows.length,
    };
  });
