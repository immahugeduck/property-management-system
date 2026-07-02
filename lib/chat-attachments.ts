import "server-only"
import { createServiceClient } from "@/lib/supabase/service"
import type { Message } from "@/lib/types"

export const CHAT_BUCKET = "property-files"
export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
/** Signed URLs are refreshed on every thread load, so a week is plenty. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 7

export const CHAT_ATTACHMENT_ACCEPT =
  "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"

export function isImageAttachment(type?: string | null): boolean {
  return !!type && type.startsWith("image/")
}

/**
 * Populate `attachment_url` with a short-lived signed URL for every message that
 * has an attachment. Uses the service client so it works for both manager and
 * tenant threads regardless of who owns the storage object.
 */
export async function signMessageAttachments(messages: Message[]): Promise<Message[]> {
  const withAttachments = messages.filter((m) => m.attachment_path)
  if (withAttachments.length === 0) return messages

  const svc = createServiceClient()
  const urlByPath = new Map<string, string>()

  await Promise.all(
    withAttachments.map(async (m) => {
      const path = m.attachment_path as string
      if (urlByPath.has(path)) return
      const { data } = await svc.storage.from(CHAT_BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
      if (data?.signedUrl) urlByPath.set(path, data.signedUrl)
    }),
  )

  return messages.map((m) =>
    m.attachment_path ? { ...m, attachment_url: urlByPath.get(m.attachment_path) ?? null } : m,
  )
}
