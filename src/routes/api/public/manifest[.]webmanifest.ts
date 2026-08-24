import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/** Dynamic PWA manifest so the installed app uses the college's uploaded logo. */
export const Route = createFileRoute("/api/public/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        let name = "EDVORA COLLEGE — Attendance";
        let short = "EDVORA";
        let hasLogo = false;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("app_settings")
            .select("data")
            .eq("id", "default")
            .maybeSingle();
          const s = (data?.data ?? {}) as Record<string, string>;
          if (s["name"]) {
            name = `${s["name"]} — Attendance`;
            short = s["name"].split(" ")[0] ?? short;
          }
          hasLogo = Boolean(s["logo"]);
        } catch {
          /* defaults */
        }

        const icons = hasLogo
          ? [
              { src: "/api/public/brand-icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
              { src: "/api/public/brand-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
              { src: "/api/public/brand-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ]
          : [
              { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
              { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
              { src: "/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ];

        return new Response(
          JSON.stringify({
            name,
            short_name: short,
            description: "Student attendance, exams, and payments management.",
            start_url: "/",
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#1e4fd8",
            orientation: "portrait-primary",
            scope: "/",
            icons,
          }),
          {
            headers: {
              "Content-Type": "application/manifest+json",
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      },
    },
  },
});
