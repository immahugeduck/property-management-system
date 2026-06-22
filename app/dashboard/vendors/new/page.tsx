import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { VendorForm } from "@/components/vendors/vendor-form"

export default async function NewVendorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <div className="max-w-2xl mx-auto pt-12 lg:pt-0 space-y-6">
      <div>
        <Link
          href="/dashboard/vendors"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vendors
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Add Vendor</h1>
        <p className="text-muted-foreground">Add a contractor or service provider to your vendor directory.</p>
      </div>
      <VendorForm />
    </div>
  )
}
