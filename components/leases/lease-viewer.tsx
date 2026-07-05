"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { LeaseDocument } from "@/components/leases/lease-document"
import { getLeaseDocumentUrl } from "@/app/actions/leases"
import { Download, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

/** Read-only view of a finished (signed) lease PDF. */
export function LeaseViewer({
  leaseId,
  pageSizes,
  signedAt,
  signerName,
}: {
  leaseId: string
  pageSizes: { w: number; h: number }[]
  signedAt?: string | null
  signerName?: string | null
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    getLeaseDocumentUrl(leaseId, "signed").then((r) => {
      if (r.error) toast.error(r.error)
      else setUrl(r.url!)
    })
  }, [leaseId])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Signed
          {signerName ? ` by ${signerName}` : ""}
          {signedAt ? ` on ${new Date(signedAt).toLocaleDateString()}` : ""}
        </Badge>
        {url && (
          <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        )}
      </div>
      {url ? (
        <LeaseDocument url={url} pageSizes={pageSizes} fields={[]} values={{}} />
      ) : (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      )}
    </div>
  )
}
