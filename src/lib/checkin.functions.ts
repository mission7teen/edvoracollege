import { createServerFn } from "@tanstack/react-start";

export const markCheckinByStudentId = createServerFn({ method: "POST" })
  .inputValidator((input: { studentId: string }) => {
    if (!input?.studentId || typeof input.studentId !== "string") {
      throw new Error("studentId is required");
    }
    const sid = input.studentId.trim().slice(0, 64);
    if (!/^[A-Za-z0-9_\-]+$/.test(sid)) throw new Error("Invalid studentId");
    return { studentId: sid };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .select("id, student_id, full_name, batch_id, course_id, status")
      .eq("student_id", data.studentId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!student) throw new Error("Student not found");
    if (student.status !== "Active") throw new Error("Student is not active");

    const today = new Date().toISOString().slice(0, 10);

    // Idempotent: if a record exists today for this student, set Present; else insert.
    const { data: existing } = await supabaseAdmin
      .from("attendance")
      .select("id, status")
      .eq("student_id", student.id)
      .eq("date", today)
      .maybeSingle();

    let alreadyPresent = false;
    if (existing) {
      alreadyPresent = existing.status === "Present";
      if (!alreadyPresent) {
        const { error: uErr } = await supabaseAdmin
          .from("attendance")
          .update({ status: "Present" })
          .eq("id", existing.id);
        if (uErr) throw new Error(uErr.message);
      }
    } else {
      const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const { error: iErr } = await supabaseAdmin.from("attendance").insert({
        id,
        student_id: student.id,
        batch_id: student.batch_id,
        course_id: student.course_id,
        date: today,
        status: "Present",
        remarks: "NFC check-in",
      });
      if (iErr) throw new Error(iErr.message);
    }

    return {
      ok: true,
      alreadyPresent,
      date: today,
      student: {
        studentId: student.student_id,
        fullName: student.full_name,
      },
    };
  });