import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./roles.server";

export type AppRoleValue = "admin" | "staff";


/** List every auth user with the roles assigned in the user_roles table. */
export const listUserRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersRes, error: uErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (uErr) throw new Error(uErr.message);

    const { data: roleRows, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role");
    if (rErr) throw new Error(rErr.message);

    const byUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role as string]);
    }

    return (usersRes?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at ?? "",
      roles: byUser.get(u.id) ?? [],
    }));
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("Account creation failed");

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
