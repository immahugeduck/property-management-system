import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building2 } from "lucide-react"
import { ManagerChat } from "@/components/messages/manager-chat"
import type { Message } from "@/lib/types"

export default async function TenantChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*, property:properties(id, name)")
    .eq("id", tenantId)
    .eq("user_id", user.id)
    .single()

  if (!tenant) notFound()

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })

  // Mark inbound messages from this tenant as read.
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("tenant_id", tenantId)
    .eq("sender_role", "tenant")
    .eq("is_read", false)

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/messages">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to messages</span>
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {tenant.first_name} {tenant.last_name}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            {tenant.property && (
              <span className="flex items-center gap-1 text-sm">
                <Building2 className="h-3.5 w-3.5" />
                {tenant.property.name}
              </span>
            )}
            <Badge variant={tenant.auth_user_id ? "default" : "secondary"}>
              {tenant.auth_user_id ? "Portal active" : "Portal not active"}
            </Badge>
          </div>
        </div>
      </div>

      {!tenant.auth_user_id && (
        <p className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          This tenant hasn&apos;t activated their portal yet. They&apos;ll see these messages and get notified once they accept their invite.
        </p>
      )}

      <ManagerChat tenantId={tenantId} messages={(messages as Message[]) ?? []} />
    </div>
  )
}
