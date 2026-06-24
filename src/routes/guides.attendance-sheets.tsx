import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/guides/attendance-sheets")({
  head: () => ({
    meta: [
      {
        title:
          "Automated Attendance Sheets: A Practical Guide for Teachers | Edvora",
      },
      {
        name: "description",
        content:
          "Learn how to replace paper attendance sheets with an automated attendance management system that syncs to Google Sheets — per subject, per batch, per month.",
      },
      {
        property: "og:title",
        content:
          "Automated Attendance Sheets: A Practical Guide for Teachers",
      },
      {
        property: "og:description",
        content:
          "Move from manual paper sheets to a digital attendance management system. Step-by-step Google Sheets automation for classrooms.",
      },
      { property: "og:type", content: "article" },
      {
        name: "twitter:title",
        content:
          "Automated Attendance Sheets: A Practical Guide for Teachers",
      },
      {
        name: "twitter:description",
        content:
          "Step-by-step guide to automating attendance sheets with Google Sheets and the Edvora platform.",
      },
    ],
  }),
  component: AttendanceSheetsGuide,
});

function AttendanceSheetsGuide() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-foreground">
      <article className="prose prose-neutral max-w-none dark:prose-invert">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Guide · Attendance management
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Automated Attendance Sheets: A Practical Guide for Teachers
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Paper attendance sheets are slow, error-prone, and impossible to
          analyze. This guide shows how to replace them with an automated
          attendance management system that records attendance digitally and
          syncs straight to Google Sheets — organized per subject, per batch,
          and per month.
        </p>

        <h2>Why move off paper attendance sheets</h2>
        <p>
          A traditional attendance sheet captures one piece of data: was the
          student in the room. Everything else — totals, trends, late arrivals,
          subject-by-subject participation — has to be re-entered by hand at
          the end of every term. For a college with multiple batches and
          subjects, that is hours of clerical work each week.
        </p>
        <p>An automated attendance system fixes three problems at once:</p>
        <ul>
          <li>
            <strong>Capture is faster.</strong> Teachers tap a name or scan a
            student QR code instead of writing in a register.
          </li>
          <li>
            <strong>Records are searchable.</strong> A digital backend can
            answer "how many classes has student X missed this month?" instantly.
          </li>
          <li>
            <strong>Reporting is automatic.</strong> Monthly attendance reports
            generate themselves into a Google Sheet you can share with parents
            or administration.
          </li>
        </ul>

        <h2>What a good attendance sheet template includes</h2>
        <p>
          If you are designing an attendance sheet — whether on paper or in
          Google Sheets — these are the columns that matter:
        </p>
        <ul>
          <li>Student name and roll/admission number</li>
          <li>One column per class date for the month</li>
          <li>An attendance key (P = present, A = absent, L = late, E = excused)</li>
          <li>A per-student total of present days using <code>COUNTIF</code></li>
          <li>A per-day total at the bottom of each date column</li>
          <li>Subject, batch, and teacher name in the header</li>
        </ul>
        <p>
          Edvora's exported sheets follow exactly this layout, so they read
          like a familiar register but the totals fill themselves in.
        </p>

        <h2>How attendance automation works in Edvora</h2>
        <p>
          The Edvora attendance management system stores every attendance
          record in a secure database and, on demand, pushes a formatted copy
          to Google Sheets. The flow looks like this:
        </p>
        <ol>
          <li>
            <strong>Mark attendance in class.</strong> Open the day's class on
            your phone or laptop and mark each student present, absent, late,
            or excused. QR scanning is supported for large batches.
          </li>
          <li>
            <strong>Records save instantly.</strong> Every change syncs to the
            cloud database, so you do not lose a class to a dead battery.
          </li>
          <li>
            <strong>Export to Google Sheets.</strong> From the attendance
            screen, tap <em>Save to Sheets</em>. The system creates (or
            updates) a spreadsheet named <code>EC - {"{Month YYYY}"} - {"{Batch}"}</code>{" "}
            with one tab per subject.
          </li>
          <li>
            <strong>Share or download.</strong> The spreadsheet lives in your
            connected Google account, so you can share it with administration,
            print it, or download a CSV.
          </li>
        </ol>

        <h2>Anatomy of the exported sheet</h2>
        <p>Each subject tab in the exported workbook contains:</p>
        <ul>
          <li>A header row with the dates of every class held that month</li>
          <li>A weekday row so absences on Mondays vs Fridays stand out</li>
          <li>One row per student with their marked status per date</li>
          <li>
            A <code>COUNTIF</code> column that totals each student's present
            days against the attendance-key tab
          </li>
          <li>A daily-total row that sums present students per date</li>
          <li>A footer row for the teacher's name and signature</li>
        </ul>
        <p>
          Because the totals are real spreadsheet formulas, you can edit a
          cell in the sheet and the totals recalculate — useful when a
          student brings a doctor's note the next day.
        </p>

        <h2>Five tips for rolling out automated attendance</h2>
        <ol>
          <li>
            <strong>Start with one batch.</strong> Pick a single subject and
            batch for the first month so teachers can adjust without pressure.
          </li>
          <li>
            <strong>Print the QR cards once.</strong> A laminated QR card per
            student turns roll-call into a 30-second scan.
          </li>
          <li>
            <strong>Decide your codes upfront.</strong> Agree on what
            counts as Late vs Absent before the term starts.
          </li>
          <li>
            <strong>Export weekly, not just monthly.</strong> A weekly export
            catches data-entry mistakes while they are still easy to fix.
          </li>
          <li>
            <strong>Share the sheet with parents read-only.</strong> Parents
            stop emailing for updates once they can see the live sheet.
          </li>
        </ol>

        <h2>FAQ</h2>
        <h3>Is an automated attendance sheet just a Google Sheet?</h3>
        <p>
          The sheet is the report, not the source of truth. The source of
          truth is the attendance database, which is what makes totals,
          analytics, and per-student history possible. Google Sheets is the
          shareable, printable view.
        </p>
        <h3>Can I still use paper as a backup?</h3>
        <p>
          Yes. Many teachers print the previous month's exported sheet as a
          fallback in case Wi-Fi is down on a given day. Mark on paper, then
          enter into the system at the end of class.
        </p>
        <h3>Does it work for college, school, and training-center classes?</h3>
        <p>
          Yes — anywhere you have batches and subjects. Edvora was designed
          for A/L Commerce classes but the structure (students → batch →
          subject → date) is the same for any teaching context.
        </p>

        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="!mt-0">Ready to automate your attendance?</h2>
          <p>
            Sign in to Edvora and mark your first class — the Google Sheets
            export is one tap away.
          </p>
          <Link
            to="/login"
            className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open Edvora
          </Link>
        </div>
      </article>
    </main>
  );
}