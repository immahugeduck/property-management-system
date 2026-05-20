"use server"

import { createClient } from "@/lib/supabase/server"

export async function setupNotificationsTable() {
  const supabase = await createClient()
  
  // Check if table exists by trying to select from it
  const { error: checkError } = await supabase
    .from("notifications")
    .select("id")
    .limit(1)
  
  // If table doesn't exist, we'll get an error - create it via raw SQL
  if (checkError?.message?.includes("does not exist")) {
    // Table needs to be created - this would need admin access
    // For now, return false to indicate setup is needed
    return { success: false, needsSetup: true }
  }
  
  return { success: true, needsSetup: false }
}
