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
import type { Property } from "@/lib/types"

interface Owner {
  id: string
  first_name: string
  last_name: string
  company_name: string | null
}

interface PropertyFormProps {
  property?: Property
  userId: string
  owners?: Owner[]
}

export function PropertyForm({ property, userId, owners = [] }: PropertyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!property

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const ownerIdVal = formData.get("owner_id") as string
    const data = {
      user_id: userId,
      owner_id: ownerIdVal && ownerIdVal !== "none" ? ownerIdVal : null,
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip_code: formData.get("zip_code") as string,
      property_type: formData.get("property_type") as string,
      bedrooms: parseInt(formData.get("bedrooms") as string) || 1,
      bathrooms: parseFloat(formData.get("bathrooms") as string) || 1,
      square_feet: parseInt(formData.get("square_feet") as string) || null,
      monthly_rent: parseFloat(formData.get("monthly_rent") as string) || 0,
      status: formData.get("status") as string,
      notes: formData.get("notes") as string || null,
      updated_at: new Date().toISOString(),
    }

    const supabase = createClient()

    if (isEditing) {
      const { error: updateError } = await supabase
        .from("properties")
        .update(data)
        .eq("id", property.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from("properties")
        .insert(data)

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    }

    router.push("/dashboard/properties")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Property" : "Add New Property"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "Update the property details below"
              : "Enter the property details to add it to your portfolio"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
              {error}
            </div>
          )}

          {/* Property Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Property Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Oak Street Apartment"
              defaultValue={property?.name}
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              name="address"
              placeholder="123 Main Street"
              defaultValue={property?.address}
              required
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="City"
                defaultValue={property?.city}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                placeholder="State"
                defaultValue={property?.state}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                name="zip_code"
                placeholder="12345"
                defaultValue={property?.zip_code}
                required
              />
            </div>
          </div>

          {/* Owner */}
          {owners.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="owner_id">Property Owner</Label>
              <Select name="owner_id" defaultValue={(property as any)?.owner_id || "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No owner assigned</SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.first_name} {owner.last_name}
                      {owner.company_name ? ` (${owner.company_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Property Type and Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="property_type">Property Type</Label>
              <Select name="property_type" defaultValue={property?.property_type || "apartment"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={property?.status || "vacant"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Under Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bedrooms, Bathrooms, Square Feet */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                name="bedrooms"
                type="number"
                min="0"
                defaultValue={property?.bedrooms || 1}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                name="bathrooms"
                type="number"
                min="0"
                step="0.5"
                defaultValue={property?.bathrooms || 1}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="square_feet">Square Feet</Label>
              <Input
                id="square_feet"
                name="square_feet"
                type="number"
                min="0"
                placeholder="Optional"
                defaultValue={property?.square_feet || ""}
              />
            </div>
          </div>

          {/* Monthly Rent */}
          <div className="space-y-2">
            <Label htmlFor="monthly_rent">Monthly Rent ($)</Label>
            <Input
              id="monthly_rent"
              name="monthly_rent"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              defaultValue={property?.monthly_rent || ""}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes about the property..."
              defaultValue={property?.notes || ""}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {isEditing ? "Update Property" : "Add Property"}
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
