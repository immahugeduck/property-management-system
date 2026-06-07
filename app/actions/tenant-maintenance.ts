"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { createNotification, notificationTemplates } from "@/lib/notifications"

export async function submitTenantMaintenance(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, error: "Not authorized." }
  if (!tenant.property_id) return { ok: false, error: "No property is linked to your account. Contact your manager." }

  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim()
  const category = (formData.get("category") as string) || "general"
  const urgency = (formData.get("urgency") as string) || "medium"

  if (!title || !description) return { ok: false, error: "Please provide a title and description." }

  const supabase = await createClient()
  const { error } = await supabase.from("maintenance_requests").insert({
    user_id: tenant.user_id,
    property_id: tenant.property_id,
    tenant_id: tenant.id,
    title,
    description,
    category,
    urgency,
    status: "open",
  })

  if (error) {
    console.error("[v0] submitTenantMaintenance error:", error)
    return { ok: false, error: "Could not submit request." }
  }

  // Notify the manager of the new request.
  try {
    const db = createServiceClient()
    const tpl = notificationTemplates.maintenanceNew(
      tenant.property?.name ?? "their unit",
      title,
      urgency,
    )
    await createNotification({
      client: db,
      userId: tenant.user_id,
      recipientType: "manager",
      relatedId: tenant.id,
      link: `/dashboard/maintenance`,
      ...tpl,
    })
  } catch (err) {
    console.error("[v0] manager maintenance notification error:", err)
  }

  revalidatePath("/portal/maintenance")
  return { ok: true }
}
