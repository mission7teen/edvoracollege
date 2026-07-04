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
  gender: z.string().optional().default(""),
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

function serialFromYMD(y: number, mIdx: number, d: number) {
  const dt = Date.UTC(y, mIdx, d);
  const epoch = Date.UTC(1899, 11, 30);
  return Math.round((dt - epoch) / 86400000);
}

// Theme colours mirroring the uploaded reference workbook.
const C_HEADER_BG = { red: 0x2a / 255, green: 0x39 / 255, blue: 0x90 / 255 };
const C_HEADER_FG_LIGHT = { red: 0xc5 / 255, green: 0xca / 255, blue: 0xe9 / 255 };
const C_WHITE = { red: 1, green: 1, blue: 1 };
const C_SUB_FG = { red: 0x30 / 255, green: 0x3f / 255, blue: 0x9f / 255 };
const C_DATE_FG = { red: 0x67 / 255, green: 0x72 / 255, blue: 0xad / 255 };
const C_DATA_FG = { red: 0x66 / 255, green: 0x66 / 255, blue: 0x66 / 255 };
const C_ALT_BG = { red: 0xf3 / 255, green: 0xf3 / 255, blue: 0xf3 / 255 };
const C_BORDER = { red: 0.88, green: 0.88, blue: 0.92 };

function buildKeyTabRequests(sheetId: number) {
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
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 4 }, properties: { pixelSize: 160 }, fields: "pixelSize" } },
  ];
}

type SheetProp = { properties: { title: string; sheetId: number } };

function buildFormattingRequests(opts: { sheetId: number; dateCount: number; studentCount: number }) {
  const { sheetId, dateCount, studentCount } = opts;
  const totalCols = 2 + dateCount + 2;
  const firstStudentRow = 4;
  const lastStudentRow = firstStudentRow + studentCount;
  const dailyTotalRow = lastStudentRow;
  const teacherRowStart = dailyTotalRow + 1;
  const teacherRowEnd = teacherRowStart + 4;

  const reqs: unknown[] = [
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 80 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 150 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 2, endIndex: 2 + dateCount }, properties: { pixelSize: 50 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 2 + dateCount, endIndex: totalCols }, properties: { pixelSize: 70 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 50 }, fields: "pixelSize" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: teacherRowEnd }, properties: { pixelSize: 24 }, fields: "pixelSize" } },
    // Merges
    { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 }, mergeType: "MERGE_ALL" } },
    { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 2, endColumnIndex: totalCols }, mergeType: "MERGE_ALL" } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2 }, mergeType: "MERGE_ALL" } },
    { mergeCells: { range: { sheetId, startRowIndex: dailyTotalRow, endRowIndex: dailyTotalRow + 1, startColumnIndex: 0, endColumnIndex: 2 }, mergeType: "MERGE_ALL" } },
    { mergeCells: { range: { sheetId, startRowIndex: teacherRowStart, endRowIndex: teacherRowEnd, startColumnIndex: 0, endColumnIndex: 2 }, mergeType: "MERGE_ALL" } },
    ...Array.from({ length: dateCount + 2 }, (_, i) => ({
      mergeCells: { range: { sheetId, startRowIndex: teacherRowStart, endRowIndex: teacherRowEnd, startColumnIndex: 2 + i, endColumnIndex: 3 + i }, mergeType: "MERGE_ALL" },
    })),
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 4, frozenColumnCount: 2 } }, fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount" } },
    // Header
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: C_HEADER_BG, textFormat: { bold: true, fontSize: 12, foregroundColor: C_WHITE }, horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", wrapStrategy: "WRAP" } }, fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)" } },
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 2, endColumnIndex: totalCols }, cell: { userEnteredFormat: { backgroundColor: C_HEADER_BG, textFormat: { fontSize: 10, foregroundColor: C_HEADER_FG_LIGHT }, horizontalAlignment: "LEFT", verticalAlignment: "MIDDLE", wrapStrategy: "WRAP" } }, fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)" } },
    // Row 2
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 2 }, cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14, foregroundColor: C_SUB_FG }, horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", wrapStrategy: "WRAP" } }, fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)" } },
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 2, endColumnIndex: 2 + dateCount }, cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: C_SUB_FG }, horizontalAlignment: "CENTER", numberFormat: { type: "DATE", pattern: "d" } } }, fields: "userEnteredFormat(textFormat,horizontalAlignment,numberFormat)" } },
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 2 + dateCount, endColumnIndex: totalCols }, cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 9, foregroundColor: C_SUB_FG }, horizontalAlignment: "CENTER" } }, fields: "userEnteredFormat(textFormat,horizontalAlignment)" } },
    // Row 3
    { repeatCell: { range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 2, endColumnIndex: 2 + dateCount }, cell: { userEnteredFormat: { textFormat: { fontSize: 10, foregroundColor: C_DATE_FG }, horizontalAlignment: "CENTER", numberFormat: { type: "DATE", pattern: "ddd" } } }, fields: "userEnteredFormat(textFormat,horizontalAlignment,numberFormat)" } },
    { repeatCell: { range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 2 + dateCount, endColumnIndex: totalCols }, cell: { userEnteredFormat: { textFormat: { fontSize: 10, foregroundColor: C_DATE_FG }, horizontalAlignment: "CENTER" } }, fields: "userEnteredFormat(textFormat,horizontalAlignment)" } },
    { repeatCell: { range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: totalCols }, cell: { userEnteredFormat: { backgroundColor: C_WHITE } }, fields: "userEnteredFormat.backgroundColor" } },
    { updateBorders: { range: { sheetId, startRowIndex: 0, endRowIndex: teacherRowEnd, startColumnIndex: 0, endColumnIndex: totalCols }, top: { style: "SOLID", colorStyle: { rgbColor: C_BORDER } }, bottom: { style: "SOLID", colorStyle: { rgbColor: C_BORDER } }, left: { style: "SOLID", colorStyle: { rgbColor: C_BORDER } }, right: { style: "SOLID", colorStyle: { rgbColor: C_BORDER } }, innerHorizontal: { style: "SOLID", colorStyle: { rgbColor: C_BORDER } }, innerVertical: { style: "SOLID", colorStyle: { rgbColor: C_BORDER } } } },
  ];

  if (studentCount > 0) {
    reqs.push(
      { repeatCell: { range: { sheetId, startRowIndex: firstStudentRow, endRowIndex: lastStudentRow, startColumnIndex: 0, endColumnIndex: totalCols }, cell: { userEnteredFormat: { backgroundColor: C_WHITE, textFormat: { fontSize: 10, foregroundColor: C_DATA_FG }, horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE" } }, fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)" } },
      { repeatCell: { range: { sheetId, startRowIndex: firstStudentRow, endRowIndex: lastStudentRow, startColumnIndex: 0, endColumnIndex: 2 }, cell: { userEnteredFormat: { horizontalAlignment: "LEFT" } }, fields: "userEnteredFormat.horizontalAlignment" } },
    );
    for (let i = 0; i < studentCount; i++) {
      if (i % 2 === 1) {
        reqs.push({
          repeatCell: {
            range: { sheetId, startRowIndex: firstStudentRow + i, endRowIndex: firstStudentRow + i + 1, startColumnIndex: 0, endColumnIndex: totalCols },
            cell: { userEnteredFormat: { backgroundColor: C_ALT_BG } },
            fields: "userEnteredFormat.backgroundColor",
          },
        });
      }
    }
  }

  reqs.push(
    { repeatCell: { range: { sheetId, startRowIndex: dailyTotalRow, endRowIndex: dailyTotalRow + 1, startColumnIndex: 0, endColumnIndex: totalCols }, cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: C_DATA_FG }, horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE" } }, fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)" } },
    { repeatCell: { range: { sheetId, startRowIndex: teacherRowStart, endRowIndex: teacherRowEnd, startColumnIndex: 0, endColumnIndex: totalCols }, cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: C_DATA_FG }, horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", wrapStrategy: "WRAP" } }, fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)" } },
  );

  return reqs;
}

export const saveAttendanceToSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const [yStr, mStr] = data.month.split("-");
    const year = parseInt(yStr, 10);
    const monthIdx = parseInt(mStr, 10) - 1;
    const dayOfMonth = parseInt(data.date.slice(8, 10), 10);
    const mShort = MONTHS_SHORT[monthIdx];
    const targetSerial = serialFromYMD(year, monthIdx, dayOfMonth);

    const subjectTab = sanitizeTab(data.subjectName);
    const encodedSubject = encodeURIComponent(subjectTab);

    let spreadsheetId = data.spreadsheetId ?? null;
    let sheets: SheetProp[] = [];

    const createWorkbook = async () => {
      const title = sanitizeTab(`EC - ${mShort} ${year} - ${data.batchName}`);
      const created = await gw(`/spreadsheets`, {
        method: "POST",
        body: JSON.stringify({
          properties: { title },
          sheets: [
            { properties: { title: subjectTab, gridProperties: { rowCount: 100, columnCount: 40 } } },
            { properties: { title: KEY_TAB, gridProperties: { rowCount: 20, columnCount: 5 } } },
          ],
        }),
      });
      spreadsheetId = created.spreadsheetId as string;
      sheets = (created.sheets || []) as SheetProp[];
      const keySheetId = sheets.find((s) => s.properties.title === KEY_TAB)?.properties.sheetId;
      if (keySheetId !== undefined) {
        await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify({ requests: buildKeyTabRequests(keySheetId) }),
        });
      }
    };

    if (!spreadsheetId) {
      await createWorkbook();
    } else {
      try {
        const meta = await gw(`/spreadsheets/${spreadsheetId}?fields=sheets.properties`);
        sheets = (meta.sheets || []) as SheetProp[];
      } catch (e: any) {
        if (String(e?.message || "").startsWith("Sheets API 404")) {
          spreadsheetId = null;
          await createWorkbook();
        } else {
          throw e;
        }
      }
      if (spreadsheetId && !sheets.find((s) => s.properties.title === KEY_TAB)) {
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
      if (spreadsheetId && !sheets.find((s) => s.properties.title === subjectTab)) {
        const r = await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify({ requests: [{ addSheet: { properties: { title: subjectTab, gridProperties: { rowCount: 100, columnCount: 40 } } } }] }),
        });
        const newId = r.replies?.[0]?.addSheet?.properties?.sheetId as number | undefined;
        if (newId !== undefined) sheets.push({ properties: { title: subjectTab, sheetId: newId } });
      }
    }

    const subjectSheetId = sheets.find((s) => s.properties.title === subjectTab)?.properties.sheetId;
    if (subjectSheetId === undefined) throw new Error("Failed to resolve subject tab");

    // Read existing values to merge with new data
    const existingResp = await gw(
      `/spreadsheets/${spreadsheetId}/values/${encodedSubject}!A1:ZZ1000?valueRenderOption=UNFORMATTED_VALUE`,
    );
    const existingValues = (existingResp.values || []) as unknown[][];

    // Extract existing date serials from row 2
    const dateSerials: number[] = [];
    const row2 = existingValues[1] || [];
    for (let i = 2; i < row2.length; i++) {
      const v = row2[i];
      if (typeof v === "number" && v > 40000 && v < 80000) dateSerials.push(v);
      else break;
    }

    type StuRow = { id: string; name: string; days: Record<number, unknown>; gender: string };
    const studentList: StuRow[] = [];
    const teacherByDate: Record<number, string> = {};
    let teacherRowIdx = -1;

    for (let i = 4; i < existingValues.length; i++) {
      const r = existingValues[i] || [];
      const sid = r[0];
      if (sid === "Subject Teacher's Name") { teacherRowIdx = i; break; }
      if (!sid || sid === "Daily Total") continue;
      const days: Record<number, unknown> = {};
      for (let di = 0; di < dateSerials.length; di++) {
        const cell = r[2 + di];
        if (cell !== undefined && cell !== null && cell !== "") days[dateSerials[di]] = cell;
      }
      studentList.push({ id: String(sid), name: String(r[1] ?? ""), days, gender: "" });
    }
    if (teacherRowIdx >= 0) {
      const tr = existingValues[teacherRowIdx] || [];
      for (let di = 0; di < dateSerials.length; di++) {
        const v = tr[2 + di];
        if (v !== undefined && v !== null && v !== "") teacherByDate[dateSerials[di]] = String(v);
      }
    }

    // Add today's column if missing, keep sorted
    if (!dateSerials.includes(targetSerial)) dateSerials.push(targetSerial);
    dateSerials.sort((a, b) => a - b);

    // Update teacher only for the marked date (per-day)
    const teacherForToday = data.rows.find((r) => r.teacher)?.teacher ?? "";
    if (teacherForToday) teacherByDate[targetSerial] = teacherForToday;

    // Merge incoming students
    const byId = new Map(studentList.map((s) => [s.id, s]));
    for (const r of data.rows) {
      let stu = byId.get(r.studentId);
      if (!stu) {
        stu = { id: r.studentId, name: r.name, days: {}, gender: r.gender ?? "" };
        byId.set(r.studentId, stu);
        studentList.push(stu);
      } else {
        stu.name = r.name;
        if (r.gender) stu.gender = r.gender;
      }
      stu.days[targetSerial] = r.status === "Present" ? 1 : 0;
    }

    const genderRank = (g: string) =>
      g === "Male" ? 0 : g === "Female" ? 1 : 2;
    studentList.sort((a, b) => {
      const gr = genderRank(a.gender) - genderRank(b.gender);
      if (gr !== 0) return gr;
      const an = parseInt(a.id, 10);
      const bn = parseInt(b.id, 10);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.id.localeCompare(b.id);
    });

    const dateCount = dateSerials.length;
    const totalCols = 2 + dateCount + 2;
    const absentColL = colLetter(2 + dateCount + 1);
    const presentColL = colLetter(2 + dateCount + 2);
    const firstDayColL = colLetter(3);
    const lastDayColL = colLetter(2 + dateCount);

    const row1: unknown[] = [`${data.subjectName} And ${mShort}`, ""];
    row1.push(
      `=IFERROR(CONCATENATE("  Enter ", 'Attendance key'!$B$7, " for ", 'Attendance key'!$C$7, ", ", 'Attendance key'!$B$8, " for ", 'Attendance key'!$C$8, ". Use the 'Attendance key' tab to customise."),"")`,
    );
    while (row1.length < totalCols) row1.push("");

    const row2Out: unknown[] = [data.batchName, ""];
    for (const s of dateSerials) row2Out.push(s);
    row2Out.push(`='Attendance key'!$C8`, "Present");

    const row3Out: unknown[] = ["", ""];
    for (let i = 0; i < dateCount; i++) row3Out.push(`=${colLetter(3 + i)}2`);
    row3Out.push(`='Attendance key'!$B8`, `='Attendance key'!$B7`);

    const row4Out: unknown[] = ["", ""];
    for (let i = 0; i < dateCount; i++) row4Out.push("");
    row4Out.push("", "");

    const studentRowsOut: unknown[][] = studentList.map((stu, idx) => {
      const excelRow = 5 + idx;
      const out: unknown[] = [stu.id, stu.name];
      for (const s of dateSerials) {
        const v = stu.days[s];
        out.push(v === undefined || v === null || v === "" ? "" : v);
      }
      out.push(`=COUNTIF($${firstDayColL}${excelRow}:$${lastDayColL}${excelRow},$${absentColL}$3)`);
      out.push(`=COUNTIF($${firstDayColL}${excelRow}:$${lastDayColL}${excelRow},$${presentColL}$3)`);
      return out;
    });

    const firstData = 5;
    const lastData = 5 + studentList.length - 1;
    const dailyTotalRow: unknown[] = ["Daily Total", ""];
    for (let i = 0; i < dateCount; i++) {
      const c = colLetter(3 + i);
      dailyTotalRow.push(studentList.length > 0 ? `=COUNTIF(${c}${firstData}:${c}${lastData},$${presentColL}$3)` : 0);
    }
    dailyTotalRow.push("", "");

    const teacherRow: unknown[] = ["Subject Teacher's Name", ""];
    for (const s of dateSerials) teacherRow.push(teacherByDate[s] ?? "");
    teacherRow.push("", "");
    const blankCols: unknown[] = ["", ""].concat(Array(dateCount + 2).fill(""));

    const fullMatrix = [row1, row2Out, row3Out, row4Out, ...studentRowsOut, dailyTotalRow, teacherRow, [...blankCols], [...blankCols], [...blankCols]];

    await gw(`/spreadsheets/${spreadsheetId}/values/${encodedSubject}!A1:ZZ1000:clear`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await gw(`/spreadsheets/${spreadsheetId}/values/${encodedSubject}!A1?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: JSON.stringify({ values: fullMatrix }),
    });

    // Unmerge then re-apply formatting (idempotent)
    await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [
          { unmergeCells: { range: { sheetId: subjectSheetId, startRowIndex: 0, endRowIndex: 80, startColumnIndex: 0, endColumnIndex: 60 } } },
        ],
      }),
    });
    await gw(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: buildFormattingRequests({ sheetId: subjectSheetId, dateCount, studentCount: studentList.length }),
      }),
    });

    return {
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${subjectSheetId}`,
      rowsSaved: data.rows.length,
    };
  });
