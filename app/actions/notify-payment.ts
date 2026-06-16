"use server"

import { createNotification } from "@/lib/notifications"

export async function notifyPaymentRecorded({
  userId,
  tenantName,
  amount,
  propertyName,
}: {
  userId: string
  tenantName: string
  amount: number
  propertyName: string
}) {
  try {
    await createNotification({
      userId,
      type: "payment_received",
      title: "Payment Received",
      message: `${tenantName} paid $${amount.toLocaleString()} for ${propertyName}`,
      link: "/dashboard/payments",
    })
  } catch {
    // Silently fail — notification is non-critical
  }
}
