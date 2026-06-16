"use server"

import { createNotification } from "@/lib/notifications"

export async function notifyTenantAdded({
  userId,
  tenantName,
  propertyName,
}: {
  userId: string
  tenantName: string
  propertyName: string
}) {
  try {
    await createNotification({
      userId,
      type: "tenant_added",
      title: "New Tenant Added",
      message: `${tenantName} has been added to ${propertyName}`,
      link: "/dashboard/tenants",
    })
  } catch {
    // Silently fail — notification is non-critical
  }
}
