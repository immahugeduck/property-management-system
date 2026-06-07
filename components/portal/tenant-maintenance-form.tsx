"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { submitTenantMaintenance } from "@/app/actions/tenant-maintenance"

export function TenantMaintenanceForm({ hasProperty }: { hasProperty: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await submitTenantMaintenance(formData)
    setLoading(false)
    if (res.ok) {
      toast.success("Request submitted. Your manager has been notified.")
      router.refresh()
      const form = document.getElementById("tenant-maint-form") as HTMLFormElement | null
      form?.reset()
    } else {
      toast.error(res.error || "Could not submit request.")
    }
  }

  if (!hasProperty) {
    return (
      <p className="text-sm text-muted-foreground">
        Your account isn&apos;t linked to a property yet. Please contact your property manager.
      </p>
    )
  }

  return (
    <form id="tenant-maint-form" action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Brief summary of the issue" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe the problem in detail..."
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select name="category" defaultValue="general">
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plumbing">Plumbing</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="hvac">HVAC</SelectItem>
              <SelectItem value="appliance">Appliance</SelectItem>
              <SelectItem value="structural">Structural</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="urgency">Priority</Label>
          <Select name="urgency" defaultValue="medium">
            <SelectTrigger id="urgency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Request
      </Button>
    </form>
  )
}
