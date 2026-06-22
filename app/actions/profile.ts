"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateProfile(data: {
  from_name: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const fromName = data.from_name.trim() || null

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: user.id, from_name: fromName }, { onConflict: "user_id" })

  if (error) return { error: error.message }
  revalidatePath("/dashboard/settings")
  return {}
}
