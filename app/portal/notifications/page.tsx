import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button"
import {
  Bell,
  CreditCard,
  Wrench,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Receipt,
} from "lucide-react"
import type { Notification } from "@/lib/types"

const typeIcons: Record<string, typeof Bell> = {
  payment_received: Receipt,
  invoice_issued: CreditCard,
  payment_due: Clock,
  payment_overdue: AlertCircle,
  maintenance_new: Wrench,
  maintenance_updated: Wrench,
  maintenance_completed: CheckCircle,
  message_received: MessageSquare,
  general: Bell,
}

const typeColors: Record<string, string> = {
  payment_received: "bg-emerald-500/10 text-emerald-500",
  invoice_issued: "bg-amber-500/10 text-amber-500",
  payment_due: "bg-amber-500/10 text-amber-500",
  payment_overdue: "bg-red-500/10 text-red-500",
  maintenance_new: "bg-blue-500/10 text-blue-500",
  maintenance_updated: "bg-blue-500/10 text-blue-500",
  maintenance_completed: "bg-emerald-500/10 text-emerald-500",
  message_received: "bg-blue-500/10 text-blue-500",
  general: "bg-muted text-muted-foreground",
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

export default async function PortalNotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("recipient_type", "tenant")
    .order("created_at", { ascending: false })
    .limit(100)

  const notificationList = (notifications ?? []) as Notification[]
  const unreadCount = notificationList.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton userId={user.id} />}
      </div>

      {error && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Notifications are not yet available. Please check back shortly.
            </p>
          </CardContent>
        </Card>
      )}

      {!error && notificationList.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No notifications yet</h3>
            <p className="text-muted-foreground mt-1">
              {"You'll be notified here for new invoices, payment receipts, and messages."}
            </p>
          </CardContent>
        </Card>
      )}

      {!error && notificationList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {notificationList.map((n) => {
                const Icon = typeIcons[n.type] ?? Bell
                const colorClass = typeColors[n.type] ?? typeColors.general
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 ${!n.is_read ? "bg-primary/5" : ""}`}
                  >
                    <div className={`rounded-lg p-2 ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(n.created_at)}</span>
                          {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                      </div>
                      {n.link && (
                        <Link
                          href={n.link}
                          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View details
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
