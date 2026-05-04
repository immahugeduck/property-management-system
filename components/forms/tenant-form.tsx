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
import type { Tenant, Property } from "@/lib/types"

interface TenantFormProps {
  tenant?: Tenant
  properties: Property[]
  userId: string
  defaultPropertyId?: string
}

export function TenantForm({ tenant, properties, userId, defaultPropertyId }: TenantFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!tenant

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const propertyId = formData.get("property_id") as string
    
    const data = {
      user_id: userId,
      property_id: propertyId === "none" ? null : propertyId,
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || null,
      lease_start: (formData.get("lease_start") as string) || null,
      lease_end: (formData.get("lease_end") as string) || null,
      rent_amount: parseFloat(formData.get("rent_amount") as string) || 0,
      security_deposit: parseFloat(formData.get("security_deposit") as string) || 0,
      status: formData.get("status") as string,
      notes: (formData.get("notes") as string) || null,
      updated_at: new Date().toISOString(),
    }

    const supabase = createClient()

    if (isEditing) {
      const { error: updateError } = await supabase
        .from("tenants")
        .update(data)
        .eq("id", tenant.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from("tenants")
        .insert(data)

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      // Update property status to occupied if a property is selected
      if (propertyId && propertyId !== "none") {
        await supabase
          .from("properties")
          .update({ status: "occupied", updated_at: new Date().toISOString() })
          .eq("id", propertyId)
      }
    }

    router.push("/dashboard/tenants")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Tenant" : "Add New Tenant"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "Update the tenant information below"
              : "Enter the tenant details to add them to your system"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                placeholder="John"
                defaultValue={tenant?.first_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                placeholder="Doe"
                defaultValue={tenant?.last_name}
                required
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                defaultValue={tenant?.email}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(555) 123-4567"
                defaultValue={tenant?.phone || ""}
              />
            </div>
          </div>

          {/* Property and Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="property_id">Property</Label>
              <Select 
                name="property_id" 
                defaultValue={tenant?.property_id || defaultPropertyId || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No property assigned</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={tenant?.status || "active"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lease Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lease_start">Lease Start Date</Label>
              <Input
                id="lease_start"
                name="lease_start"
                type="date"
                defaultValue={tenant?.lease_start || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lease_end">Lease End Date</Label>
              <Input
                id="lease_end"
                name="lease_end"
                type="date"
                defaultValue={tenant?.lease_end || ""}
              />
            </div>
          </div>

          {/* Financial */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rent_amount">Monthly Rent ($)</Label>
              <Input
                id="rent_amount"
                name="rent_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                defaultValue={tenant?.rent_amount || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="security_deposit">Security Deposit ($)</Label>
              <Input
                id="security_deposit"
                name="security_deposit"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                defaultValue={tenant?.security_deposit || ""}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes about the tenant..."
              defaultValue={tenant?.notes || ""}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {isEditing ? "Update Tenant" : "Add Tenant"}
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
