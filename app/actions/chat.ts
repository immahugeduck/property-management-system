"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { createNotification, notificationTemplates } from "@/lib/notifications"

/**
 * Tenant sends a chat message to their property manager.
 * Stored as an inbound message (from the manager's perspective) with sender_role = 'tenant'.
 * Fires a generic in-app notification to the manager.
 */
export async function sendTenantMessage(body: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: "Message cannot be empty." }

  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: "Not authorized." }

  const supabase = await createClient()
  const { error } = await supabase.from("messages").insert({
    user_id: tenant.user_id,
    tenant_id: tenant.id,
    property_id: tenant.property_id ?? null,
    subject: "Portal message",
    body: trimmed,
    direction: "inbound",
    sender_role: "tenant",
    is_read: false,
  })

  if (error) {
    console.error("[v0] sendTenantMessage error:", error)
    return { ok: false, error: "Could not send message." }
  }

  // Notify the manager (uses service client since the row is owned by the manager).
  try {
    const db = createServiceClient()
    const tpl = notificationTemplates.messageReceived(`${tenant.first_name} ${tenant.last_name}`, "Portal message")
    await createNotification({
      client: db,
      userId: tenant.user_id,
      recipientType: "manager",
      relatedId: tenant.id,
      link: `/dashboard/messages?tenant=${tenant.id}`,
      ...tpl,
    })
  } catch (err) {
    console.error("[v0] manager notification error:", err)
  }

  revalidatePath("/portal/messages")
  return { ok: true }
}

/**
 * Manager sends a chat message to a tenant.
 * Stored as an outbound message with sender_role = 'manager'.
 * Fires a generic in-app notification to the tenant (if their portal is active).
 */
export async function sendManagerMessage(
  tenantId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: "Message cannot be empty." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authorized." }

  // Verify the tenant belongs to this manager and grab portal link info.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, property_id, auth_user_id")
    .eq("id", tenantId)
    .eq("user_id", user.id)
    .single()

  if (!tenant) return { ok: false, error: "Tenant not found." }

  const { error } = await supabase.from("messages").insert({
    user_id: user.id,
    tenant_id: tenant.id,
    property_id: tenant.property_id ?? null,
    subject: "Portal message",
    body: trimmed,
    direction: "outbound",
    sender_role: "manager",
    is_read: true,
  })

  if (error) {
    console.error("[v0] sendManagerMessage error:", error)
    return { ok: false, error: "Could not send message." }
  }

  // Notify the tenant if their portal account is active.
  if (tenant.auth_user_id) {
    try {
      const tpl = notificationTemplates.tenantNewMessage()
      await createNotification({
        userId: tenant.auth_user_id,
        recipientType: "tenant",
        relatedId: tenant.id,
        link: `/portal/messages`,
        ...tpl,
      })
    } catch (err) {
      console.error("[v0] tenant notification error:", err)
    }
  }

  revalidatePath(`/dashboard/messages`)
  return { ok: true }
}
