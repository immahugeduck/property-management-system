import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { LeaseStatusBadge } from "@/components/leases/lease-status-badge"
import { LeaseManagerEditor } from "@/components/leases/lease-manager-editor"
import { LeaseDetailActions } from "@/components/leases/lease-detail-actions"
import { ArrowLeft, Building2, User, Calendar, CheckCircle2 } from "lucide-react"
import type { LeaseField, LeaseStatus, LeaseValues, LeaseTemplate } from "@/lib/types"

function formatDateTime(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lease, error } = await supabase
    .from("leases")
    .select("*, template:lease_templates(*), tenant:tenants(id, first_name, last_name), property:properties(name)")
    .eq("id", id)
    .single()

  if (error || !lease) notFound()

  const template = (Array.isArray(lease.template) ? lease.template[0] : lease.template) as LeaseTemplate | null
  const tenant = Array.isArray(lease.tenant) ? lease.tenant[0] : lease.tenant
  const property = Array.isArray(lease.property) ? lease.property[0] : lease.property
  const status = lease.status as LeaseStatus
  const fields = (template?.fields as LeaseField[]) || []

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <Link
        href="/dashboard/leases"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leases
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{lease.title}</h1>
            <LeaseStatusBadge status={status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {tenant && (
              <Link href={`/dashboard/tenants/${tenant.id}`} className="flex items-center gap-1.5 hover:text-foreground">
                <User className="h-4 w-4" />
                {tenant.first_name} {tenant.last_name}
              </Link>
            )}
            {property?.name && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {property.name}
              </span>
            )}
          </div>
        </div>
        <LeaseDetailActions leaseId={lease.id} status={status} />
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="flex flex-wrap gap-x-8 gap-y-3 py-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Sent:</span>
            <span className="font-medium">{formatDateTime(lease.sent_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Signed:</span>
            <span className="font-medium">
              {lease.signed_at ? `${formatDateTime(lease.signed_at)}${lease.signer_name ? ` by ${lease.signer_name}` : ""}` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {template ? (
        <LeaseManagerEditor
          leaseId={lease.id}
          status={status}
          fields={fields}
          initialValues={(lease.values as LeaseValues) || {}}
        />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            This lease&apos;s template is no longer available, so its fields can&apos;t be edited.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
