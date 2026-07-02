"use client"

import { ChatThread } from "@/components/chat/chat-thread"
import { sendManagerMessage, uploadManagerChatAttachment } from "@/app/actions/chat"
import type { Message } from "@/lib/types"

export function ManagerChat({ tenantId, messages }: { tenantId: string; messages: Message[] }) {
  return (
    <ChatThread
      messages={messages}
      viewerRole="manager"
      onSend={(body, attachment) => sendManagerMessage(tenantId, body, attachment)}
      onUpload={(formData) => uploadManagerChatAttachment(tenantId, formData)}
      placeholder="Message your tenant..."
    />
  )
}
