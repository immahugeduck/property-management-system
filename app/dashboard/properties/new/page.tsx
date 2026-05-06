import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PropertyForm } from "@/components/forms/property-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function NewPropertyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: owners } = await supabase
    .from("property_owners")
    .select("id, first_name, last_name, company_name")
    .order("last_name")

  return (
    <div className="max-w-2xl pt-12 lg:pt-0 space-y-6">
      <div>
        <Link href="/dashboard/properties" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Properties
        </Link>
        <h1 className="text-2xl font-bold">Add Property</h1>
        <p className="text-muted-foreground text-sm">Add a new property to your portfolio</p>
      </div>
      <PropertyForm userId={user.id} owners={owners || []} />
    </div>
  )
}
