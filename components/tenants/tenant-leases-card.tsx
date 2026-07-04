import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LeaseStatusBadge } from "@/components/leases/lease-status-badge"
import { LeaseDocDownloadButton } from "@/components/leases/lease-doc-download-button"
import { FileSignature, Plus, FileText } from "lucide-react"
import type { LeaseStatus } from "@/lib/types"

interface TenantLease {
  id: string
  title: string
  status: LeaseStatus
  sent_at: string | null
  signed_at: string | null
  created_at: string
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function TenantLeasesCard({ tenantId, leases }: { tenantId: string; leases: TenantLease[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-4 w-4" />
            Lease Agreements
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/leases/new?tenant=${tenantId}`}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New lease
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {leases.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">No lease agreements yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {leases.map((lease) => (
              <div key={lease.id} className="flex items-center gap-3 py-2.5">
                <div className="shrink-0 rounded-md bg-muted p-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <Link href={`/dashboard/leases/${lease.id}`} className="min-w-0 flex-1 hover:underline">
                  <p className="truncate text-sm font-medium">{lease.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {lease.status === "signed"
                      ? `Signed ${formatDate(lease.signed_at)}`
                      : lease.status === "sent"
                        ? `Sent ${formatDate(lease.sent_at)}`
                        : `Created ${formatDate(lease.created_at)}`}
                  </p>
                </Link>
                <LeaseStatusBadge status={lease.status} />
                {lease.status === "signed" && (
                  <LeaseDocDownloadButton leaseId={lease.id} which="signed" label="PDF" variant="ghost" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
