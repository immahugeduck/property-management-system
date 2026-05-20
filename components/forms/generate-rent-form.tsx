"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Calendar, Users, Info, CheckCircle2, AlertCircle, Building2 } from "lucide-react"
import type { Tenant, Property } from "@/lib/types"

interface TenantWithProperty extends Tenant {
  property: Property | undefined
}

interface GenerateRentFormProps {
  tenants: TenantWithProperty[]
  existingTenantIds: Set<string>
  userId: string
}

export function GenerateRentForm({ tenants, existingTenantIds, userId }: GenerateRentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set())

  const now = new Date()
  const currentMonth = now.toLocaleString("default", { month: "long", year: "numeric" })
  const defaultDueDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

  // Filter tenants that don't already have payments for this month
  const eligibleTenants = tenants.filter(t => !existingTenantIds.has(t.id))
  const alreadyGenerated = tenants.filter(t => existingTenantIds.has(t.id))

  const handleSelectAll = () => {
    if (selectedTenants.size === eligibleTenants.length) {
      setSelectedTenants(new Set())
    } else {
      setSelectedTenants(new Set(eligibleTenants.map(t => t.id)))
    }
  }

  const toggleTenant = (tenantId: string) => {
    const newSelected = new Set(selectedTenants)
    if (newSelected.has(tenantId)) {
      newSelected.delete(tenantId)
    } else {
      newSelected.add(tenantId)
    }
    setSelectedTenants(newSelected)
  }

  const calculateTotal = () => {
    return eligibleTenants
      .filter(t => selectedTenants.has(t.id))
      .reduce((sum, t) => sum + Number(t.rent_amount), 0)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedTenants.size === 0) {
      setError("Please select at least one tenant")
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const dueDate = formData.get("due_date") as string

    const payments = eligibleTenants
      .filter(t => selectedTenants.has(t.id))
      .map(tenant => ({
        user_id: userId,
        tenant_id: tenant.id,
        property_id: tenant.property_id,
        amount: tenant.rent_amount,
        due_date: dueDate,
        status: "pending",
        notes: `Monthly rent for ${currentMonth}`,
      }))

    const supabase = createClient()
    const { error: insertError } = await supabase
      .from("rent_payments")
      .insert(payments)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push("/dashboard/payments")
      router.refresh()
    }, 1500)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold">Rent Charges Generated</h3>
            <p className="text-muted-foreground mt-1">
              {selectedTenants.size} payment{selectedTenants.size !== 1 ? "s" : ""} created totaling {formatCurrency(calculateTotal())}
            </p>
            <p className="text-sm text-muted-foreground mt-4">Redirecting to payments...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Generate Monthly Rent</CardTitle>
              <CardDescription>
                Create rent charges for {currentMonth}. Select which tenants to bill.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Due Date
            </Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={defaultDueDate}
              required
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Typically the 1st of the month. All selected tenants will have this due date.
            </p>
          </div>

          {/* Tenant Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Select Tenants to Bill
              </Label>
              {eligibleTenants.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedTenants.size === eligibleTenants.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>

            {eligibleTenants.length === 0 && alreadyGenerated.length === 0 && (
              <div className="text-center py-8 border rounded-lg bg-muted/30">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No active tenants with assigned properties found.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add tenants and assign them to properties first.
                </p>
              </div>
            )}

            {eligibleTenants.length > 0 && (
              <div className="border rounded-lg divide-y">
                {eligibleTenants.map((tenant) => (
                  <label
                    key={tenant.id}
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedTenants.has(tenant.id)}
                      onCheckedChange={() => toggleTenant(tenant.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tenant.first_name} {tenant.last_name}</p>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Building2 className="h-3 w-3" />
                        {tenant.property?.name || "No property"}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(tenant.rent_amount)}</p>
                      <p className="text-xs text-muted-foreground">monthly rent</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {alreadyGenerated.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Already billed for {currentMonth}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {alreadyGenerated.map((tenant) => (
                    <Badge key={tenant.id} variant="secondary" className="text-xs">
                      {tenant.first_name} {tenant.last_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedTenants.size > 0 && (
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Total to Generate</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTenants.size} payment{selectedTenants.size !== 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <Button 
              type="submit" 
              disabled={loading || selectedTenants.size === 0} 
              size="lg"
            >
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              Generate {selectedTenants.size > 0 ? selectedTenants.size : ""} Rent Charge{selectedTenants.size !== 1 ? "s" : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
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
