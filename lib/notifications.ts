import "server-only"
import { createServiceClient } from "@/lib/supabase/service"
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
  /** Optional Supabase client override. Defaults to a service-role client so
   * notifications can be written for any recipient (managers notify tenants,
   * tenants notify managers, and the unauthenticated invite-accept flow notifies
   * the manager) — all cross-user inserts the RLS "auth.uid() = user_id" policy
   * would otherwise reject. The user_id is always derived server-side. */
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
  const supabase = client ?? createServiceClient()

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
