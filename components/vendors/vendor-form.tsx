"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Vendor } from "@/lib/types"
import { createVendor, updateVendor } from "@/app/actions/vendors"
import { useState } from "react"

const SPECIALTIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "appliance", label: "Appliance Repair" },
  { value: "structural", label: "Structural" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning" },
  { value: "general", label: "General Contractor" },
]

interface VendorFormProps {
  vendor?: Vendor
}

export function VendorForm({ vendor }: VendorFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [specialty, setSpecialty] = useState(vendor?.specialty ?? "")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set("specialty", specialty)
    setError(null)
    startTransition(async () => {
      const result = vendor
        ? await updateVendor(vendor.id, formData)
        : await createVendor(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Contact Name *</Label>
          <Input id="name" name="name" defaultValue={vendor?.name} required placeholder="John Smith" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company_name">Company Name</Label>
          <Input id="company_name" name="company_name" defaultValue={vendor?.company_name ?? ""} placeholder="Smith Plumbing LLC" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Specialty</Label>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger>
            <SelectValue placeholder="Select specialty…" />
          </SelectTrigger>
          <SelectContent>
            {SPECIALTIES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={vendor?.email ?? ""} placeholder="john@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={vendor?.phone ?? ""} placeholder="(555) 000-0000" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={vendor?.address ?? ""} placeholder="123 Main St, City, ST" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={vendor?.notes ?? ""} rows={3} placeholder="Preferred contact hours, license number, etc." />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : vendor ? "Save Changes" : "Add Vendor"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
