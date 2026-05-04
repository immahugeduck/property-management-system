"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { Tenant } from "@/lib/types"

interface MessageFormProps {
  tenants: Tenant[]
  userId: string
  defaultTenantId?: string
}

export function MessageForm({ tenants, userId, defaultTenantId }: MessageFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const tenantId = formData.get("tenant_id") as string

    // Get tenant's property
    const tenant = tenants.find(t => t.id === tenantId)

    const data = {
      user_id: userId,
      tenant_id: tenantId,
      property_id: tenant?.property_id || null,
      subject: formData.get("subject") as string,
      body: formData.get("body") as string,
      direction: "outbound",
      is_read: true, // Outbound messages are already "read"
    }

    const supabase = createClient()

    const { error: insertError } = await supabase
      .from("messages")
      .insert(data)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push("/dashboard/messages")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>New Message</CardTitle>
          <CardDescription>
            Send a message to one of your tenants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
              {error}
            </div>
          )}

          {/* Tenant Selection */}
          <div className="space-y-2">
            <Label htmlFor="tenant_id">To (Tenant)</Label>
            <Select name="tenant_id" defaultValue={defaultTenantId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.first_name} {tenant.last_name} ({tenant.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              placeholder="Message subject"
              required
            />
          </div>

          {/* Message Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              name="body"
              placeholder="Type your message here..."
              rows={8}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              Send Message
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
