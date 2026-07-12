import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, User, Building2, ChevronRight } from "lucide-react"
import type { Message } from "@/lib/types"

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

interface Conversation {
  tenantId: string
  tenantName: string
  propertyName: string | null
  lastMessage: Message
  unread: number
  total: number
}

export default async function MessagesPage() {
  const supabase = await createClient()

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*, tenant:tenants(id, first_name, last_name, email), property:properties(id, name)")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching messages:", error)
  }

  // Group messages into per-tenant conversations.
  const convoMap = new Map<string, Conversation>()
  for (const m of (messages as Message[]) ?? []) {
    if (!m.tenant_id) continue
    const existing = convoMap.get(m.tenant_id)
    const isUnread = !m.is_read && m.sender_role === "tenant"
    if (!existing) {
      convoMap.set(m.tenant_id, {
        tenantId: m.tenant_id,
        tenantName: m.tenant ? `${m.tenant.first_name} ${m.tenant.last_name}` : "Unknown tenant",
        propertyName: m.property?.name ?? null,
        lastMessage: m, // messages are ordered desc, so first seen is latest
        unread: isUnread ? 1 : 0,
        total: 1,
      })
    } else {
      existing.total += 1
      if (isUnread) existing.unread += 1
    }
  }
  const conversations = Array.from(convoMap.values())
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0)

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">
            Chat with your tenants about work orders and questions
            {totalUnread > 0 && ` (${totalUnread} unread)`}
          </p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Once a tenant messages you from their portal, or you message them, the conversation appears here.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/tenants">View tenants</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => (
            <Link key={c.tenantId} href={`/dashboard/messages/${c.tenantId}/chat`}>
              <Card className={`transition-colors hover:bg-accent/50 cursor-pointer ${c.unread > 0 ? "border-primary" : ""}`}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{c.tenantName}</h3>
                        {c.unread > 0 && <Badge>{c.unread} new</Badge>}
                      </div>
                      {c.propertyName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          {c.propertyName}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {c.lastMessage.sender_role === "manager" ? "You: " : ""}
                        {c.lastMessage.body}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(c.lastMessage.created_at)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
