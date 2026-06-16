"use server"

import { createNotification } from "@/lib/notifications"

export async function notifyMessageSent({
  userId,
  subject,
  recipientName,
}: {
  userId: string
  subject: string
  recipientName: string
}) {
  try {
    await createNotification({
      userId,
      type: "general",
      title: "Message Sent",
      message: `Message "${subject}" sent to ${recipientName}`,
      link: "/dashboard/messages",
    })
  } catch {
    // Silently fail — notification is non-critical
  }
}
