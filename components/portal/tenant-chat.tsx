"use client"

import { ChatThread } from "@/components/chat/chat-thread"
import { sendTenantMessage, uploadTenantChatAttachment } from "@/app/actions/chat"
import type { Message } from "@/lib/types"

export function TenantChat({ messages }: { messages: Message[] }) {
  return (
    <ChatThread
      messages={messages}
      viewerRole="tenant"
      onSend={(body, attachment) => sendTenantMessage(body, attachment)}
      onUpload={(formData) => uploadTenantChatAttachment(formData)}
      placeholder="Message your property manager..."
    />
  )
}
