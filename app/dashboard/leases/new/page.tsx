import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewLeaseForm } from "@/components/leases/new-lease-form"
import { ArrowLeft } from "lucide-react"

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>
}) {
  const { tenant: presetTenantId } = await searchParams
  const supabase = await createClient()

  const [{ data: templates }, { data: tenants }] = await Promise.all([
    supabase.from("lease_templates").select("id, name, description").order("name"),
    supabase
      .from("tenants")
      .select("id, first_name, last_name, property_id, property:properties(name)")
      .order("first_name"),
  ])

  // A lease needs a template to exist.
  if (!templates || templates.length === 0) {
    redirect("/dashboard/leases")
  }

  const tenantOptions = (tenants || []).map((t) => {
    const property = Array.isArray(t.property) ? t.property[0] : t.property
    return {
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      property_id: t.property_id,
      property_name: property?.name ?? null,
    }
  })

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <Link
        href="/dashboard/leases"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leases
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">New lease</h1>
        <p className="text-muted-foreground">Pick a template and tenant to start a draft.</p>
      </div>
      <div className="max-w-xl">
        <NewLeaseForm templates={templates} tenants={tenantOptions} presetTenantId={presetTenantId} />
      </div>
    </div>
  )
}
