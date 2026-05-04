import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, MessageSquare, User, ArrowUpRight, ArrowDownLeft } from "lucide-react"

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
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

  const unreadCount = messages?.filter(m => !m.is_read && m.direction === "inbound").length || 0

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with your tenants
            {unreadCount > 0 && ` (${unreadCount} unread)`}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/messages/new">
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Link>
        </Button>
      </div>

      {!messages || messages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start communicating with your tenants
            </p>
            <Button asChild>
              <Link href="/dashboard/messages/new">
                <Plus className="mr-2 h-4 w-4" />
                New Message
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((message: any) => (
            <Link key={message.id} href={`/dashboard/messages/${message.id}`}>
              <Card className={`transition-colors hover:bg-accent/50 cursor-pointer ${!message.is_read && message.direction === "inbound" ? "border-primary" : ""}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${message.direction === "outbound" ? "bg-blue-500/10" : "bg-green-500/10"}`}>
                      {message.direction === "outbound" ? (
                        <ArrowUpRight className="h-5 w-5 text-blue-500" />
                      ) : (
                        <ArrowDownLeft className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{message.subject}</h3>
                            {!message.is_read && message.direction === "inbound" && (
                              <Badge>New</Badge>
                            )}
                          </div>
                          {message.tenant && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <User className="h-3 w-3" />
                              {message.tenant.first_name} {message.tenant.last_name}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {message.body}
                      </p>
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
