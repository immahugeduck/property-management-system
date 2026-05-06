"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { RefreshCw, Info } from "lucide-react"
import { addMonths, format } from "date-fns"

interface Tenant {
  id: string
  first_name: string
  last_name: string
  rent_amount: number
  property_id: string | null
  lease_end: string | null
}

interface Property {
  id: string
  name: string
  address: string
  monthly_rent: number
}

interface InvoiceFormProps {
  userId: string
  tenants: Tenant[]
  properties: Property[]
  defaultTenantId?: string
  defaultPropertyId?: string
}

export function InvoiceForm({ userId, tenants, properties, defaultTenantId, defaultPropertyId }: InvoiceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringMonths, setRecurringMonths] = useState(12)
  const [selectedTenantId, setSelectedTenantId] = useState(defaultTenantId || "none")
  const [selectedPropertyId, setSelectedPropertyId] = useState(defaultPropertyId || "none")
  const [amount, setAmount] = useState("")

  const selectedTenant = tenants.find(t => t.id === selectedTenantId)
  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId)
    const tenant = tenants.find(t => t.id === tenantId)
    if (tenant) {
      if (!amount) setAmount(tenant.rent_amount.toString())
      if (tenant.property_id && selectedPropertyId === "none") {
        setSelectedPropertyId(tenant.property_id)
      }
    }
  }

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    const property = properties.find(p => p.id === propertyId)
    if (property && !amount) {
      setAmount(property.monthly_rent.toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const dueDate = formData.get("due_date") as string
    const parsedAmount = parseFloat(amount) || 0
    const notes = formData.get("notes") as string

    const supabase = createClient()

    if (isRecurring) {
      // Create multiple invoices for each month
      const invoices = Array.from({ length: recurringMonths }, (_, i) => {
        const monthDate = addMonths(new Date(dueDate), i)
        const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        return {
          user_id: userId,
          tenant_id: selectedTenantId === "none" ? null : selectedTenantId,
          property_id: selectedPropertyId === "none" ? null : selectedPropertyId,
          amount: parsedAmount,
          due_date: format(firstOfMonth, "yyyy-MM-dd"),
          status: "pending",
          is_recurring: true,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }
      })

      const { error: insertError } = await supabase.from("rent_payments").insert(invoices)
      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase.from("rent_payments").insert({
        user_id: userId,
        tenant_id: selectedTenantId === "none" ? null : selectedTenantId,
        property_id: selectedPropertyId === "none" ? null : selectedPropertyId,
        amount: parsedAmount,
        due_date: dueDate,
        status: "pending",
        is_recurring: false,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    }

    router.push("/dashboard/invoices")
    router.refresh()
  }

  const firstDayNextMonth = new Date()
  firstDayNextMonth.setMonth(firstDayNextMonth.getMonth() + 1)
  firstDayNextMonth.setDate(1)
  const defaultDueDate = format(firstDayNextMonth, "yyyy-MM-dd")

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Fill in the invoice information below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          {/* Tenant */}
          <div className="space-y-2">
            <Label>Tenant</Label>
            <Select value={selectedTenantId} onValueChange={handleTenantChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No tenant</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                    {t.rent_amount ? ` — $${t.rent_amount.toLocaleString()}/mo` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property */}
          <div className="space-y-2">
            <Label>Property</Label>
            <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No property</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount & Due Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                defaultValue={defaultDueDate}
                required
              />
            </div>
          </div>

          <Separator />

          {/* Recurring Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <Label className="text-base font-medium">Recurring Monthly</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Auto-generate invoices on the 1st of each month
                </p>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>

            {isRecurring && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    This will create <strong>{recurringMonths} invoices</strong>, one per month starting from the due date selected above. Each will be due on the 1st of the month.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurring_months">Number of Months</Label>
                  <Select
                    value={recurringMonths.toString()}
                    onValueChange={(v) => setRecurringMonths(parseInt(v))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 6, 12, 24].map((m) => (
                        <SelectItem key={m} value={m.toString()}>{m} months</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes for this invoice..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {isRecurring ? `Create ${recurringMonths} Invoices` : "Create Invoice"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
