import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("edvora-auth-v1");
      const authed = raw ? JSON.parse(raw)?.state?.isAuthed : false;
      if (!authed) throw redirect({ to: "/login" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as object)) throw e;
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const hydrate = useData((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return <Outlet />;
}
