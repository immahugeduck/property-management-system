import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TenantForm } from "@/components/forms/tenant-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const [tenantResult, propertiesResult] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", id).single(),
    supabase.from("properties").select("*").order("name"),
  ])

  if (tenantResult.error || !tenantResult.data) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto pt-12 lg:pt-0">
      <Link
        href={`/dashboard/tenants/${id}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tenant
      </Link>
      <TenantForm 
        tenant={tenantResult.data} 
        properties={propertiesResult.data || []} 
        userId={user.id} 
      />
    </div>
  )
}
