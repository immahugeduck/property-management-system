import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  DollarSign,
  TrendingUp,
  Wrench,
  BarChart3,
} from "lucide-react"
import { RevenueByPropertyChart } from "@/components/reports/revenue-by-property-chart"
import { MonthlyCollectionChart } from "@/components/reports/monthly-collection-chart"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const now = new Date()

  const [propertiesResult, paymentsResult, maintenanceResult, tenantsResult] = await Promise.all([
    supabase.from("properties").select("id, name, status, monthly_rent, property_type"),
    supabase.from("rent_payments").select("id, amount, status, due_date, property_id, paid_date, created_at"),
    supabase.from("maintenance_requests").select("id, status, estimated_cost, actual_cost, property_id, created_at, category"),
    supabase.from("tenants").select("id, status, property_id"),
  ])

  const properties = propertiesResult.data || []
  const payments = paymentsResult.data || []
  const maintenance = maintenanceResult.data || []
  const tenants = tenantsResult.data || []

  // Summary stats
  const totalExpectedRevenue = properties.filter(p => p.status === "occupied").reduce((s, p) => s + (p.monthly_rent || 0), 0)
  const totalCollected = payments.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0)
  const totalMaintenanceCost = maintenance.reduce((s, m) => s + (m.actual_cost || m.estimated_cost || 0), 0)
  const occupiedCount = properties.filter(p => p.status === "occupied").length
  const occupancyRate = properties.length > 0 ? Math.round((occupiedCount / properties.length) * 100) : 0

  // Revenue by property
  const revenueByProperty = properties.map(p => {
    const collected = payments.filter(pay => pay.property_id === p.id && pay.status === "paid").reduce((s, pay) => s + (pay.amount || 0), 0)
    const pending = payments.filter(pay => pay.property_id === p.id && pay.status === "pending").reduce((s, pay) => s + (pay.amount || 0), 0)
    const maintenanceCosts = maintenance.filter(m => m.property_id === p.id).reduce((s, m) => s + (m.actual_cost || m.estimated_cost || 0), 0)
    const tenantCount = tenants.filter(t => t.property_id === p.id && t.status === "active").length
    return {
      name: p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name,
      fullName: p.name,
      collected,
      pending,
      maintenance: maintenanceCosts,
      status: p.status,
      tenants: tenantCount,
      expected: p.monthly_rent || 0,
    }
  }).sort((a, b) => b.collected - a.collected)

  // Monthly collection data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i)
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const monthPayments = payments.filter(p => {
      const d = new Date(p.due_date)
      return d >= start && d <= end
    })
    const paid = monthPayments.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0)
    const total = monthPayments.reduce((s, p) => s + (p.amount || 0), 0)
    return {
      month: format(month, "MMM"),
      collected: paid,
      expected: total,
      rate: total > 0 ? Math.round((paid / total) * 100) : 0,
    }
  })

  // Maintenance breakdown by category
  const maintenanceByCategory = Object.entries(
    maintenance.reduce((acc: Record<string, number>, m) => {
      const cat = m.category || "general"
      acc[cat] = (acc[cat] || 0) + (m.actual_cost || m.estimated_cost || 0)
      return acc
    }, {})
  ).map(([category, cost]) => ({ category, cost }))
    .sort((a, b) => b.cost - a.cost)

  const categoryLabels: Record<string, string> = {
    plumbing: "Plumbing", electrical: "Electrical", hvac: "HVAC",
    appliance: "Appliance", structural: "Structural", general: "General",
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Portfolio analytics and financial overview</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Expected</p>
                <p className="text-xl font-bold">{formatCurrency(totalExpectedRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Occupancy Rate</p>
                <p className="text-xl font-bold">{occupancyRate}%</p>
                <p className="text-xs text-muted-foreground">{occupiedCount} / {properties.length} units</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Wrench className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Maintenance Costs</p>
                <p className="text-xl font-bold">{formatCurrency(totalMaintenanceCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyCollectionChart data={monthlyData} />
        <RevenueByPropertyChart data={revenueByProperty} />
      </div>

      {/* Property breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Property</CardTitle>
          <CardDescription>All-time collected rent and costs per property</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No properties yet</p>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-6 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Property</span>
                <span className="text-right">Expected/mo</span>
                <span className="text-right">Collected</span>
                <span className="text-right">Pending</span>
                <span className="text-right">Maintenance</span>
                <span className="text-center">Status</span>
              </div>
              <div className="divide-y divide-border">
                {revenueByProperty.map((p) => (
                  <div key={p.fullName} className="grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-6 py-3.5 text-sm items-center hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{p.fullName}</p>
                        <p className="text-xs text-muted-foreground">{p.tenants} tenant{p.tenants !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <p className="text-right text-muted-foreground">{formatCurrency(p.expected)}</p>
                    <p className="text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(p.collected)}</p>
                    <p className="text-right text-amber-600 dark:text-amber-400">{formatCurrency(p.pending)}</p>
                    <p className="text-right text-orange-600 dark:text-orange-400">{formatCurrency(p.maintenance)}</p>
                    <div className="flex justify-center">
                      <Badge
                        variant="outline"
                        className={
                          p.status === "occupied" ? "border-emerald-500/30 text-emerald-500 text-xs"
                          : p.status === "vacant" ? "border-amber-500/30 text-amber-500 text-xs"
                          : "border-red-500/30 text-red-500 text-xs"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Maintenance by category */}
      {maintenanceByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Maintenance Costs by Category</CardTitle>
            <CardDescription>Total repair and maintenance spending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {maintenanceByCategory.map((item) => {
                const pct = totalMaintenanceCost > 0 ? Math.round((item.cost / totalMaintenanceCost) * 100) : 0
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{categoryLabels[item.category] || item.category}</span>
                      <span className="text-muted-foreground">{formatCurrency(item.cost)} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
