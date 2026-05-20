import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft } from "lucide-react"
import { OwnerForm } from "@/components/forms/owner-form"

export default async function EditOwnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: owner, error } = await supabase.from("property_owners").select("*").eq("id", id).single()
  if (error || !owner) notFound()

  return (
    <div className="space-y-6 pt-12 lg:pt-0 max-w-2xl">
      <div>
        <Link href={`/dashboard/owners/${id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Owner
        </Link>
        <h1 className="text-2xl font-bold">Edit Owner</h1>
      </div>
      <OwnerForm owner={owner} userId={user!.id} />
    </div>
  )
}
