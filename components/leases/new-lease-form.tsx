"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createLease } from "@/app/actions/leases"
import { Loader2, FileSignature } from "lucide-react"
import { toast } from "sonner"
import type { LeaseTemplate, Tenant } from "@/lib/types"

interface Props {
  templates: LeaseTemplate[]
  tenants: (Pick<Tenant, "id" | "first_name" | "last_name"> & { property?: { name: string } | null })[]
  defaultTemplate?: string
}

export function NewLeaseForm({ templates, tenants, defaultTemplate }: Props) {
  const router = useRouter()
  const [templateId, setTemplateId] = useState(defaultTemplate || templates[0]?.id || "")
  const [tenantId, setTenantId] = useState("")
  const [pending, start] = useTransition()

  function submit() {
    if (!templateId || !tenantId) {
      toast.error("Choose a template and a tenant")
      return
    }
    start(async () => {
      const res = await createLease({ templateId, tenantId })
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Lease created")
      router.push(`/dashboard/leases/${res.leaseId}`)
    })
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" /> New lease
        </CardTitle>
        <CardDescription>
          Pick a template and a tenant. We&apos;ll pre-fill the landlord, tenant, and property
          details — you fill in the rest before sending.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tenant</Label>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                  {t.property?.name ? ` — ${t.property.name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tenants.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No tenants yet. Add a tenant first, then create their lease.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={submit} disabled={pending || tenants.length === 0}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create lease
          </Button>
          <Button variant="outline" onClick={() => router.back()} disabled={pending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
