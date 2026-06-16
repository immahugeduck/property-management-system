import { redirect } from "next/navigation"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    // Either not signed in, or signed in but not a portal tenant (likely a manager).
    redirect("/auth/login")
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      <PortalSidebar />
      <div className="lg:pl-64">
        <PortalHeader
          tenantName={`${tenant.first_name} ${tenant.last_name}`}
          tenantEmail={tenant.email}
          userId={user?.id}
        />
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
