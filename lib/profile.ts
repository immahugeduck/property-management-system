import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Fetches the manager's configured email display name from user_profiles.
 * Falls back to "Property HQ" if not set. Accepts any Supabase client
 * (server client or service role) so it works in actions and cron routes.
 */
export async function getFromName(supabase: SupabaseClient, userId: string): Promise<string> {
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
