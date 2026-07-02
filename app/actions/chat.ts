"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { createNotification, notificationTemplates } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"
import { newMessageEmail, siteUrl } from "@/lib/email-templates"
import { getFromName } from "@/lib/profile"
import { CHAT_BUCKET, CHAT_ATTACHMENT_MAX_BYTES } from "@/lib/chat-attachments"

export interface ChatAttachment {
  path: string
  name: string
  type: string
  size: number
}

/** Upload a chat file to the private bucket under a per-tenant prefix. */
async function uploadChatFile(
  tenantId: string,
  file: File,
): Promise<{ ok: boolean; attachment?: ChatAttachment; error?: string }> {
  if (!file || file.size === 0) return { ok: false, error: "No file selected." }
  if (file.size > CHAT_ATTACHMENT_MAX_BYTES) return { ok: false, error: "File is too large (max 10 MB)." }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100) || "file"
  const path = `chat/${tenantId}/${Date.now()}-${safeName}`

  const svc = createServiceClient()
  const { error } = await svc.storage.from(CHAT_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  })
  if (error) {
    console.error("[v0] chat upload error:", error)
    return { ok: false, error: "Could not upload file." }
  }

  return {
    ok: true,
    attachment: { path, name: file.name, type: file.type || "application/octet-stream", size: file.size },
  }
}

/** Tenant uploads a chat attachment (before sending the message). */
export async function uploadTenantChatAttachment(formData: FormData) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false as const, error: "Not authorized." }
  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false as const, error: "No file selected." }
  return uploadChatFile(tenant.id, file)
}

/** Manager uploads a chat attachment for a specific tenant thread. */
export async function uploadManagerChatAttachment(tenantId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Not authorized." }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .eq("user_id", user.id)
    .single()
  if (!tenant) return { ok: false as const, error: "Tenant not found." }

  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false as const, error: "No file selected." }
  return uploadChatFile(tenant.id, file)
}

/**
 * Tenant sends a chat message to their property manager.
 * Stored as an inbound message (from the manager's perspective) with sender_role = 'tenant'.
 * Fires a generic in-app notification to the manager.
 */
export async function sendTenantMessage(
  body: string,
  attachment?: ChatAttachment,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = body.trim()
  if (!trimmed && !attachment) return { ok: false, error: "Message cannot be empty." }

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
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_type: attachment?.type ?? null,
    attachment_size: attachment?.size ?? null,
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
  attachment?: ChatAttachment,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = body.trim()
  if (!trimmed && !attachment) return { ok: false, error: "Message cannot be empty." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authorized." }

  // Verify the tenant belongs to this manager and grab portal link info.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, property_id, auth_user_id, email, first_name, last_name")
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
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_type: attachment?.type ?? null,
    attachment_size: attachment?.size ?? null,
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

    // Also email the tenant so they know to check the portal
    if (tenant.email) {
      const fromName = await getFromName(supabase, user.id)
      const tpl = newMessageEmail({
        firstName: tenant.first_name,
        portalUrl: siteUrl("/portal/messages"),
      })
      await sendEmail({ to: tenant.email, subject: tpl.subject, html: tpl.html, fromName }).catch(() => {})
    }
  }

  revalidatePath(`/dashboard/messages`)
  return { ok: true }
}
