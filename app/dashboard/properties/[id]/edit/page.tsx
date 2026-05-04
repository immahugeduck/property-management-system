import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PropertyForm } from "@/components/forms/property-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function EditPropertyPage({
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

  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !property) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto pt-12 lg:pt-0">
      <Link
        href={`/dashboard/properties/${id}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Property
      </Link>
      <PropertyForm property={property} userId={user.id} />
    </div>
  )
}
