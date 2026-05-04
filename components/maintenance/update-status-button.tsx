"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Clock, Play, CheckCircle, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface UpdateStatusButtonProps {
  requestId: string
  currentStatus: string
}

const statuses = [
  { value: "open", label: "Open", icon: Clock },
  { value: "in_progress", label: "In Progress", icon: Play },
  { value: "completed", label: "Completed", icon: CheckCircle },
  { value: "cancelled", label: "Cancelled", icon: X },
]

export function UpdateStatusButton({ requestId, currentStatus }: UpdateStatusButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return
    
    setLoading(true)
    const supabase = createClient()

    const updateData: Record<string, string | null> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Auto-set completed_date when marking as completed
    if (newStatus === "completed") {
      updateData.completed_date = new Date().toISOString().split("T")[0]
    }

    const { error } = await supabase
      .from("maintenance_requests")
      .update(updateData)
      .eq("id", requestId)

    if (error) {
      console.error("Error updating status:", error)
    }

    setLoading(false)
    router.refresh()
  }

  const currentStatusInfo = statuses.find(s => s.value === currentStatus)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            currentStatusInfo && <currentStatusInfo.icon className="mr-2 h-4 w-4" />
          )}
          Update Status
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statuses.map((status) => (
          <DropdownMenuItem
            key={status.value}
            onClick={() => handleStatusChange(status.value)}
            disabled={status.value === currentStatus}
          >
            <status.icon className="mr-2 h-4 w-4" />
            {status.label}
            {status.value === currentStatus && " (current)"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
