import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { Tenant } from "@/lib/types"

/**
 * Resolves the tenant record linked to the currently authenticated user.
 * Returns null if the user is not signed in or is not a portal tenant.
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("tenants")
    .select("*, property:properties(*)")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (error || !data) return null
  return data as Tenant
}

/**
 * Determines whether the current user is a manager (owns manager-scoped data)
 * or a tenant (linked via tenants.auth_user_id). Used for routing decisions.
 */
export async function getUserRole(): Promise<"manager" | "tenant" | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  return tenant ? "tenant" : "manager"
}
