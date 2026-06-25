"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LeaseDocument } from "@/components/leases/lease-document"
import { SignaturePad } from "@/components/leases/signature-pad"
import { getLeaseDocumentUrl, updateLeaseValues, sendLease, voidLease } from "@/app/actions/leases"
import { Loader2, Save, Send, Ban, Download, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import type { Lease, LeaseTemplate } from "@/lib/types"

function splitValues(template: LeaseTemplate, values: Record<string, string | boolean>) {
  const sigKeys = new Set(template.fields.filter((f) => f.type === "signature" || f.type === "initials").map((f) => f.key))
  const signatures: Record<string, string> = {}
  const rest: Record<string, string | boolean> = {}
  for (const [k, v] of Object.entries(values || {})) {
    if (sigKeys.has(k) && typeof v === "string" && v.startsWith("data:image")) signatures[k] = v
    else rest[k] = v
  }
  return { signatures, rest }
}

export function LeaseEditor({ lease, template }: { lease: Lease; template: LeaseTemplate }) {
  const router = useRouter()
  const initial = useMemo(() => splitValues(template, lease.values), [template, lease.values])
  const [values, setValues] = useState<Record<string, string | boolean>>(initial.rest)
  const [signatures, setSignatures] = useState<Record<string, string>>(initial.signatures)
  const [url, setUrl] = useState<string | null>(null)
  const [signingKey, setSigningKey] = useState<string | null>(null)
  const [saving, startSave] = useTransition()
  const [sending, startSend] = useTransition()

  const readOnly = lease.status === "signed" || lease.status === "voided"
  const docToShow = lease.status === "signed" ? "signed" : "template"

  useEffect(() => {
    getLeaseDocumentUrl(lease.id, docToShow as "template" | "signed").then((r) => {
      if (r.error) toast.error(r.error)
      else setUrl(r.url!)
    })
  }, [lease.id, docToShow])

  function mergedValues() {
    return { ...values, ...signatures }
  }

  function save() {
    startSave(async () => {
      const res = await updateLeaseValues(lease.id, mergedValues())
      if (res.error) toast.error(res.error)
      else toast.success("Saved")
    })
  }

  function send() {
    startSend(async () => {
      const save = await updateLeaseValues(lease.id, mergedValues())
      if (save.error) {
        toast.error(save.error)
        return
      }
      const res = await sendLease(lease.id)
      if (res.error) toast.error(res.error)
      else {
        toast.success("Sent to tenant for signature")
        router.refresh()
      }
    })
  }

  function doVoid() {
    if (!confirm("Void this lease? It can no longer be signed.")) return
    startSend(async () => {
      const res = await voidLease(lease.id)
      if (res.error) toast.error(res.error)
      else {
        toast.success("Lease voided")
        router.refresh()
      }
    })
  }

  async function downloadSigned() {
    const r = await getLeaseDocumentUrl(lease.id, "signed")
    if (r.error) toast.error(r.error)
    else window.open(r.url, "_blank")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <>
            <Button onClick={save} disabled={saving} variant="outline">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save draft
            </Button>
            <Button onClick={send} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {lease.status === "sent" ? "Re-send to tenant" : "Send to tenant"}
            </Button>
            <Button onClick={doVoid} disabled={sending} variant="ghost" className="text-destructive">
              <Ban className="mr-2 h-4 w-4" /> Void
            </Button>
          </>
        )}
        {lease.status === "signed" && (
          <>
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Signed by {lease.signer_name}
            </Badge>
            <Button onClick={downloadSigned} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download signed PDF
            </Button>
          </>
        )}
      </div>

      {!readOnly && (
        <p className="text-sm text-muted-foreground">
          Fill in the highlighted fields directly on the document below. Landlord signature can be
          added here; the tenant signs from their portal after you send it.
        </p>
      )}

      {url ? (
        <LeaseDocument
          url={url}
          pageSizes={template.page_sizes}
          fields={template.fields}
          values={values}
          signatures={signatures}
          editableRole={readOnly ? undefined : "manager"}
          onValueChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
          onSignatureClick={(k) => setSigningKey(k)}
        />
      ) : (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading document…
        </div>
      )}

      <SignaturePad
        open={!!signingKey}
        onOpenChange={(o) => !o && setSigningKey(null)}
        title="Landlord signature"
        onConfirm={(png) => {
          if (signingKey) setSignatures((prev) => ({ ...prev, [signingKey]: png }))
          setSigningKey(null)
        }}
      />
    </div>
  )
}
