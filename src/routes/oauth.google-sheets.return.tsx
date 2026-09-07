import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google-sheets/return")({
  component: OAuthReturn,
  head: () => ({
    meta: [
      { title: "Connecting Google Sheets · EDVORA COLLEGE" },
      { name: "description", content: "Finishing the Google Sheets sign-in for your college." },
      { property: "og:title", content: "Connecting Google Sheets · EDVORA COLLEGE" },
      {
        property: "og:description",
        content: "Finishing the Google Sheets sign-in for your college.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function OAuthReturn() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      code?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_sheets", code: code ?? null },
        window.location.origin,
      );
      window.close();
    };
    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Sign-in did not complete.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("appUserConnectorOAuthComplete");
        return;
      }
      setMessage("Sign-in completed without a code.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    notify("appUserConnectorOAuthComplete", code);
  }, []);

  return (
    <main className="min-h-screen grid place-items-center p-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
