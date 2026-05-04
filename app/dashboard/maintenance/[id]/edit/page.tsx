import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MaintenanceForm } from "@/components/forms/maintenance-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function EditMaintenancePage({
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

  const [requestResult, propertiesResult, tenantsResult] = await Promise.all([
    supabase.from("maintenance_requests").select("*").eq("id", id).single(),
    supabase.from("properties").select("*").order("name"),
    supabase.from("tenants").select("*").eq("status", "active").order("first_name"),
  ])

  if (requestResult.error || !requestResult.data) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto pt-12 lg:pt-0">
      <Link
        href={`/dashboard/maintenance/${id}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Request
      </Link>
      <MaintenanceForm
        request={requestResult.data}
        properties={propertiesResult.data || []}
        tenants={tenantsResult.data || []}
        userId={user.id}
      />
    </div>
  )
}
