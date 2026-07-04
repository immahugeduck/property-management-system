import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LeaseStatusBadge } from "@/components/leases/lease-status-badge"
import { LeaseDocDownloadButton } from "@/components/leases/lease-doc-download-button"
import { FileSignature, FileText, PenLine } from "lucide-react"
import type { LeaseStatus } from "@/lib/types"

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function PortalLeasesPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) redirect("/portal")

  const supabase = await createClient()
  const { data: leases } = await supabase
    .from("leases")
    .select("id, title, status, sent_at, signed_at, property:properties(name)")
    .eq("tenant_id", tenant.id)
    .neq("status", "draft")
    .order("created_at", { ascending: false })

  const all = leases || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lease Agreements</h1>
        <p className="text-muted-foreground">Review and sign your lease, and download signed copies</p>
      </div>

      {all.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileSignature className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No leases yet</h3>
            <p className="max-w-sm text-muted-foreground">
              When your property manager sends you a lease to sign, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {all.map((lease) => {
            const property = Array.isArray(lease.property) ? lease.property[0] : lease.property
            const status = lease.status as LeaseStatus
            return (
              <Card key={lease.id}>
                <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{lease.title}</p>
                        <LeaseStatusBadge status={status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {property?.name || "Your property"}
                        {status === "signed"
                          ? ` · Signed ${formatDate(lease.signed_at)}`
                          : status === "sent"
                            ? ` · Received ${formatDate(lease.sent_at)}`
                            : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {status === "sent" && (
                      <Button asChild size="sm">
                        <Link href={`/portal/lease/${lease.id}`}>
                          <PenLine className="mr-1.5 h-4 w-4" />
                          Review &amp; sign
                        </Link>
                      </Button>
                    )}
                    {status === "signed" && (
                      <LeaseDocDownloadButton leaseId={lease.id} which="signed" label="Download" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
