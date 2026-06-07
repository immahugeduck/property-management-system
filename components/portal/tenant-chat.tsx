"use client"

import { ChatThread } from "@/components/chat/chat-thread"
import { sendTenantMessage } from "@/app/actions/chat"
import type { Message } from "@/lib/types"

export function TenantChat({ messages }: { messages: Message[] }) {
  return (
    <ChatThread
      messages={messages}
      viewerRole="tenant"
      onSend={(body) => sendTenantMessage(body)}
      placeholder="Message your property manager..."
    />
  )
}
