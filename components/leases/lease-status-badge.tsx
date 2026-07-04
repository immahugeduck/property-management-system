import { Badge } from "@/components/ui/badge"
import { LEASE_STATUS_LABEL, LEASE_STATUS_STYLE } from "@/lib/leases"
import type { LeaseStatus } from "@/lib/types"

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  return (
    <Badge variant="outline" className={LEASE_STATUS_STYLE[status] ?? LEASE_STATUS_STYLE.draft}>
      {LEASE_STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
