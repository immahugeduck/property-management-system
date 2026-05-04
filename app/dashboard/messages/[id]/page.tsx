import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  User,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Reply,
} from "lucide-react"

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: message, error } = await supabase
    .from("messages")
    .select("*, tenant:tenants(id, first_name, last_name, email, phone), property:properties(id, name)")
    .eq("id", id)
    .single()

  if (error || !message) {
    notFound()
  }

  // Mark as read if it's an inbound message
  if (!message.is_read && message.direction === "inbound") {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", id)
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/messages"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Messages
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{message.subject}</h1>
              <Badge variant={message.direction === "outbound" ? "secondary" : "default"}>
                {message.direction === "outbound" ? (
                  <><ArrowUpRight className="mr-1 h-3 w-3" /> Sent</>
                ) : (
                  <><ArrowDownLeft className="mr-1 h-3 w-3" /> Received</>
                )}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(message.created_at)}
            </p>
          </div>
          {message.tenant && (
            <Button asChild>
              <Link href={`/dashboard/messages/new?tenant=${message.tenant.id}`}>
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Message Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap">{message.body}</p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          {message.tenant && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {message.direction === "outbound" ? "Sent To" : "Received From"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/tenants/${message.tenant.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {message.tenant.first_name} {message.tenant.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{message.tenant.email}</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Property Info */}
          {message.property && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Property
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/properties/${message.property.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium">{message.property.name}</p>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
