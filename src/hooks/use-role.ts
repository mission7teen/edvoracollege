import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_PAGE_IDS } from "@/lib/permissions";

export type AppRole = "admin" | "staff";

export interface RoleState {
  loading: boolean;
  role: AppRole | null;
  roleName: string | null;
  isAdmin: boolean;
  pages: string[];
  can: (page: string) => boolean;
}

/**
 * Reads the signed-in user's role (user_roles) plus their assigned access role
 * (user_access -> app_roles) which decides which pages they may open.
 * If no roles exist at all yet, the signed-in user is treated as admin so the
 * first account can bootstrap the system (mirrors the `is_admin()` DB function).
 */
export function useRole(): RoleState {
  const [state, setState] = useState<Omit<RoleState, "can">>({
    loading: true,
    role: null,
    roleName: null,
    isAdmin: false,
    pages: [],
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        if (!cancelled)
          setState({ loading: false, role: null, roleName: null, isAdmin: false, pages: [] });
        return;
      }

      const [{ data: mine }, { count }, { data: access }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("user_roles").select("id", { count: "exact", head: true }),
        supabase.from("user_access").select("role_id").eq("user_id", uid).maybeSingle(),
      ]);

      const roles = (mine ?? []).map((r) => r.role as AppRole);
      const noRolesYet = (count ?? 0) === 0;
      const isAdmin = roles.includes("admin") || noRolesYet;

      let pages: string[] = isAdmin ? ALL_PAGE_IDS : [];
      let roleName: string | null = isAdmin ? "Administrator" : null;

      const roleId = (access as { role_id?: string } | null)?.role_id;
      if (roleId) {
        const { data: def } = await supabase
          .from("app_roles")
          .select("name, pages, is_admin")
          .eq("id", roleId)
          .maybeSingle();
        if (def) {
          roleName = def.name;
          pages = def.is_admin ? ALL_PAGE_IDS : (def.pages as string[]) ?? [];
        }
      } else if (!isAdmin) {
        const { data: def } = await supabase
          .from("app_roles")
          .select("name, pages")
          .eq("id", "staff")
          .maybeSingle();
        roleName = def?.name ?? "Staff";
        pages = (def?.pages as string[]) ?? ["dashboard", "attendance", "settings"];
      }

      if (!cancelled) {
        setState({
          loading: false,
          role: isAdmin ? "admin" : roles[0] ?? "staff",
          roleName,
          isAdmin,
          pages,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...state,
    can: (page: string) => state.isAdmin || state.pages.includes(page),
  };
}
