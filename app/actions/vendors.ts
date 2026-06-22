"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email"
import { workOrderEmail } from "@/lib/email-templates"
import { getFromName } from "@/lib/profile"

// ─── Vendor CRUD ─────────────────────────────────────────────────────────────

export async function createVendor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.from("vendors").insert({
    user_id: user.id,
    name: formData.get("name") as string,
    company_name: (formData.get("company_name") as string) || null,
    specialty: (formData.get("specialty") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    address: (formData.get("address") as string) || null,
    notes: (formData.get("notes") as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath("/dashboard/vendors")
  redirect("/dashboard/vendors")
}

export async function updateVendor(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("vendors")
    .update({
      name: formData.get("name") as string,
      company_name: (formData.get("company_name") as string) || null,
      specialty: (formData.get("specialty") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/vendors")
  revalidatePath(`/dashboard/vendors/${id}`)
  redirect(`/dashboard/vendors/${id}`)
}

export async function deleteVendor(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.from("vendors").delete().eq("id", id).eq("user_id", user.id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/vendors")
  redirect("/dashboard/vendors")
}

// ─── Assign vendor to maintenance request ────────────────────────────────────

export async function assignVendor(
  requestId: string,
  vendorId: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("maintenance_requests")
    .update({ vendor_id: vendorId })
    .eq("id", requestId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/maintenance/${requestId}`)
  return {}
}

// ─── Send work order email to vendor ─────────────────────────────────────────

export async function sendWorkOrder(
  requestId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const [{ data: request }, fromName] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select("*, vendors(*), properties(*)")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .single(),
    getFromName(supabase, user.id),
  ])

  if (!request) return { ok: false, error: "Request not found" }
  const vendor = request.vendors as { name: string; email: string | null } | null
  if (!vendor?.email) return { ok: false, error: "Vendor has no email address." }

  const property = request.properties as { name: string; address: string; city: string; state: string } | null

  const tpl = workOrderEmail({
    vendorName: vendor.name,
    managerName: fromName,
    managerEmail: user.email ?? "",
    propertyName: property?.name ?? "Property",
    propertyAddress: property ? `${property.address}, ${property.city}, ${property.state}` : "",
    requestTitle: request.title,
    description: request.description,
    category: request.category,
    urgency: request.urgency,
    scheduledDate: request.scheduled_date
      ? new Date(request.scheduled_date).toLocaleDateString()
      : null,
    estimatedCost: request.estimated_cost,
  })

  const sent = await sendEmail({ to: vendor.email, subject: tpl.subject, html: tpl.html, fromName })
  return { ok: !!sent }
}

// ─── Vendor payments ──────────────────────────────────────────────────────────

export async function logVendorPayment(
  vendorId: string,
  data: {
    amount: number
    date: string
    payment_method?: string
    reference_number?: string
    notes?: string
    maintenance_request_id?: string | null
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.from("vendor_payments").insert({
    user_id: user.id,
    vendor_id: vendorId,
    amount: data.amount,
    date: data.date,
    payment_method: data.payment_method || null,
    reference_number: data.reference_number || null,
    notes: data.notes || null,
    maintenance_request_id: data.maintenance_request_id || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/vendors/${vendorId}`)
  return {}
}

export async function deleteVendorPayment(
  paymentId: string,
  vendorId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("vendor_payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/vendors/${vendorId}`)
  return {}
}
