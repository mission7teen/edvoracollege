import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./roles.server";

export type AppRoleValue = "admin" | "staff";

/** The college (tenant) the calling admin belongs to. */
async function callerCollegeId(context: any): Promise<string> {
  const { data, error } = await context.supabase.rpc("current_college_id");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Finish your college setup first");
  return data as string;
}

/** Ids of every account that belongs to the given college. */
async function memberIds(admin: any, collegeId: string): Promise<Set<string>> {
  const { data, error } = await admin
    .from("college_members")
    .select("user_id")
    .eq("college_id", collegeId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((m: { user_id: string }) => m.user_id));
}


/** List every auth user with the roles assigned in the user_roles table. */
export const listUserRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const collegeId = await callerCollegeId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const members = await memberIds(supabaseAdmin, collegeId);

    const { data: usersRes, error: uErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (uErr) throw new Error(uErr.message);

    const { data: roleRows, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role")
      .eq("college_id", collegeId);
    if (rErr) throw new Error(rErr.message);

    const { data: accessRows } = await supabaseAdmin
      .from("user_access")
      .select("user_id, role_id")
      .eq("college_id", collegeId);

    const accessByUser = new Map<string, string>();
    for (const a of accessRows ?? []) {
      if (a.role_id) accessByUser.set(a.user_id, a.role_id);
    }

    const byUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role as string]);
    }

    return (usersRes?.users ?? []).filter((u) => members.has(u.id)).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      fullName: ((u.user_metadata ?? {}) as Record<string, string>)["full_name"] ?? "",
      createdAt: u.created_at ?? "",
      roles: byUser.get(u.id) ?? [],
      accessRoleId: accessByUser.get(u.id) ?? null,
    }));
  });

/** Assign a custom access role (page permissions) to a user. */
export const assignAccessRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; roleId: string }) => {
    const userId = String(input?.userId ?? "");
    const roleId = String(input?.roleId ?? "").trim();
    if (!/^[0-9a-fA-F-]{36}$/.test(userId)) throw new Error("Invalid user");
    if (!roleId) throw new Error("Pick a role");
    return { userId, roleId };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const collegeId = await callerCollegeId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const members = await memberIds(supabaseAdmin, collegeId);
    if (!members.has(data.userId)) throw new Error("That account is not in your college");

    const { data: role, error: roleErr } = await supabaseAdmin
      .from("app_roles")
      .select("id, is_admin, college_id")
      .eq("id", data.roleId)
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!role) throw new Error("Role not found");
    if (role.college_id && role.college_id !== collegeId) throw new Error("Role not found");

    const { error } = await supabaseAdmin
      .from("user_access")
      .upsert({
        user_id: data.userId,
        role_id: data.roleId,
        college_id: collegeId,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);

    // Keep the admin flag (used by RLS) in sync with the assigned role.
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("college_id", collegeId);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: role.is_admin ? "admin" : "staff", college_id: collegeId });

    return { ok: true };
  });


/** Create a new account (admin only) — public sign-ups stay disabled. */
export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; role: AppRoleValue }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const password = String(input?.password ?? "");
    const role = input?.role === "admin" ? "admin" : "staff";
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    return { email, password, role: role as AppRoleValue };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const collegeId = await callerCollegeId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("Account creation failed");

    const { error: mErr } = await supabaseAdmin
      .from("college_members")
      .insert({ user_id: userId, college_id: collegeId });
    if (mErr) throw new Error(mErr.message);

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role, college_id: collegeId });
    if (rErr) throw new Error(rErr.message);

    return { id: userId, email: data.email, role: data.role };
  });

/** Set the role for an existing user. */
export const setUserRole = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; role: AppRoleValue }) => {
    const userId = String(input?.userId ?? "");
    if (!/^[0-9a-fA-F-]{36}$/.test(userId)) throw new Error("Invalid user");
    return { userId, role: (input?.role === "admin" ? "admin" : "staff") as AppRoleValue };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const collegeId = await callerCollegeId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const members = await memberIds(supabaseAdmin, collegeId);
    if (!members.has(data.userId)) throw new Error("That account is not in your college");
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("college_id", collegeId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role, college_id: collegeId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove all roles from a user (revokes console access level). */
export const removeUserRoles = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => {
    const userId = String(input?.userId ?? "");
    if (!/^[0-9a-fA-F-]{36}$/.test(userId)) throw new Error("Invalid user");
    return { userId };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const collegeId = await callerCollegeId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const members = await memberIds(supabaseAdmin, collegeId);
    if (!members.has(data.userId)) throw new Error("That account is not in your college");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("college_id", collegeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
