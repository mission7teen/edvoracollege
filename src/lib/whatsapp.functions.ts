import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Recipient = {
  studentName: string;
  studentCode: string;
  guardianName?: string;
  guardianPhone: string;
  status: "Present" | "Absent";
};

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "94" + d.slice(1);
  if (d.length === 9) d = "94" + d; // bare 9-digit SL number
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

export const sendAttendanceWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      date: string;
      batchName: string;
      subjectName: string;
      collegeName?: string;
      recipients: Recipient[];
    }) => {
      if (!input || !Array.isArray(input.recipients)) throw new Error("recipients required");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const instanceId = process.env.WAAPI_INSTANCE_ID;
    const token = process.env.WAAPI_TOKEN;
    if (!instanceId || !token) throw new Error("WAAPI is not configured");

    const url = `https://waapi.app/api/v1/instances/${instanceId}/client/action/send-message`;
    const college = data.collegeName || "EDVORA COLLEGE";

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const r of data.recipients) {
      const phone = normalizePhone(r.guardianPhone);
      if (!phone) {
        skipped++;
        continue;
      }
      const chatId = `${phone}@c.us`;
      const greet = r.guardianName ? `Dear ${r.guardianName},` : "Dear Parent,";
      const line =
        r.status === "Present"
          ? `Your child *${r.studentName}* (${r.studentCode}) was marked *PRESENT* for ${data.subjectName} on ${data.date}.`
          : `Your child *${r.studentName}* (${r.studentCode}) was marked *ABSENT* for ${data.subjectName} on ${data.date}. Please contact the college if this is unexpected.`;
      const message = `${greet}\n\n${line}\n\nBatch: ${data.batchName}\n\n— ${college}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ chatId, message }),
        });
        if (!res.ok) {
          failed++;
          const t = await res.text().catch(() => "");
          errors.push(`${r.studentName}: ${res.status} ${t.slice(0, 120)}`);
        } else {
          sent++;
        }
      } catch (e: any) {
        failed++;
        errors.push(`${r.studentName}: ${e?.message ?? "send error"}`);
      }
    }

    return { sent, skipped, failed, total: data.recipients.length, errors: errors.slice(0, 5) };
  });