import { encryptConnectionKey, decryptConnectionKey } from "@/lib/connection-crypto.server";

/** The college (tenant) the signed-in user belongs to. */
export async function getCollegeIdForUser(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("college_members")
    .select("college_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.college_id ?? null;
}

export async function saveConnectionKeyForCollege(
  collegeId: string,
  userId: string,
  connectorId: string,
  connectionAPIKey: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any).from("app_user_connections").upsert(
    {
      college_id: collegeId,
      user_id: userId,
      connector_id: connectorId,
      connection_key_ciphertext: encryptConnectionKey(connectionAPIKey),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "college_id,connector_id" },
  );
  if (error) throw error;
}

export async function getConnectionRowForCollege(collegeId: string, connectorId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("app_user_connections")
    .select("connection_key_ciphertext, updated_at, user_id")
    .eq("college_id", collegeId)
    .eq("connector_id", connectorId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    connectionAPIKey: decryptConnectionKey(data.connection_key_ciphertext as string),
    updatedAt: data.updated_at as string,
    userId: data.user_id as string,
  };
}

export async function getConnectionKeyForCollege(collegeId: string, connectorId: string) {
  const row = await getConnectionRowForCollege(collegeId, connectorId);
  return row?.connectionAPIKey ?? null;
}

export async function deleteConnectionForCollege(collegeId: string, connectorId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any)
    .from("app_user_connections")
    .delete()
    .eq("college_id", collegeId)
    .eq("connector_id", connectorId);
  if (error) throw error;
}
