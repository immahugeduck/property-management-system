import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Bell, 
  CreditCard, 
  Wrench, 
  MessageSquare, 
  User, 
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  CheckCheck
} from "lucide-react"
import type { Notification } from "@/lib/types"
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button"

const typeIcons: Record<string, typeof Bell> = {
  payment_received: CreditCard,
  payment_due: Clock,
  payment_overdue: AlertCircle,
  maintenance_new: Wrench,
  maintenance_updated: Wrench,
  maintenance_completed: CheckCircle,
  message_received: MessageSquare,
  lease_expiring: AlertCircle,
  tenant_added: User,
  general: Bell,
}

const typeColors: Record<string, string> = {
  payment_received: "bg-emerald-500/10 text-emerald-500",
  payment_due: "bg-amber-500/10 text-amber-500",
  payment_overdue: "bg-red-500/10 text-red-500",
  maintenance_new: "bg-blue-500/10 text-blue-500",
  maintenance_updated: "bg-purple-500/10 text-purple-500",
  maintenance_completed: "bg-emerald-500/10 text-emerald-500",
  message_received: "bg-blue-500/10 text-blue-500",
  lease_expiring: "bg-amber-500/10 text-amber-500",
  tenant_added: "bg-emerald-500/10 text-emerald-500",
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

export default async function NotificationsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  const notificationList = (notifications || []) as Notification[]
  const unreadCount = notificationList.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <MarkAllReadButton userId={user.id} />
        )}
      </div>

      {error && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-500">Notifications table not set up</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The notifications feature requires a database table. Run the SQL script in 
                  <code className="mx-1 px-1 py-0.5 bg-muted rounded text-xs">scripts/create-notifications-table.sql</code>
                  via the Supabase dashboard to enable notifications.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && notificationList.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No notifications yet</h3>
              <p className="text-muted-foreground mt-1">
                You&apos;ll see notifications here when there&apos;s activity on your properties.
              </p>
            </div>
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
              {notificationList.map((notification) => {
                const Icon = typeIcons[notification.type] || Bell
                const colorClass = typeColors[notification.type] || typeColors.general
                
                return (
                  <div 
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors ${
                      !notification.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${!notification.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      {notification.link && (
                        <Link 
                          href={notification.link}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
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
