import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { NotificationType } from "@/lib/notification-templates"

export type { NotificationType }

interface CreateNotificationParams {
  userId: string
  recipientType?: "manager" | "tenant"
  type: NotificationType
  title: string
  message: string
  link?: string
  relatedId?: string
  /** Optional Supabase client. Pass a service-role client from contexts without a
   * user session (e.g. Stripe webhooks). Defaults to the cookie-based server client. */
  client?: SupabaseClient
}

export async function createNotification({
  userId,
  recipientType = "manager",
  type,
  title,
  message,
  link,
  relatedId,
  client,
}: CreateNotificationParams) {
  const supabase = client ?? (await createClient())

  const { data, error } = await supabase.from("notifications").insert({
    user_id: userId,
    recipient_type: recipientType,
    type,
    title,
    message,
    link: link || null,
    related_id: relatedId || null,
    is_read: false,
  }).select().single()

  if (error) {
    console.error("[v0] Failed to create notification:", error)
    return null
  }

  return data
}

export { notificationTemplates } from "@/lib/notification-templates"
