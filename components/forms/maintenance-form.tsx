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
import type { MaintenanceRequest, Property, Tenant } from "@/lib/types"
import { notifyMaintenanceCreated } from "@/app/actions/notify-maintenance"

interface MaintenanceFormProps {
  request?: MaintenanceRequest
  properties: Property[]
  tenants: Tenant[]
  userId: string
  defaultPropertyId?: string
  defaultTenantId?: string
}

export function MaintenanceForm({
  request,
  properties,
  tenants,
  userId,
  defaultPropertyId,
  defaultTenantId,
}: MaintenanceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    request?.property_id || defaultPropertyId || ""
  )

  const isEditing = !!request

  // Filter tenants by selected property
  const filteredTenants = selectedPropertyId
    ? tenants.filter((t) => t.property_id === selectedPropertyId)
    : tenants

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const propertyId = formData.get("property_id") as string
    const tenantId = formData.get("tenant_id") as string

    const data = {
      user_id: userId,
      property_id: propertyId,
      tenant_id: tenantId === "none" ? null : tenantId,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      urgency: formData.get("urgency") as string,
      status: formData.get("status") as string,
      estimated_cost: parseFloat(formData.get("estimated_cost") as string) || null,
      actual_cost: parseFloat(formData.get("actual_cost") as string) || null,
      scheduled_date: (formData.get("scheduled_date") as string) || null,
      completed_date: (formData.get("completed_date") as string) || null,
      notes: (formData.get("notes") as string) || null,
      updated_at: new Date().toISOString(),
    }

    const supabase = createClient()

    if (isEditing) {
      const { error: updateError } = await supabase
        .from("maintenance_requests")
        .update(data)
        .eq("id", request.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from("maintenance_requests")
        .insert(data)

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      // Notify manager of new maintenance request (non-critical, fires and forgets)
      const property = properties.find(p => p.id === propertyId)
      if (property) {
        notifyMaintenanceCreated({
          userId,
          propertyName: property.name,
          title: data.title,
          urgency: data.urgency,
        })
      }
    }

    router.push("/dashboard/maintenance")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Request" : "New Maintenance Request"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "Update the maintenance request details"
              : "Enter the details of the maintenance issue"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Brief description of the issue"
              defaultValue={request?.title}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Detailed description of the maintenance issue..."
              defaultValue={request?.description}
              rows={4}
              required
            />
          </div>

          {/* Property and Tenant */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="property_id">Property</Label>
              <Select
                name="property_id"
                defaultValue={selectedPropertyId}
                onValueChange={setSelectedPropertyId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Reported By (Tenant)</Label>
              <Select
                name="tenant_id"
                defaultValue={request?.tenant_id || defaultTenantId || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tenant assigned</SelectItem>
                  {filteredTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category and Urgency */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={request?.category || "general"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
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
              <Label htmlFor="urgency">Urgency</Label>
              <Select name="urgency" defaultValue={request?.urgency || "medium"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Can wait</SelectItem>
                  <SelectItem value="medium">Medium - Soon</SelectItem>
                  <SelectItem value="high">High - Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency - Immediate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={request?.status || "open"}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Costs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
              <Input
                id="estimated_cost"
                name="estimated_cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                defaultValue={request?.estimated_cost || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual_cost">Actual Cost ($)</Label>
              <Input
                id="actual_cost"
                name="actual_cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                defaultValue={request?.actual_cost || ""}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Scheduled Date</Label>
              <Input
                id="scheduled_date"
                name="scheduled_date"
                type="date"
                defaultValue={request?.scheduled_date || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completed_date">Completed Date</Label>
              <Input
                id="completed_date"
                name="completed_date"
                type="date"
                defaultValue={request?.completed_date || ""}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes for reference..."
              defaultValue={request?.notes || ""}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {isEditing ? "Update Request" : "Create Request"}
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
