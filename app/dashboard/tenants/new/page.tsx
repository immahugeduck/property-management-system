import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TenantForm } from "@/components/forms/tenant-form"

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>
}) {
  const { property: defaultPropertyId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .order("name")

  return (
    <div className="max-w-2xl mx-auto pt-12 lg:pt-0">
      <TenantForm 
        properties={properties || []} 
        userId={user.id} 
        defaultPropertyId={defaultPropertyId}
      />
    </div>
  )
}
