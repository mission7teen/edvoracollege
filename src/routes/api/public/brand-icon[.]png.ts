import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/** Serves the college logo saved in settings so PWA/webapp icons stay in sync. */
export const Route = createFileRoute("/api/public/brand-icon.png")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const fallback = new URL("/icon-512x512.png", request.url).toString();
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("app_settings")
            .select("data")
            .eq("id", "default")
            .maybeSingle();
          const logo = ((data?.data ?? {}) as Record<string, string>)["logo"] ?? "";

          if (logo.startsWith("data:")) {
            const [meta, b64] = logo.split(",", 2);
            const type = meta?.slice(5).split(";")[0] || "image/png";
            const bytes = Uint8Array.from(atob(b64 ?? ""), (c) => c.charCodeAt(0));
            return new Response(bytes, {
              headers: { "Content-Type": type, "Cache-Control": "public, max-age=300" },
            });
          }
          if (/^https?:\/\//.test(logo)) return Response.redirect(logo, 302);
        } catch {
          /* fall through to the bundled icon */
        }
        return Response.redirect(fallback, 302);
      },
    },
  },
});
