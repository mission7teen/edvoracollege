import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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

type SheetProp = { properties: { title: string; sheetId: number } };

export const saveAttendanceToSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const [yStr, mStr] = data.month.split("-");
    const year = parseInt(yStr, 10);
    const monthIdx = parseInt(mStr, 10) - 1;
    const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const dayOfMonth = parseInt(data.date.slice(8, 10), 10);
    const mShort = MONTHS_SHORT[monthIdx];

    const firstDayCol = 3;
    const lastDayCol = firstDayCol + daysInMonth - 1;
    const absentColNum = lastDayCol + 1;
    const presentColNum = lastDayCol + 2;
    const lastColLetter = colLetter(presentColNum);

    const subjectTab = sanitizeTab(data.subjectName);
    const encodedSubject = encodeURIComponent(subjectTab);

    // ----- 1. Resolve / create spreadsheet -----
    let spreadsheetId = data.spreadsheetId ?? null;
    let sheets: SheetProp[] = [];
    let needsSubjectInit = false;

    if (!spreadsheetId) {
      const title = sanitizeTab(`EC - ${mShort} ${year} - ${data.batchName}`);
      const created = await gw(`/spreadsheets`, {
        method: "POST",
        body: JSON.stringify({
          properties: { title },
          sheets: [
            { properties: { title: subjectTab, gridProperties: { rowCount: 50, columnCount: presentColNum } } },
            { properties: { title: KEY_TAB, gridProperties: { rowCount: 20, columnCount: 5 } } },
          ],
        }),
      });
      spreadsheetId = created.spreadsheetId as string;
      sheets = (created.sheets || []) as SheetProp[];
      needsSubjectInit = true;

      const keySheetId = sheets.find((s) => s.properties.title === KEY_TAB)?.properties.sheetId;
      if (keySheetId !== undefined) {
        await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify({ requests: buildKeyTabRequests(keySheetId) }),
        });
      }
    } else {
      const meta = await gw(`/spreadsheets/${spreadsheetId}?fields=sheets.properties`);
      sheets = (meta.sheets || []) as SheetProp[];
      // Ensure key tab exists
      if (!sheets.find((s) => s.properties.title === KEY_TAB)) {
        const r = await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify({ requests: [{ addSheet: { properties: { title: KEY_TAB } } }] }),
        });
        const newId = r.replies?.[0]?.addSheet?.properties?.sheetId as number | undefined;
        if (newId !== undefined) {
          await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: "POST",
            body: JSON.stringify({ requests: buildKeyTabRequests(newId) }),
          });
          sheets.push({ properties: { title: KEY_TAB, sheetId: newId } });
        }
      }
      // Ensure subject tab exists
      if (!sheets.find((s) => s.properties.title === subjectTab)) {
        const r = await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify({ requests: [{ addSheet: { properties: { title: subjectTab, gridProperties: { rowCount: 50, columnCount: presentColNum } } } }] }),
        });
        const newId = r.replies?.[0]?.addSheet?.properties?.sheetId as number | undefined;
        if (newId !== undefined) sheets.push({ properties: { title: subjectTab, sheetId: newId } });
        needsSubjectInit = true;
      }
    }

    const subjectSheetId = sheets.find((s) => s.properties.title === subjectTab)?.properties.sheetId;
    if (subjectSheetId === undefined) throw new Error("Failed to resolve subject tab");

    // ----- 2. Read existing values to preserve other dates -----
    let existingRows: unknown[][] = [];
    if (!needsSubjectInit) {
      const existing = await gw(
        `/spreadsheets/${spreadsheetId}/values/${encodedSubject}!A1:${lastColLetter}500`,
      );
      existingRows = (existing.values || []) as unknown[][];
    }
    const existingStudents: Record<string, unknown[]> = {};
    for (let i = 4; i < existingRows.length; i++) {
      const r = existingRows[i] || [];
      const sid = r[0];
      if (!sid || sid === "Daily Total" || sid === "Subject Teacher's Name") continue;
      existingStudents[String(sid)] = r;
    }

    // ----- 3. Build matrix matching the template -----
    const { row1, row2, row3, row4 } = buildSubjectTabValues({
      subjectName: data.subjectName,
      batchName: data.batchName,
      year,
      monthIdx,
      daysInMonth,
    });

    const firstColL = colLetter(firstDayCol);
    const lastColL = colLetter(lastDayCol);

    const studentRows: unknown[][] = data.rows.map((stu, idx) => {
      const excelRow = 5 + idx;
      const prev = existingStudents[stu.studentId] || [];
      const out: unknown[] = [stu.studentId, stu.name];
      for (let d = 1; d <= daysInMonth; d++) {
        const col = firstDayCol + d - 1;
        if (d === dayOfMonth) {
          out.push(stu.status === "Present" ? 1 : 0);
        } else {
          const prevVal = prev[col - 1];
          out.push(prevVal === undefined || prevVal === null || prevVal === "" ? "" : prevVal);
        }
      }
      out.push(`=COUNTIF($${firstColL}${excelRow}:$${lastColL}${excelRow},$${colLetter(absentColNum)}$3)`);
      out.push(`=COUNTIF($${firstColL}${excelRow}:$${lastColL}${excelRow},$${colLetter(presentColNum)}$3)`);
      return out;
    });

    // Pad to row 40 so the daily total row stays at row 41 like the template
    while (studentRows.length < 36) {
      const blank: unknown[] = ["", ""];
      for (let d = 1; d <= daysInMonth; d++) blank.push("");
      blank.push("", "");
      studentRows.push(blank);
    }

    // Row 41: Daily Total (Present count per day)
    const row41: unknown[] = ["Daily Total", ""];
    for (let d = 1; d <= daysInMonth; d++) {
      const c = colLetter(firstDayCol + d - 1);
      row41.push(`=COUNTIF(${c}5:${c}40,$${colLetter(presentColNum)}$3)`);
    }
    row41.push("", "");

    // Row 42: Subject teacher per column
    const teacherName = data.rows.find((r) => r.teacher)?.teacher ?? "";
    const row42: unknown[] = ["Subject Teacher's Name", ""];
    for (let d = 1; d <= daysInMonth; d++) row42.push(teacherName);
    row42.push("", "");
    const row43: unknown[] = ["", ""].concat(Array(daysInMonth + 2).fill(""));
    const row44 = [...row43];
    const row45 = [...row43];

    const fullMatrix = [row1, row2, row3, row4, ...studentRows, row41, row42, row43, row44, row45];

    // ----- 4. Clear + write values -----
    await gw(`/spreadsheets/${spreadsheetId}/values/${encodedSubject}!A1:${lastColLetter}500:clear`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await gw(`/spreadsheets/${spreadsheetId}/values/${encodedSubject}!A1?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: JSON.stringify({ values: fullMatrix }),
    });

    // ----- 5. Apply formatting (only on first init of this subject tab) -----
    if (needsSubjectInit) {
      await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: buildSubjectTabFormattingRequests({
            sheetId: subjectSheetId,
            daysInMonth,
            presentColIndex: presentColNum - 1,
          }),
        }),
      });
    }

    return {
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${subjectSheetId}`,
      rowsSaved: data.rows.length,
    };
  });
