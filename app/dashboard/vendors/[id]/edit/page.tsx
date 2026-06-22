import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { VendorForm } from "@/components/vendors/vendor-form"

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: vendor } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!vendor) notFound()

  return (
    <div className="max-w-2xl mx-auto pt-12 lg:pt-0 space-y-6">
      <div>
        <Link
          href={`/dashboard/vendors/${id}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vendor
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Vendor</h1>
      </div>
      <VendorForm vendor={vendor} />
    </div>
  )
}
