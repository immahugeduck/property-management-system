import "server-only"

/**
 * Fetches the manager's configured email display name from user_profiles.
 * Falls back to "Property HQ" if not set. Accepts any Supabase client
 * (server client or service role) so it works in actions and cron routes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFromName(supabase: any, userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("from_name")
      .eq("user_id", userId)
      .maybeSingle()
    return (data?.from_name as string | null) || "Property HQ"
  } catch {
    return "Property HQ"
  }
}
