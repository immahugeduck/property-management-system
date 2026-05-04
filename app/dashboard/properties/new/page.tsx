import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PropertyForm } from "@/components/forms/property-form"

export default async function NewPropertyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="max-w-2xl mx-auto pt-12 lg:pt-0">
      <PropertyForm userId={user.id} />
    </div>
  )
}
