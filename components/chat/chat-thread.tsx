"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Message } from "@/lib/types"

interface ChatThreadProps {
  messages: Message[]
  /** Which role is the current viewer — controls bubble alignment. */
  viewerRole: "manager" | "tenant"
  /** Server action that sends the message. Returns ok/error. */
  onSend: (body: string) => Promise<{ ok: boolean; error?: string }>
  placeholder?: string
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ChatThread({ messages, viewerRole, onSend, placeholder }: ChatThreadProps) {
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  async function handleSend() {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    const res = await onSend(trimmed)
    setSending(false)
    if (res.ok) {
      setBody("")
      router.refresh()
    } else {
      toast.error(res.error || "Could not send message.")
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] min-h-[400px] rounded-lg border border-border bg-card">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation below.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_role === viewerRole
            return (
              <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      isMine ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={placeholder || "Type a message..."}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
          />
          <Button onClick={handleSend} disabled={sending || !body.trim()} size="icon" className="h-11 w-11 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Press Enter to send, Shift+Enter for a new line</p>
      </div>
    </div>
  )
}
