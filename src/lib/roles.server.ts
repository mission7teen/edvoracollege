export async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("is_admin");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}
