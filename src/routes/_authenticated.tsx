import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyCollege } from "@/hooks/use-college";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const college = await fetchMyCollege();
    if (!college || !college.setup_completed) throw redirect({ to: "/setup" });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const hydrate = useData((s) => s.hydrate);
  const init = useAuth((s) => s.init);
  useEffect(() => {
    init();
    hydrate();
  }, [hydrate, init]);
  return <Outlet />;
}
