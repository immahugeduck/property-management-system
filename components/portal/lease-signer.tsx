"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LeaseDocument } from "@/components/leases/lease-document"
import { SignaturePad } from "@/components/leases/signature-pad"
import { getLeaseDocumentUrl, signLease } from "@/app/actions/leases"
import { Loader2, PenLine, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import type { Lease, LeaseTemplate } from "@/lib/types"

export function LeaseSigner({ lease, template }: { lease: Lease; template: LeaseTemplate }) {
  const router = useRouter()
  const tenantFields = useMemo(() => template.fields.filter((f) => f.role === "tenant"), [template])
  const sigFields = useMemo(
    () => tenantFields.filter((f) => f.type === "signature" || f.type === "initials"),
    [tenantFields],
  )
  const textFields = useMemo(
    () => tenantFields.filter((f) => f.type !== "signature" && f.type !== "initials" && f.type !== "checkbox"),
    [tenantFields],
  )

  const [values, setValues] = useState<Record<string, string | boolean>>(lease.values || {})
  const [signatures, setSignatures] = useState<Record<string, string>>({})
  const [url, setUrl] = useState<string | null>(null)
  const [signingKey, setSigningKey] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    getLeaseDocumentUrl(lease.id, "template").then((r) => {
      if (r.error) toast.error(r.error)
      else setUrl(r.url!)
    })
  }, [lease.id])

  const allSigned = sigFields.every((f) => signatures[f.key])
  const requiredText = textFields.filter((f) => f.required)
  const allText = requiredText.every((f) => {
    const v = values[f.key]
    return typeof v === "string" && v.trim() !== ""
  })

  function submit() {
    if (!allSigned) {
      toast.error("Please add your signature")
      return
    }
    if (!allText) {
      toast.error("Please complete the required fields")
      return
    }
    start(async () => {
      const textValues: Record<string, string> = {}
      for (const f of textFields) if (typeof values[f.key] === "string") textValues[f.key] = values[f.key] as string
      const res = await signLease(lease.id, textValues, signatures)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Lease signed!")
      router.push("/portal/documents")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <PenLine className="h-4 w-4 text-primary" />
            <span>
              Review your lease, fill any required fields, then add your signature where indicated.
            </span>
          </div>
          <Button onClick={submit} disabled={pending || !allSigned || !allText}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Sign &amp; submit
          </Button>
        </CardContent>
      </Card>

      {url ? (
        <LeaseDocument
          url={url}
          pageSizes={template.page_sizes}
          fields={template.fields}
          values={values}
          signatures={signatures}
          editableRole="tenant"
          onValueChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
          onSignatureClick={(k) => setSigningKey(k)}
        />
      ) : (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your lease…
        </div>
      )}

      <SignaturePad
        open={!!signingKey}
        onOpenChange={(o) => !o && setSigningKey(null)}
        title="Your signature"
        onConfirm={(png) => {
          // Apply the same signature to every place the tenant needs to sign, so
          // they only draw it once (e.g. lease + smoke-detector compliance form).
          setSignatures((prev) => {
            const next = { ...prev }
            for (const f of sigFields) next[f.key] = png
            return next
          })
          setSigningKey(null)
        }}
      />
    </div>
  )
}
