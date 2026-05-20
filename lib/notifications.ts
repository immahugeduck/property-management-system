import { createClient } from "@/lib/supabase/client"

type NotificationType =
  | "payment_received"
  | "payment_due"
  | "payment_overdue"
  | "maintenance_new"
  | "maintenance_updated"
  | "maintenance_completed"
  | "message_received"
  | "lease_expiring"
  | "tenant_added"
  | "general"

interface CreateNotificationParams {
  userId: string
  recipientType?: "manager" | "tenant"
  type: NotificationType
  title: string
  message: string
  link?: string
  relatedId?: string
}

export async function createNotification({
  userId,
  recipientType = "manager",
  type,
  title,
  message,
  link,
  relatedId,
}: CreateNotificationParams) {
  const supabase = createClient()

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

// Notification templates for common events
export const notificationTemplates = {
  paymentReceived: (tenantName: string, amount: number, propertyName: string) => ({
    type: "payment_received" as NotificationType,
    title: "Payment Received",
    message: `${tenantName} paid $${amount.toLocaleString()} for ${propertyName}`,
  }),

  paymentDue: (tenantName: string, amount: number, dueDate: string) => ({
    type: "payment_due" as NotificationType,
    title: "Payment Due Soon",
    message: `${tenantName}'s rent of $${amount.toLocaleString()} is due on ${dueDate}`,
  }),

  paymentOverdue: (tenantName: string, amount: number, daysLate: number) => ({
    type: "payment_overdue" as NotificationType,
    title: "Payment Overdue",
    message: `${tenantName}'s rent of $${amount.toLocaleString()} is ${daysLate} days overdue`,
  }),

  maintenanceNew: (propertyName: string, title: string, urgency: string) => ({
    type: "maintenance_new" as NotificationType,
    title: "New Maintenance Request",
    message: `${urgency.toUpperCase()}: "${title}" at ${propertyName}`,
  }),

  maintenanceUpdated: (propertyName: string, title: string, status: string) => ({
    type: "maintenance_updated" as NotificationType,
    title: "Maintenance Updated",
    message: `"${title}" at ${propertyName} is now ${status.replace("_", " ")}`,
  }),

  maintenanceCompleted: (propertyName: string, title: string) => ({
    type: "maintenance_completed" as NotificationType,
    title: "Maintenance Completed",
    message: `"${title}" at ${propertyName} has been completed`,
  }),

  messageReceived: (tenantName: string, subject: string) => ({
    type: "message_received" as NotificationType,
    title: "New Message",
    message: `${tenantName} sent you a message: "${subject}"`,
  }),

  leaseExpiring: (tenantName: string, propertyName: string, daysRemaining: number) => ({
    type: "lease_expiring" as NotificationType,
    title: "Lease Expiring Soon",
    message: `${tenantName}'s lease at ${propertyName} expires in ${daysRemaining} days`,
  }),

  tenantAdded: (tenantName: string, propertyName: string) => ({
    type: "tenant_added" as NotificationType,
    title: "New Tenant Added",
    message: `${tenantName} has been added to ${propertyName}`,
  }),
}
