"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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

interface TemplateOption {
  id: string
  name: string
  description: string | null
}
interface TenantOption {
  id: string
  first_name: string
  last_name: string
  property_id: string | null
  property_name: string | null
}

export function NewLeaseForm({
  templates,
  tenants,
  presetTenantId,
}: {
  templates: TemplateOption[]
  tenants: TenantOption[]
  presetTenantId?: string
}) {
  const router = useRouter()
  const [templateId, setTemplateId] = useState("")
  const [tenantId, setTenantId] = useState(presetTenantId ?? "")
  const [pending, start] = useTransition()

  const selectedTemplate = templates.find((t) => t.id === templateId)

  function handleCreate() {
    if (!templateId || !tenantId) {
      toast.error("Pick a template and a tenant")
      return
    }
    const tenant = tenants.find((t) => t.id === tenantId)
    start(async () => {
      const res = await createLease({
        templateId,
        tenantId,
        propertyId: tenant?.property_id ?? null,
      })
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      router.push(`/dashboard/leases/${res.id}`)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-4 w-4" />
          New lease
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a lease template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate?.description && (
            <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Tenant</Label>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                  {t.property_name ? ` — ${t.property_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The tenant, property, and manager details will be pre-filled where the template allows.
          </p>
        </div>

        <Button onClick={handleCreate} disabled={pending || !templateId || !tenantId}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create draft
        </Button>
      </CardContent>
    </Card>
  )
}
