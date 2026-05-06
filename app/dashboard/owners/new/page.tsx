import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { OwnerForm } from "@/components/forms/owner-form"

export default async function NewOwnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6 pt-12 lg:pt-0 max-w-2xl">
      <div>
        <Link
          href="/dashboard/owners"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Owners
        </Link>
        <h1 className="text-2xl font-bold">Add Owner</h1>
        <p className="text-muted-foreground text-sm">Add a property owner to your managed portfolio</p>
      </div>

      <OwnerForm userId={user!.id} />
    </div>
  )
}
