"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { LeaseFieldInput } from "@/components/leases/lease-field-input"
import { fieldsForRole, groupFieldsByPage, missingRequired } from "@/lib/leases"
import { saveLeaseValues, sendLease, getLeaseDocUrl } from "@/app/actions/leases"
import { Save, Send, FileText, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import type { LeaseField, LeaseValue, LeaseValues, LeaseStatus } from "@/lib/types"

interface Props {
  leaseId: string
  status: LeaseStatus
  fields: LeaseField[]
  initialValues: LeaseValues
}

export function LeaseManagerEditor({ leaseId, status, fields, initialValues }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<LeaseValues>(initialValues)
  const [dirty, setDirty] = useState(false)
  const [saving, startSave] = useTransition()
  const [sending, startSend] = useTransition()
  const [openingDoc, startDoc] = useTransition()

  const readOnly = status === "signed" || status === "void"
  const managerFields = useMemo(() => fieldsForRole(fields, "manager"), [fields])
  const pages = useMemo(() => groupFieldsByPage(managerFields), [managerFields])
  const missing = useMemo(() => missingRequired(managerFields, values), [managerFields, values])

  function update(key: string, v: LeaseValue | null) {
    setValues((prev) => {
      const next = { ...prev }
      if (v === null) delete next[key]
      else next[key] = v
      return next
    })
    setDirty(true)
  }

  function handleSave() {
    startSave(async () => {
      const res = await saveLeaseValues(leaseId, values)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      setDirty(false)
      toast.success("Saved")
      router.refresh()
    })
  }

  function handleSend() {
    if (missing.length > 0) {
      toast.error(`Fill required fields first: ${missing.map((f) => f.label).join(", ")}`)
      return
    }
    startSend(async () => {
      // Persist any pending edits before sending.
      if (dirty) {
        const saveRes = await saveLeaseValues(leaseId, values)
        if ("error" in saveRes) {
          toast.error(saveRes.error)
          return
        }
        setDirty(false)
      }
      const res = await sendLease(leaseId)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Lease sent to tenant for signature")
      router.refresh()
    })
  }

  function openTemplate() {
    startDoc(async () => {
      const res = await getLeaseDocUrl(leaseId, "template")
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      window.open(res.url, "_blank")
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Lease details
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openTemplate} disabled={openingDoc}>
            {openingDoc ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="mr-1.5 h-3.5 w-3.5" />}
            View blank document
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {readOnly && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            This lease is {status === "signed" ? "signed" : "voided"} and can no longer be edited.
          </p>
        )}

        {pages.map(({ page, fields: pageFields }) => (
          <div key={page} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Page {page}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {pageFields.map((field) => (
                <div key={field.key} className={field.type === "signature" ? "sm:col-span-2" : ""}>
                  <LeaseFieldInput
                    field={field}
                    value={values[field.key]}
                    onChange={(v) => update(field.key, v)}
                    disabled={readOnly}
                  />
                </div>
              ))}
            </div>
            <Separator />
          </div>
        ))}

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save draft
            </Button>
            <Button onClick={handleSend} disabled={sending || missing.length > 0}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {status === "sent" ? "Re-send to tenant" : "Send to tenant"}
            </Button>
            {missing.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {missing.length} required field{missing.length === 1 ? "" : "s"} left
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
