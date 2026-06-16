"use server"

import { createNotification } from "@/lib/notifications"

export async function notifyMaintenanceUpdated({
  userId,
  propertyName,
  requestTitle,
  requestId,
  newStatus,
}: {
  userId: string
  propertyName: string
  requestTitle: string
  requestId: string
  newStatus: string
}) {
  try {
    const isCompleted = newStatus === "completed"
    await createNotification({
      userId,
      type: isCompleted ? "maintenance_completed" : "maintenance_updated",
      title: isCompleted ? "Maintenance Completed" : "Maintenance Updated",
      message: isCompleted
        ? `"${requestTitle}" at ${propertyName} has been completed`
        : `"${requestTitle}" at ${propertyName} is now ${newStatus.replace("_", " ")}`,
      link: `/dashboard/maintenance/${requestId}`,
    })
  } catch {
    // Silently fail — notification is non-critical
  }
}

export async function notifyMaintenanceCreated({
  userId,
  propertyName,
  title,
  urgency,
}: {
  userId: string
  propertyName: string
  title: string
  urgency: string
}) {
  try {
    await createNotification({
      userId,
      type: "maintenance_new",
      title: "New Maintenance Request",
      message: `${urgency.toUpperCase()}: "${title}" at ${propertyName}`,
      link: "/dashboard/maintenance",
    })
  } catch {
    // Silently fail — notification is non-critical
  }
}
