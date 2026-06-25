import { redirect } from "next/navigation"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { createClient } from "@/lib/supabase/server"
import { TenantChat } from "@/components/portal/tenant-chat"
import type { Message } from "@/lib/types"

export default async function PortalMessagesPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) redirect("/auth/login")

  const supabase = await createClient()
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })

  // Mark inbound-from-manager messages as read for this tenant.
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("tenant_id", tenant.id)
    .eq("sender_role", "manager")
    .eq("is_read", false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground">
          Chat with your property manager about work orders, payments, or any questions
        </p>
      </div>
      <TenantChat messages={(messages as Message[]) ?? []} />
    </div>
  )
}
