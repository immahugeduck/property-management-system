"use client"

import { ChatThread } from "@/components/chat/chat-thread"
import { sendManagerMessage } from "@/app/actions/chat"
import type { Message } from "@/lib/types"

export function ManagerChat({ tenantId, messages }: { tenantId: string; messages: Message[] }) {
  return (
    <ChatThread
      messages={messages}
      viewerRole="manager"
      onSend={(body) => sendManagerMessage(tenantId, body)}
      placeholder="Message your tenant..."
    />
  )
}
