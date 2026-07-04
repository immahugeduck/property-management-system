import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { LeaseSigner } from "@/components/portal/lease-signer"
import { LeaseDocDownloadButton } from "@/components/leases/lease-doc-download-button"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import type { LeaseField, LeaseStatus, LeaseValues, LeaseTemplate } from "@/lib/types"

function formatDateTime(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

export default async function PortalLeaseSignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenant = await getCurrentTenant()
  if (!tenant) redirect("/portal")

  const supabase = await createClient()
  const { data: lease, error } = await supabase
    .from("leases")
    .select("*, template:lease_templates(*), property:properties(name)")
    .eq("id", id)
    .single()

  // RLS ensures a tenant can only read their own lease; guard anyway.
  if (error || !lease || lease.tenant_id !== tenant.id) notFound()

  const template = (Array.isArray(lease.template) ? lease.template[0] : lease.template) as LeaseTemplate | null
  const property = Array.isArray(lease.property) ? lease.property[0] : lease.property
  const status = lease.status as LeaseStatus
  const fields = (template?.fields as LeaseField[]) || []

  return (
    <div className="space-y-6">
      <Link
        href="/portal/lease"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lease Agreements
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{lease.title}</h1>
        <p className="text-muted-foreground">{property?.name || "Your property"}</p>
      </div>

      {status === "signed" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">This lease is signed</h3>
              <p className="text-muted-foreground">
                Signed {formatDateTime(lease.signed_at)}
                {lease.signer_name ? ` by ${lease.signer_name}` : ""}.
              </p>
            </div>
            <LeaseDocDownloadButton leaseId={lease.id} which="signed" label="Download signed lease" variant="default" />
          </CardContent>
        </Card>
      ) : status === "sent" && template ? (
        <LeaseSigner leaseId={lease.id} fields={fields} initialValues={(lease.values as LeaseValues) || {}} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {status === "void"
              ? "This lease has been voided and can no longer be signed."
              : "This lease isn't ready to sign yet. Your manager will notify you when it is."}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
