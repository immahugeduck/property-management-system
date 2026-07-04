"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createNotification } from "@/lib/notifications"
import { getFromName } from "@/lib/profile"
import { generateSignedLeasePdf } from "@/lib/lease-pdf"
import {
  resolvePrefill,
  fieldsForRole,
  missingRequired,
} from "@/lib/leases"
import type { LeaseField, LeaseTemplate, LeaseValues } from "@/lib/types"

const SIGNED_URL_TTL = 300

type ActionResult<T = unknown> = ({ success: true } & T) | { error: string }

/** Manager: create a draft lease from a template, prefilling source-mapped fields. */
export async function createLease({
  templateId,
  tenantId,
  propertyId,
}: {
  templateId: string
  tenantId: string
  propertyId?: string | null
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: template } = await supabase
    .from("lease_templates")
    .select("*")
    .eq("id", templateId)
    .single()
  if (!template) return { error: "Template not found" }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*, property:properties(*)")
    .eq("id", tenantId)
    .single()
  if (!tenant) return { error: "Tenant not found" }

  let property = tenant.property ?? null
  if (!property && propertyId) {
    const { data } = await supabase.from("properties").select("*").eq("id", propertyId).single()
    property = data ?? null
  }

  const managerName = await getFromName(supabase, user.id)
  const ctx = {
    tenantFirst: tenant.first_name,
    tenantLast: tenant.last_name,
    managerName,
    propAddress: property?.address,
    propCity: property?.city,
    propState: property?.state,
  }

  const values: LeaseValues = {}
  for (const field of (template.fields as LeaseField[]) || []) {
    if (field.source) {
      const v = resolvePrefill(field.source, ctx)
      if (v) values[field.key] = v
    }
  }

  const { data, error } = await supabase
    .from("leases")
    .insert({
      user_id: user.id,
      template_id: templateId,
      tenant_id: tenantId,
      property_id: property?.id ?? propertyId ?? null,
      title: template.name,
      status: "draft",
      values,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/dashboard/leases")
  revalidatePath(`/dashboard/tenants/${tenantId}`)
  return { success: true, id: data.id }
}

/** Manager: save filled manager-role field values on a draft/sent lease. */
export async function saveLeaseValues(
  leaseId: string,
  incoming: LeaseValues,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: lease } = await supabase
    .from("leases")
    .select("status, values, template:lease_templates(fields)")
    .eq("id", leaseId)
    .eq("user_id", user.id)
    .single()
  if (!lease) return { error: "Lease not found" }
  if (lease.status === "signed" || lease.status === "void") {
    return { error: "This lease can no longer be edited." }
  }

  // Only allow writing manager-role field keys.
  const template = (Array.isArray(lease.template) ? lease.template[0] : lease.template) as
    | Pick<LeaseTemplate, "fields">
    | null
  const managerKeys = new Set(
    fieldsForRole((template?.fields as LeaseField[]) || [], "manager").map((f) => f.key),
  )
  const cleaned: LeaseValues = {}
  for (const [k, v] of Object.entries(incoming)) {
    if (managerKeys.has(k)) cleaned[k] = v
  }

  const merged = { ...(lease.values as LeaseValues), ...cleaned }
  const { error } = await supabase
    .from("leases")
    .update({ values: merged, updated_at: new Date().toISOString() })
    .eq("id", leaseId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/leases/${leaseId}`)
  return { success: true }
}

/** Manager: mark a lease as sent and notify the tenant to sign it. */
export async function sendLease(leaseId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: lease } = await supabase
    .from("leases")
    .select("id, status, values, tenant_id, template:lease_templates(fields), tenant:tenants(first_name, last_name, auth_user_id)")
    .eq("id", leaseId)
    .eq("user_id", user.id)
    .single()
  if (!lease) return { error: "Lease not found" }
  if (lease.status === "void") return { error: "This lease has been voided." }

  const template = (Array.isArray(lease.template) ? lease.template[0] : lease.template) as
    | Pick<LeaseTemplate, "fields">
    | null
  const fields = (template?.fields as LeaseField[]) || []
  const missing = missingRequired(fields, lease.values as LeaseValues, "manager")
  if (missing.length > 0) {
    return { error: `Fill in required fields before sending: ${missing.map((f) => f.label).join(", ")}` }
  }

  const tenant = (Array.isArray(lease.tenant) ? lease.tenant[0] : lease.tenant) as
    | { first_name: string; last_name: string; auth_user_id: string | null }
    | null

  const { error } = await supabase
    .from("leases")
    .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", leaseId)
    .eq("user_id", user.id)
  if (error) return { error: error.message }

  if (tenant?.auth_user_id) {
    await createNotification({
      userId: tenant.auth_user_id,
      recipientType: "tenant",
      type: "general",
      title: "Lease ready to sign",
      message: "Your property manager has sent you a lease to review and sign in your portal.",
      link: `/portal/lease/${leaseId}`,
      relatedId: leaseId,
    })
  }

  revalidatePath("/dashboard/leases")
  revalidatePath(`/dashboard/leases/${leaseId}`)
  return { success: true }
}

/** Manager: void a lease (soft cancel — keeps the record and any signed copy). */
export async function voidLease(leaseId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("leases")
    .update({ status: "void", updated_at: new Date().toISOString() })
    .eq("id", leaseId)
    .eq("user_id", user.id)
  if (error) return { error: error.message }

  revalidatePath("/dashboard/leases")
  revalidatePath(`/dashboard/leases/${leaseId}`)
  return { success: true }
}

/** Manager: permanently delete a lease (and its signed PDF, if any). */
export async function deleteLease(leaseId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: lease } = await supabase
    .from("leases")
    .select("tenant_id, signed_storage_path, signed_file_id")
    .eq("id", leaseId)
    .eq("user_id", user.id)
    .single()
  if (!lease) return { error: "Lease not found" }

  if (lease.signed_storage_path) {
    await supabase.storage.from("property-files").remove([lease.signed_storage_path])
  }
  if (lease.signed_file_id) {
    await supabase.from("files").delete().eq("id", lease.signed_file_id).eq("user_id", user.id)
  }

  const { error } = await supabase.from("leases").delete().eq("id", leaseId).eq("user_id", user.id)
  if (error) return { error: error.message }

  revalidatePath("/dashboard/leases")
  if (lease.tenant_id) revalidatePath(`/dashboard/tenants/${lease.tenant_id}`)
  return { success: true }
}

/**
 * Returns a short-lived signed URL for a lease document. Works for both the
 * manager and the tenant: RLS on `leases` guarantees only those two can read
 * the row, and the file itself is brokered with the service client because the
 * PDFs live under the manager's storage folder.
 */
export async function getLeaseDocUrl(
  leaseId: string,
  which: "template" | "signed",
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: lease } = await supabase
    .from("leases")
    .select("signed_storage_path, template:lease_templates(storage_path)")
    .eq("id", leaseId)
    .single()
  if (!lease) return { error: "Lease not found" }

  const template = (Array.isArray(lease.template) ? lease.template[0] : lease.template) as
    | Pick<LeaseTemplate, "storage_path">
    | null
  const path = which === "signed" ? lease.signed_storage_path : template?.storage_path
  if (!path) return { error: "Document not available" }

  const service = createServiceClient()
  const { data, error } = await service.storage.from("property-files").createSignedUrl(path, SIGNED_URL_TTL)
  if (error || !data) return { error: error?.message || "Could not create link" }
  return { success: true, url: data.signedUrl }
}

/**
 * Tenant: submit filled tenant-role fields + signature(s). Flattens the values
 * onto the template PDF, stores the signed copy, and marks the lease signed.
 */
export async function submitSignedLease(
  leaseId: string,
  tenantValues: LeaseValues,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: lease } = await supabase
    .from("leases")
    .select("id, user_id, tenant_id, property_id, status, values, title, template:lease_templates(*), tenant:tenants(first_name, last_name)")
    .eq("id", leaseId)
    .single()
  if (!lease) return { error: "Lease not found" }
  if (lease.user_id === user.id) return { error: "Managers cannot sign on the tenant's behalf." }
  if (lease.status !== "sent") return { error: "This lease is not awaiting your signature." }

  const template = (Array.isArray(lease.template) ? lease.template[0] : lease.template) as LeaseTemplate | null
  if (!template) return { error: "Lease template is missing." }
  const fields = (template.fields as LeaseField[]) || []

  // Only accept tenant-role field keys from the client.
  const tenantKeys = new Set(fieldsForRole(fields, "tenant").map((f) => f.key))
  const cleaned: LeaseValues = {}
  for (const [k, v] of Object.entries(tenantValues)) {
    if (tenantKeys.has(k)) cleaned[k] = v
  }

  const merged = { ...(lease.values as LeaseValues), ...cleaned }
  const missing = missingRequired(fields, merged, "tenant")
  if (missing.length > 0) {
    return { error: `Please complete: ${missing.map((f) => f.label).join(", ")}` }
  }

  const service = createServiceClient()

  // Fetch the template PDF and flatten the values onto it.
  const { data: fileBlob, error: dlError } = await service.storage
    .from("property-files")
    .download(template.storage_path)
  if (dlError || !fileBlob) return { error: "Could not load the lease document." }

  let signedBytes: Uint8Array
  try {
    const templateBytes = new Uint8Array(await fileBlob.arrayBuffer())
    signedBytes = await generateSignedLeasePdf({ templateBytes, fields, values: merged })
  } catch (e) {
    return { error: `Failed to generate the signed document: ${e instanceof Error ? e.message : "unknown error"}` }
  }

  const tenant = (Array.isArray(lease.tenant) ? lease.tenant[0] : lease.tenant) as
    | { first_name: string; last_name: string }
    | null
  const signerName = tenant ? `${tenant.first_name} ${tenant.last_name}`.trim() : "Tenant"
  const signedAt = new Date().toISOString()
  const fileName = `${lease.title || "Lease"} - signed.pdf`
  // Store under the manager's folder so it satisfies the manager-scoped storage policy.
  const storagePath = `${lease.user_id}/leases/${leaseId}-signed.pdf`

  const { error: upError } = await service.storage
    .from("property-files")
    .upload(storagePath, signedBytes, { contentType: "application/pdf", upsert: true })
  if (upError) return { error: `Could not save the signed document: ${upError.message}` }

  // Record the signed PDF in the manager's files library.
  const { data: fileRow } = await service
    .from("files")
    .insert({
      user_id: lease.user_id,
      tenant_id: lease.tenant_id,
      property_id: lease.property_id,
      file_name: fileName,
      file_size: signedBytes.byteLength,
      mime_type: "application/pdf",
      storage_path: storagePath,
      is_template: false,
      document_type: "lease",
      description: `Signed by ${signerName} on ${new Date(signedAt).toLocaleDateString("en-US")}`,
    })
    .select("id")
    .single()

  const { error: updateError } = await service
    .from("leases")
    .update({
      values: merged,
      status: "signed",
      signer_name: signerName,
      signed_at: signedAt,
      signed_storage_path: storagePath,
      signed_file_id: fileRow?.id ?? null,
      updated_at: signedAt,
    })
    .eq("id", leaseId)
  if (updateError) return { error: updateError.message }

  await createNotification({
    userId: lease.user_id,
    recipientType: "manager",
    type: "general",
    title: "Lease signed",
    message: `${signerName} signed "${lease.title}".`,
    link: `/dashboard/leases/${leaseId}`,
    relatedId: leaseId,
    client: service,
  })

  revalidatePath(`/portal/lease/${leaseId}`)
  revalidatePath("/portal/lease")
  revalidatePath(`/dashboard/leases/${leaseId}`)
  return { success: true }
}
