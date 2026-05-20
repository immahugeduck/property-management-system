"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"

interface MarkAllReadButtonProps {
  userId: string
}

export function MarkAllReadButton({ userId }: MarkAllReadButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleMarkAllRead = async () => {
    setLoading(true)
    
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
    
    router.refresh()
    setLoading(false)
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleMarkAllRead}
      disabled={loading}
    >
      {loading ? (
        <Spinner className="mr-2 h-4 w-4" />
      ) : (
        <CheckCheck className="mr-2 h-4 w-4" />
      )}
      Mark all as read
    </Button>
  )
}
