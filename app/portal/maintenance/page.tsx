import { redirect } from "next/navigation"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, Clock, CheckCircle, Loader2, CalendarClock, MessageSquare, DollarSign, Camera } from "lucide-react"
import { TenantMaintenanceForm } from "@/components/portal/tenant-maintenance-form"
import type { MaintenanceRequest } from "@/lib/types"

const STATUS_STYLES: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  open: { label: "Open", className: "bg-amber-500/10 text-amber-600", icon: Clock },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600", icon: Loader2 },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-600", icon: CheckCircle },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground", icon: Clock },
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function PortalMaintenancePage() {
  const tenant = await getCurrentTenant()
  if (!tenant) redirect("/auth/login")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: requests } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })

  const list = (requests as MaintenanceRequest[]) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Maintenance</h1>
        <p className="text-muted-foreground">Submit work orders and track their status</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Request</CardTitle>
            </CardHeader>
            <CardContent>
              <TenantMaintenanceForm hasProperty={Boolean(tenant.property_id)} userId={user?.id ?? ""} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {list.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wrench className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-semibold">No requests yet</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Submit a maintenance request and your manager will be notified.
                </p>
              </CardContent>
            </Card>
          ) : (
            list.map((r) => {
              const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.open
              const Icon = s.icon
              return (
                <Card key={r.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{r.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{r.category}</span>
                          <span aria-hidden="true">•</span>
                          <span className="capitalize">{r.urgency} priority</span>
                          <span aria-hidden="true">•</span>
                          <span>Submitted {formatDate(r.created_at)}</span>
                          {r.photo_paths && r.photo_paths.length > 0 && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span className="flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                {r.photo_paths.length} photo{r.photo_paths.length > 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className={`shrink-0 gap-1 ${s.className}`}>
                        <Icon className="h-3 w-3" />
                        {s.label}
                      </Badge>
                    </div>
                    {/* Manager-provided details */}
                    {(r.scheduled_date || r.notes || r.estimated_cost) && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                        {r.scheduled_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                            <span>Scheduled for {formatDate(r.scheduled_date)}</span>
                          </div>
                        )}
                        {r.estimated_cost && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5 shrink-0" />
                            <span>Estimated cost: ${Number(r.estimated_cost).toLocaleString()}</span>
                          </div>
                        )}
                        {r.notes && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{r.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
