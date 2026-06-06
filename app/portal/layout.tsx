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

  return (
    <div className="min-h-screen bg-background">
      <PortalSidebar />
      <div className="lg:pl-64">
        <PortalHeader
          tenantName={`${tenant.first_name} ${tenant.last_name}`}
          tenantEmail={tenant.email}
        />
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
