"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { DEFAULT_TEMPLATES } from "@/lib/lease-templates/registry"
import { revalidatePath } from "next/cache"

const BUCKET = "property-files"

/**
 * Install the built-in lease templates for the signed-in manager. Idempotent:
 * existing templates (matched by slug) are skipped. Uploads each source PDF to
 * storage and inserts a lease_templates row with its field map.
 */
export async function installDefaultTemplates() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const service = createServiceClient()
  let installed = 0

  for (const tpl of DEFAULT_TEMPLATES) {
    const { data: existing } = await supabase
      .from("lease_templates")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", tpl.slug)
      .maybeSingle()
    if (existing) continue

    const storagePath = `${user.id}/lease-templates/${tpl.slug}.pdf`
    const bytes = Buffer.from(tpl.pdfBase64, "base64")

    const { error: upErr } = await service.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true })
    if (upErr) return { error: `Upload failed: ${upErr.message}` }

    const { error: insErr } = await supabase.from("lease_templates").insert({
      user_id: user.id,
      name: tpl.name,
      description: tpl.description,
      storage_path: storagePath,
      page_count: tpl.pageCount,
      page_sizes: tpl.pageSizes,
      fields: tpl.fields,
      slug: tpl.slug,
    })
    if (insErr) return { error: insErr.message }
    installed++
  }

  revalidatePath("/dashboard/leases")
  return { success: true, installed }
}
