"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LeaseFieldInput } from "@/components/leases/lease-field-input"
import { fieldsForRole, groupFieldsByPage, missingRequired } from "@/lib/leases"
import { submitSignedLease, getLeaseDocUrl } from "@/app/actions/leases"
import { FileText, Loader2, ExternalLink, PenLine } from "lucide-react"
import { toast } from "sonner"
import type { LeaseField, LeaseValue, LeaseValues } from "@/lib/types"

interface Props {
  leaseId: string
  fields: LeaseField[]
  initialValues: LeaseValues
}

export function LeaseSigner({ leaseId, fields, initialValues }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<LeaseValues>(initialValues)
  const [submitting, startSubmit] = useTransition()
  const [openingDoc, startDoc] = useTransition()
  const [agreed, setAgreed] = useState(false)

  const tenantFields = useMemo(() => fieldsForRole(fields, "tenant"), [fields])
  const pages = useMemo(() => groupFieldsByPage(tenantFields), [tenantFields])
  const missing = useMemo(() => missingRequired(tenantFields, values), [tenantFields, values])

  function update(key: string, v: LeaseValue | null) {
    setValues((prev) => {
      const next = { ...prev }
      if (v === null) delete next[key]
      else next[key] = v
      return next
    })
  }

  function openDocument() {
    startDoc(async () => {
      const res = await getLeaseDocUrl(leaseId, "template")
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      window.open(res.url, "_blank")
    })
  }

  function handleSubmit() {
    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.map((f) => f.label).join(", ")}`)
      return
    }
    if (!agreed) {
      toast.error("Please confirm your agreement to sign electronically.")
      return
    }
    startSubmit(async () => {
      const res = await submitSignedLease(leaseId, values)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Lease signed — thank you!")
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Review the full lease before signing</p>
              <p className="text-xs text-muted-foreground">Opens the complete document in a new tab.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openDocument} disabled={openingDoc}>
            {openingDoc ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-1.5 h-4 w-4" />}
            View lease document
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="h-4 w-4" />
            Your information & signature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {pages.map(({ page, fields: pageFields }) => (
            <div key={page} className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {pageFields.map((field) => (
                  <div key={field.key} className={field.type === "signature" ? "sm:col-span-2" : ""}>
                    <LeaseFieldInput field={field} value={values[field.key]} onChange={(v) => update(field.key, v)} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-muted-foreground">
              I agree that signing electronically is the legal equivalent of my handwritten signature, and the
              information I have entered is accurate.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSubmit} disabled={submitting || missing.length > 0 || !agreed}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
              Sign &amp; submit lease
            </Button>
            {missing.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {missing.length} required field{missing.length === 1 ? "" : "s"} left
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
