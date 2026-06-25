import { createClient } from "@/lib/supabase/server"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { LeaseSigner } from "@/components/portal/lease-signer"
import { LeaseViewer } from "@/components/leases/lease-viewer"
import type { Lease, LeaseTemplate } from "@/lib/types"

export default async function SignLeasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const tenant = await getCurrentTenant()
  if (!tenant) redirect("/auth/login")

  const { id } = await params
  const supabase = await createClient()
  const { data: lease } = await supabase
    .from("leases")
    .select("*, template:lease_templates(*)")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .single()

  if (!lease) notFound()
  const template = (Array.isArray(lease.template) ? lease.template[0] : lease.template) as LeaseTemplate

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/portal/documents">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to documents
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{lease.title}</h1>
      </div>

      {lease.status === "signed" ? (
        <LeaseViewer
          leaseId={lease.id}
          pageSizes={template?.page_sizes || []}
          signedAt={lease.signed_at}
          signerName={lease.signer_name}
        />
      ) : lease.status === "sent" && template ? (
        <LeaseSigner lease={lease as unknown as Lease} template={template} />
      ) : (
        <p className="text-sm text-muted-foreground">This lease is not currently available to sign.</p>
      )}
    </div>
  )
}
