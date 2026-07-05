import { createServerFn } from "@tanstack/react-start";

export const getStudentPortfolio = createServerFn({ method: "GET" })
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
      .select(
        "id, student_id, full_name, photo_url, gender, dob, phone, email, address, guardian_name, guardian_phone, course_id, batch_id, registration_date, status"
      )
      .eq("student_id", data.studentId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!student) throw new Error("Student not found");

    let courseName: string | null = null;
    let batchName: string | null = null;
    if (student.course_id) {
      const { data: c } = await supabaseAdmin
        .from("courses")
        .select("name")
        .eq("id", student.course_id)
        .maybeSingle();
      courseName = c?.name ?? null;
    }
    if (student.batch_id) {
      const { data: b } = await supabaseAdmin
        .from("batches")
        .select("name")
        .eq("id", student.batch_id)
        .maybeSingle();
      batchName = b?.name ?? null;
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);
    const { data: att } = await supabaseAdmin
      .from("attendance")
      .select("date, status")
      .eq("student_id", student.id)
      .gte("date", sinceStr)
      .order("date", { ascending: false });

    const records = att ?? [];
    const present = records.filter((r) => r.status === "Present").length;
    const total = records.length;

    // Exam marks (with subject + exam name)
    const { data: marksRows } = await supabaseAdmin
      .from("exam_marks")
      .select("id, marks, grade, exam_id")
      .eq("student_id", student.id);
    const examIds = Array.from(new Set((marksRows ?? []).map((m) => m.exam_id)));
    let examsById: Record<string, any> = {};
    if (examIds.length) {
      const { data: examRows } = await supabaseAdmin
        .from("exams")
        .select("id, name, type, date, max_marks, subject_id")
        .in("id", examIds);
      for (const e of examRows ?? []) examsById[e.id] = e;
    }
    const subjectIds = Array.from(
      new Set(Object.values(examsById).map((e: any) => e.subject_id).filter(Boolean)),
    );
    let subjectNames: Record<string, string> = {};
    if (subjectIds.length) {
      const { data: cs } = await supabaseAdmin
        .from("courses")
        .select("id, name")
        .in("id", subjectIds as string[]);
      for (const c of cs ?? []) subjectNames[c.id] = c.name;
    }
    const marks = (marksRows ?? []).map((m) => {
      const e = examsById[m.exam_id] || {};
      return {
        id: m.id,
        examName: e.name || "",
        examType: e.type || "",
        date: e.date || "",
        subject: e.subject_id ? subjectNames[e.subject_id] || "" : "",
        marks: Number(m.marks) || 0,
        maxMarks: Number(e.max_marks) || 100,
        grade: m.grade || "",
      };
    }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    // Payments
    const { data: paysRows } = await supabaseAdmin
      .from("student_payments")
      .select("id, month, amount, paid_on, package_id")
      .eq("student_id", student.id)
      .order("month", { ascending: false });
    const pkgIds = Array.from(new Set((paysRows ?? []).map((p) => p.package_id).filter(Boolean)));
    let pkgNames: Record<string, string> = {};
    if (pkgIds.length) {
      const { data: pkgs } = await supabaseAdmin
        .from("payment_packages")
        .select("id, name")
        .in("id", pkgIds as string[]);
      for (const p of pkgs ?? []) pkgNames[p.id] = p.name;
    }
    const payments = (paysRows ?? []).map((p) => ({
      id: p.id,
      month: p.month,
      amount: Number(p.amount) || 0,
      paidOn: p.paid_on || "",
      packageName: p.package_id ? pkgNames[p.package_id] || "" : "",
    }));

    return {
      student: {
        id: student.id,
        studentId: student.student_id,
        fullName: student.full_name,
        photoUrl: student.photo_url || "",
        gender: student.gender || "",
        dob: student.dob || "",
        phone: student.phone || "",
        email: student.email || "",
        address: student.address || "",
        guardianName: student.guardian_name || "",
        guardianPhone: student.guardian_phone || "",
        registrationDate: student.registration_date || "",
        status: student.status || "Active",
        courseName,
        batchName,
      },
      attendance: {
        last30: records.slice(0, 10),
        presentCount: present,
        totalCount: total,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      },
      marks,
      payments,
    };
  });

export const markCheckinByStudentId = createServerFn({ method: "POST" })
  .inputValidator((input: { studentId: string }) => {
    if (!input?.studentId || typeof input.studentId !== "string") {
      throw new Error("studentId is required");
    }
    const sid = input.studentId.trim().slice(0, 64);
    if (!/^[A-Za-z0-9_\-]+$/.test(sid)) throw new Error("Invalid studentId");
    return { studentId: sid };
  })
  .handler(async () => {
    throw new Error("NFC public links are read-only and do not mark attendance.");
  });