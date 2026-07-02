"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Paperclip, X, FileText, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Message } from "@/lib/types"

export interface ChatAttachment {
  path: string
  name: string
  type: string
  size: number
}

interface ChatThreadProps {
  messages: Message[]
  /** Which role is the current viewer — controls bubble alignment. */
  viewerRole: "manager" | "tenant"
  /** Server action that sends the message. Returns ok/error. */
  onSend: (body: string, attachment?: ChatAttachment) => Promise<{ ok: boolean; error?: string }>
  /** Server action that uploads a file and returns its stored metadata. */
  onUpload: (formData: FormData) => Promise<{ ok: boolean; attachment?: ChatAttachment; error?: string }>
  placeholder?: string
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const ACCEPT = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(type?: string | null) {
  return !!type && type.startsWith("image/")
}

function MessageAttachment({ message, isMine }: { message: Message; isMine: boolean }) {
  const { attachment_url, attachment_name, attachment_type } = message
  if (!message.attachment_path) return null

  if (!attachment_url) {
    return (
      <div className="mt-1 flex items-center gap-2 text-xs opacity-80">
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate">{attachment_name || "Attachment"}</span>
      </div>
    )
  }

  if (isImage(attachment_type)) {
    return (
      <a href={attachment_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment_url}
          alt={attachment_name || "Image attachment"}
          className="max-h-60 w-auto max-w-full rounded-lg border border-border/50 object-cover"
        />
      </a>
    )
  }

  return (
    <a
      href={attachment_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
        isMine
          ? "border-brand-foreground/20 bg-brand-foreground/10 hover:bg-brand-foreground/20"
          : "border-border bg-background/60 hover:bg-background",
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate font-medium">{attachment_name || "Attachment"}</span>
      <span className="opacity-70">{formatBytes(message.attachment_size)}</span>
      <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </a>
  )
}

export function ChatThread({ messages, viewerRole, onSend, onUpload, placeholder }: ChatThreadProps) {
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<ChatAttachment | null>(null)
  const router = useRouter()
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("File is too large (max 10 MB).")
      return
    }
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await onUpload(fd)
    setUploading(false)
    if (res.ok && res.attachment) {
      setPending(res.attachment)
    } else {
      toast.error(res.error || "Could not upload file.")
    }
  }

  async function handleSend() {
    const trimmed = body.trim()
    if ((!trimmed && !pending) || sending || uploading) return
    setSending(true)
    const res = await onSend(trimmed, pending ?? undefined)
    setSending(false)
    if (res.ok) {
      setBody("")
      setPending(null)
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
                  {m.body && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>}
                  <MessageAttachment message={m} isMine={isMine} />
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
        {pending && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate font-medium">{pending.name}</span>
            <span className="text-muted-foreground">{formatBytes(pending.size)}</span>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove attachment"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFile} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || sending}
            aria-label="Attach a file"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
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
          <Button
            onClick={handleSend}
            disabled={sending || uploading || (!body.trim() && !pending)}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Press Enter to send, Shift+Enter for a new line · Attach images or files up to 10 MB
        </p>
      </div>
    </div>
  )
}
