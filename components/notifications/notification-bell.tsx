"use client"

import { useState, useEffect } from "react"
import { Bell, Check, CheckCheck, Trash2, CreditCard, Wrench, MessageSquare, Users, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { Notification } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { cn } from "@/lib/utils"

const notificationIcons: Record<string, React.ElementType> = {
  payment_received: CreditCard,
  payment_due: CreditCard,
  payment_overdue: AlertTriangle,
  maintenance_new: Wrench,
  maintenance_updated: Wrench,
  maintenance_completed: Check,
  message_received: MessageSquare,
  lease_expiring: AlertTriangle,
  tenant_added: Users,
  general: Info,
}

const notificationColors: Record<string, string> = {
  payment_received: "text-emerald-500 bg-emerald-500/10",
  payment_due: "text-amber-500 bg-amber-500/10",
  payment_overdue: "text-red-500 bg-red-500/10",
  maintenance_new: "text-blue-500 bg-blue-500/10",
  maintenance_updated: "text-blue-500 bg-blue-500/10",
  maintenance_completed: "text-emerald-500 bg-emerald-500/10",
  message_received: "text-purple-500 bg-purple-500/10",
  lease_expiring: "text-amber-500 bg-amber-500/10",
  tenant_added: "text-blue-500 bg-blue-500/10",
  general: "text-muted-foreground bg-muted",
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        console.log("[v0] Notifications table may not exist yet:", error.message)
        setNotifications([])
        setUnreadCount(0)
        return
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
    } catch (err) {
      console.log("[v0] Error fetching notifications:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Set up real-time subscription
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  const deleteNotification = async (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    const { error } = await supabase.from("notifications").delete().eq("id", id)

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }
  }

  const clearAll = async () => {
    const { error } = await supabase.from("notifications").delete().neq("id", "")

    if (!error) {
      setNotifications([])
      setUnreadCount(0)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs"
                disabled={unreadCount === 0}
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            </div>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70">
                You&apos;ll see updates here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Info
                const colorClass = notificationColors[notification.type] || notificationColors.general

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          onClick={() => {
                            if (!notification.is_read) markAsRead(notification.id)
                            setIsOpen(false)
                          }}
                          className="block"
                        >
                          <p className={cn("text-sm font-medium leading-tight", !notification.is_read && "text-foreground")}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </Link>
                      ) : (
                        <>
                          <p className={cn("text-sm font-medium leading-tight", !notification.is_read && "text-foreground")}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </>
                      )}
                      <p className="text-[10px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {!notification.is_read && (
                      <div className="absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-8 w-full text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Clear all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
