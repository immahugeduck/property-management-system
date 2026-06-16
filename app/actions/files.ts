"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createFolder(name: string, parentId?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase
    .from("file_folders")
    .insert({ user_id: user.id, name: name.trim(), parent_id: parentId || null })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath("/dashboard/files")
  return { success: true, folder: data }
}

export async function deleteFolder(folderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("file_folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/files")
  return { success: true }
}

export async function saveFileMetadata({
  storagePath,
  fileName,
  fileSize,
  mimeType,
  folderId,
  tenantId,
  propertyId,
  ownerId,
  isTemplate,
  description,
}: {
  storagePath: string
  fileName: string
  fileSize: number
  mimeType: string
  folderId?: string | null
  tenantId?: string | null
  propertyId?: string | null
  ownerId?: string | null
  isTemplate?: boolean
  description?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase
    .from("files")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      folder_id: folderId || null,
      tenant_id: tenantId || null,
      property_id: propertyId || null,
      owner_id: ownerId || null,
      is_template: isTemplate || false,
      description: description || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath("/dashboard/files")
  return { success: true, file: data }
}

export async function deleteFile(fileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: file } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single()

  if (!file) return { error: "File not found" }

  await supabase.storage.from("property-files").remove([file.storage_path])

  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/files")
  return { success: true }
}

export async function getFileSignedUrl(storagePath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase.storage
    .from("property-files")
    .createSignedUrl(storagePath, 300)

  if (error) return { error: error.message }
  return { success: true, url: data.signedUrl }
}
