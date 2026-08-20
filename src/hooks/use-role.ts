import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "staff";

export interface RoleState {
  loading: boolean;
  role: AppRole | null;
  isAdmin: boolean;
}

/**
 * Reads the signed-in user's role from the `user_roles` table.
 * If no roles exist at all yet, the signed-in user is treated as admin so the
 * first account can bootstrap the system (mirrors the `is_admin()` DB function).
 */
export function useRole(): RoleState {
  const [state, setState] = useState<RoleState>({
    loading: true,
    role: null,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        if (!cancelled) setState({ loading: false, role: null, isAdmin: false });
        return;
      }

      const [{ data: mine }, { count }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("user_roles").select("id", { count: "exact", head: true }),
      ]);

      const roles = (mine ?? []).map((r) => r.role as AppRole);
      const noRolesYet = (count ?? 0) === 0;
      const isAdmin = roles.includes("admin") || noRolesYet;

      if (!cancelled) {
        setState({
          loading: false,
          role: isAdmin ? "admin" : roles[0] ?? "staff",
          isAdmin,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
