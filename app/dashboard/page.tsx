import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  Plus,
  FileText,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { differenceInDays, parseISO, format, subMonths, startOfMonth, endOfMonth } from "date-fns"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const now = new Date()

  const [
    propertiesResult,
    tenantsResult,
    paymentsResult,
    maintenanceResult,
  ] = await Promise.all([
    supabase.from("properties").select("id, status, monthly_rent, name"),
    supabase.from("tenants").select("id, status, lease_end, first_name, last_name, property_id"),
    supabase.from("rent_payments").select("id, amount, status, due_date, paid_date, created_at"),
    supabase.from("maintenance_requests").select("id, status, urgency, title, property_id, created_at").order("created_at", { ascending: false }).limit(5),
  ])

  const properties = propertiesResult.data || []
  const tenants = tenantsResult.data || []
  const payments = paymentsResult.data || []
  const recentMaintenance = maintenanceResult.data || []

  const totalProperties = properties.length
  const occupiedProperties = properties.filter(p => p.status === "occupied").length
  const vacantProperties = properties.filter(p => p.status === "vacant").length
  const activeTenants = tenants.filter(t => t.status === "active").length
  const monthlyRevenue = properties.filter(p => p.status === "occupied").reduce((sum, p) => sum + (p.monthly_rent || 0), 0)
  const pendingPayments = payments.filter(p => p.status === "pending").length
  const overduePayments = payments.filter(p => p.status === "overdue")
  const openMaintenanceRequests = recentMaintenance.filter(m => m.status === "open" || m.status === "in_progress").length
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0

  // Collection rate
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.due_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthPaid = thisMonthPayments.filter(p => p.status === "paid").length
  const collectionRate = thisMonthPayments.length > 0 ? Math.round((thisMonthPaid / thisMonthPayments.length) * 100) : 0

  // Leases expiring soon (within 60 days)
  const expiringLeases = tenants.filter(t => {
    if (!t.lease_end || t.status !== "active") return false
    const days = differenceInDays(parseISO(t.lease_end), now)
    return days >= 0 && days <= 60
  }).sort((a, b) => {
    const dA = differenceInDays(parseISO(a.lease_end!), now)
    const dB = differenceInDays(parseISO(b.lease_end!), now)
    return dA - dB
  })

  // Build 6-month revenue chart data
  const monthlyRevenueData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i)
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const monthPayments = payments.filter(p => {
      const d = new Date(p.paid_date ?? p.due_date)
      return d >= start && d <= end && p.status === "paid"
    })
    return {
      month: format(month, "MMM"),
      revenue: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    }
  })

  // Recent payments
  const { data: recentPayments } = await supabase
    .from("rent_payments")
    .select("id, amount, status, due_date, paid_date, tenant:tenants(first_name, last_name)")
    .order("due_date", { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {format(now, "EEEE, MMMM d, yyyy")} · Portfolio overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/reports">
              <BarChart3 className="mr-1.5 h-4 w-4" />
              Reports
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/invoices/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Properties"
          value={totalProperties}
          description={`${occupancyRate}% occupancy · ${vacantProperties} vacant`}
          icon={Building2}
          trend={totalProperties > 0 ? { value: occupancyRate, isPositive: occupancyRate >= 80 } : undefined}
        />
        <StatsCard
          title="Active Tenants"
          value={activeTenants}
          description={`${expiringLeases.length} lease${expiringLeases.length !== 1 ? "s" : ""} expiring soon`}
          icon={Users}
        />
        <StatsCard
          title="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          description="Expected from occupied units"
          icon={DollarSign}
          trend={{ value: collectionRate, isPositive: collectionRate >= 90 }}
        />
        <StatsCard
          title="Open Requests"
          value={openMaintenanceRequests}
          description={`${overduePayments.length} overdue payment${overduePayments.length !== 1 ? "s" : ""}`}
          icon={Wrench}
        />
      </div>

      {/* Alerts row */}
      {(expiringLeases.length > 0 || overduePayments.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {expiringLeases.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <CalendarClock className="h-4 w-4" />
                  Leases Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiringLeases.slice(0, 3).map((t: any) => {
                    const days = differenceInDays(parseISO(t.lease_end!), now)
                    return (
                      <Link key={t.id} href={`/dashboard/tenants/${t.id}`}>
                        <div className="flex items-center justify-between text-sm py-1.5 hover:opacity-80 transition-opacity">
                          <span className="font-medium">{t.first_name} {t.last_name}</span>
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs">
                            {days === 0 ? "Today" : `${days}d`}
                          </Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {overduePayments.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue Payments ({overduePayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overduePayments.slice(0, 3).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5">
                      <span className="text-muted-foreground">Due {formatDate(p.due_date)}</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10" asChild>
                  <Link href="/dashboard/invoices?status=overdue">View Overdue</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Revenue Chart + Collection Rate */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={monthlyRevenueData} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This Month</CardTitle>
            <CardDescription>Payment collection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Collection Rate</span>
                <span className="text-sm font-bold text-primary">{collectionRate}%</span>
              </div>
              <Progress value={collectionRate} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Occupancy</span>
                <span className="text-sm font-bold text-emerald-500">{occupancyRate}%</span>
              </div>
              <Progress value={occupancyRate} className="h-2" />
            </div>
            <div className="pt-2 space-y-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid this month</span>
                <span className="font-medium text-emerald-500">{thisMonthPaid}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Still pending</span>
                <span className="font-medium">{thisMonthPayments.length - thisMonthPaid}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected revenue</span>
                <span className="font-medium">{formatCurrency(monthlyRevenue)}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/dashboard/reports">
                <TrendingUp className="mr-1.5 h-4 w-4" />
                Full Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Recent Maintenance</span>
              <Link href="/dashboard/maintenance" className="text-xs font-normal text-primary hover:underline">View all</Link>
            </CardTitle>
            <CardDescription>Latest maintenance requests</CardDescription>
          </CardHeader>
          <CardContent>
            {recentMaintenance.length === 0 ? (
              <div className="py-8 text-center">
                <Wrench className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No maintenance requests yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMaintenance.map((request) => (
                  <Link key={request.id} href={`/dashboard/maintenance/${request.id}`}>
                    <div className="flex items-start justify-between gap-4 py-2 hover:opacity-80 transition-opacity">
                      <div className="flex items-start gap-3">
                        {request.urgency === "emergency" ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        ) : request.status === "completed" ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium leading-tight">{request.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(request.created_at)}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          request.urgency === "emergency" || request.urgency === "high"
                            ? "border-red-500/30 text-red-500 text-xs"
                            : request.urgency === "medium"
                            ? "border-amber-500/30 text-amber-500 text-xs"
                            : "border-blue-500/30 text-blue-500 text-xs"
                        }
                      >
                        {request.urgency}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Recent Invoices</span>
              <Link href="/dashboard/invoices" className="text-xs font-normal text-primary hover:underline">View all</Link>
            </CardTitle>
            <CardDescription>Latest rent payment activity</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentPayments || recentPayments.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No invoices yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/dashboard/invoices/new">Create Invoice</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment: any) => (
                  <Link key={payment.id} href={`/dashboard/invoices/${payment.id}`}>
                    <div className="flex items-center justify-between gap-4 py-2 hover:opacity-80 transition-opacity">
                      <div>
                        <p className="text-sm font-medium">
                          {payment.tenant?.first_name} {payment.tenant?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">Due {formatDate(payment.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(payment.amount)}</p>
                        <Badge
                          variant="outline"
                          className={
                            payment.status === "paid"
                              ? "border-emerald-500/30 text-emerald-500 text-xs"
                              : payment.status === "overdue"
                              ? "border-red-500/30 text-red-500 text-xs"
                              : "border-amber-500/30 text-amber-500 text-xs"
                          }
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/dashboard/properties/new", icon: Building2, label: "Add Property", desc: "New listing" },
              { href: "/dashboard/tenants/new", icon: Users, label: "Add Tenant", desc: "New tenant" },
              { href: "/dashboard/invoices/new", icon: FileText, label: "Create Invoice", desc: "Rent invoice" },
              { href: "/dashboard/maintenance/new", icon: Wrench, label: "Log Request", desc: "Maintenance issue" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-border p-4 transition-all hover:border-primary/40 hover:bg-accent group"
              >
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
