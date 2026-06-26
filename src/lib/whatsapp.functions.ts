import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Recipient = {
  guardianPhone: string;
  studentName: string;
  status: string;
  subjectName: string;
  date: string;
  time: string;
};

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  // Sri Lanka default: leading 0 -> 94
  if (p.startsWith("0")) p = "94" + p.slice(1);
  if (p.length < 10 || p.length > 15) return null;
  return p;
}

function fillTemplate(
  tmpl: string,
  vars: { student_name: string; attendance_status: string; subject_name: string; date: string; time: string },
) {
  return tmpl
    .replaceAll("{student_name}", vars.student_name)
    .replaceAll("{attendance_status}", vars.attendance_status)
    .replaceAll("{subject_name}", vars.subject_name)
    .replaceAll("{date}", vars.date)
    .replaceAll("{time}", vars.time);
}

const DEFAULT_TEMPLATE =
  "Dear Parent, Your child {student_name} was marked {attendance_status} for {subject_name} on {date} at {time} at EDVORA COLLEGE.";

export const sendAttendanceWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recipients: Recipient[]; template?: string }) => {
    if (!input || !Array.isArray(input.recipients)) throw new Error("recipients required");
    return {
      recipients: input.recipients.slice(0, 500),
      template: typeof input.template === "string" ? input.template : DEFAULT_TEMPLATE,
    };
  })
  .handler(async ({ data }) => {
    const token = process.env.WAAPI_TOKEN;
    const instanceId = process.env.WAAPI_INSTANCE_ID;
    if (!token || !instanceId) throw new Error("WAAPI is not configured");

    const url = `https://waapi.app/api/v1/instances/${instanceId}/client/action/send-message`;
    let sent = 0;
    let skipped = 0;
    const failures: { to: string; error: string }[] = [];

    for (const r of data.recipients) {
      const phone = normalizePhone(r.guardianPhone || "");
      if (!phone) {
        skipped++;
        continue;
      }
      const chatId = `${phone}@c.us`;
      const message = fillTemplate(data.template, {
        student_name: r.studentName,
        attendance_status: r.status,
        subject_name: r.subjectName,
        date: r.date,
        time: r.time,
      });
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chatId, message }),
        });
        if (!res.ok) {
          const text = await res.text();
          failures.push({ to: phone, error: `${res.status} ${text.slice(0, 200)}` });
        } else {
          sent++;
        }
      } catch (e) {
        failures.push({ to: phone, error: (e as Error).message });
      }
    }

    return { ok: true, sent, skipped, failures };
  });