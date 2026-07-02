import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Recipient = {
  studentName: string;
  studentCode: string;
  guardianName?: string;
  guardianPhone: string;
  status: "Present" | "Absent";
};

function normalizePhone(raw: string): number | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "94" + d.slice(1);
  if (d.length === 9) d = "94" + d;
  if (d.length < 10 || d.length > 15) return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

export const sendAttendanceSMS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      date: string;
      batchName: string;
      subjectName: string;
      collegeName?: string;
      sender?: string;
      recipients: Recipient[];
    }) => {
      if (!input || !Array.isArray(input.recipients)) throw new Error("recipients required");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GATEWAYAPI_API_KEY = process.env.GATEWAYAPI_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!GATEWAYAPI_API_KEY) throw new Error("GatewayAPI connection is not configured");

    const college = data.collegeName || "EDVORA COLLEGE";
    // Numeric sender (MSISDN without +) — max 15 digits. Alphanumeric max 11 chars.
    const rawSender = (data.sender || "94716126128").trim();
    const isNumeric = /^\+?\d+$/.test(rawSender);
    const sender = isNumeric
      ? rawSender.replace(/\D/g, "").slice(0, 15)
      : rawSender.slice(0, 11);
    const url = "https://connector-gateway.lovable.dev/gatewayapi/mobile/multi";

    const messages: Array<{ sender: string; recipient: number; message: string; reference?: string }> = [];
    let skipped = 0;
    for (const r of data.recipients) {
      const phone = normalizePhone(r.guardianPhone);
      if (!phone) { skipped++; continue; }
      const greet = r.guardianName ? `Dear ${r.guardianName},` : "Dear Parent,";
      const line =
        r.status === "Present"
          ? `Your child ${r.studentName} (${r.studentCode}) was marked PRESENT for ${data.subjectName} on ${data.date}.`
          : `Your child ${r.studentName} (${r.studentCode}) was marked ABSENT for ${data.subjectName} on ${data.date}. Please contact the college if unexpected.`;
      const message = `${greet} ${line} Batch: ${data.batchName}. - ${college}`;
      messages.push({ sender, recipient: phone, message });
    }

    if (!messages.length) {
      return { sent: 0, skipped, failed: 0, total: data.recipients.length, errors: [] as string[] };
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GATEWAYAPI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });
      const text = await res.text();
      if (!res.ok) {
        failed = messages.length;
        errors.push(`${res.status}: ${text.slice(0, 200)}`);
      } else {
        sent = messages.length;
      }
    } catch (e: any) {
      failed = messages.length;
      errors.push(e?.message ?? "send error");
    }

    return { sent, skipped, failed, total: data.recipients.length, errors: errors.slice(0, 5) };
  });