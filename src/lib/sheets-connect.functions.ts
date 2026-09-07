import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const CONNECTOR_ID = "google_sheets";
export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

/** Starts the Google sign-in for the signed-in user's college. */
export const startSheetsConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientAPIKey = process.env["GOOGLE_SHEETS_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientAPIKey) throw new Error("Google sign-in is not configured yet.");

    const { getCollegeIdForUser, getConnectionKeyForCollege } = await import(
      "@/lib/app-user-connections.server"
    );
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");

    const collegeId = await getCollegeIdForUser(context.userId);
    if (!collegeId) throw new Error("Finish your college setup first.");

    const request = getRequest();
    if (!request) throw new Error("Sign-in must start from the app.");
    const url = new URL(request.url);
    const sandboxHost =
      url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/google-sheets/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const existing = await getConnectionKeyForCollege(collegeId, CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey,
      returnUrl,
      connectionAPIKey: existing ?? undefined,
      credentialsConfiguration: { scopes: SCOPES },
    });
    return { authorizationUrl };
  });

/** Finishes the sign-in and stores the college's Google link (encrypted). */
export const completeSheetsConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { getCollegeIdForUser, saveConnectionKeyForCollege } = await import(
      "@/lib/app-user-connections.server"
    );
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");

    const collegeId = await getCollegeIdForUser(context.userId);
    if (!collegeId) throw new Error("Finish your college setup first.");

    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== CONNECTOR_ID) throw new Error("Sign-in returned the wrong service.");

    await saveConnectionKeyForCollege(collegeId, context.userId, connectorId, connectionAPIKey);
    return { ok: true };
  });

/** Removes this college's Google link. */
export const disconnectSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getCollegeIdForUser, getConnectionKeyForCollege, deleteConnectionForCollege } =
      await import("@/lib/app-user-connections.server");
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");

    const collegeId = await getCollegeIdForUser(context.userId);
    if (!collegeId) return { ok: true };

    const key = await getConnectionKeyForCollege(collegeId, CONNECTOR_ID);
    if (key) {
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: CONNECTOR_ID,
        });
      } catch (e) {
        console.error("[sheets disconnect]", e);
      }
    }
    await deleteConnectionForCollege(collegeId, CONNECTOR_ID);
    return { ok: true };
  });
