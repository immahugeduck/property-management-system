import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ReportFilters } from "@/components/reports/report-filters"
import { getDateRange } from "@/lib/reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"

const fmt = (n: number | null) =>
  n != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
    : "—"

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—")

const urgencyBadge = (u: string) => {
  const map: Record<string, string> = {
    low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    emergency: "bg-red-500/10 text-red-600 border-red-500/20",
  }
  return <Badge className={map[u] ?? ""}>{u.charAt(0).toUpperCase() + u.slice(1)}</Badge>
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    open: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    cancelled: "bg-muted text-muted-foreground",
  }
  return (
    <Badge className={map[s] ?? ""}>
      {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  )
}

const catLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, " ")

export default async function MaintenanceCostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const params = await searchParams
  const preset = params.preset || "this-year"
  const propertyId = params.property || "all"

  const { from, to } = preset === "custom"
    ? { from: params.from || new Date().toISOString().slice(0, 10), to: params.to || new Date().toISOString().slice(0, 10) }
    : getDateRange(preset)

  const [{ data: properties }, { data: rawRequests }] = await Promise.all([
    supabase.from("properties").select("id, name").eq("user_id", user.id).order("name"),
    supabase
      .from("maintenance_requests")
      .select("id, title, category, urgency, status, estimated_cost, actual_cost, created_at, completed_date, property_id, properties(name)")
      .eq("user_id", user.id)
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false }),
  ])

  const requests = rawRequests?.filter((r) =>
    propertyId === "all" || r.property_id === propertyId
  ) ?? []

  const totalActual = requests.reduce((s, r) => s + (r.actual_cost ?? 0), 0)
  const totalEstimated = requests.reduce((s, r) => s + (r.estimated_cost ?? 0), 0)
  const openCount = requests.filter((r) => r.status === "open").length
  const completedCount = requests.filter((r) => r.status === "completed").length
  const avgCost =
    completedCount > 0
      ? requests.filter((r) => r.status === "completed" && r.actual_cost)
          .reduce((s, r) => s + (r.actual_cost ?? 0), 0) / completedCount
      : 0

  // By category
  const byCategory: Record<string, { count: number; estimated: number; actual: number }> = {}
  requests.forEach((r) => {
    if (!byCategory[r.category]) byCategory[r.category] = { count: 0, estimated: 0, actual: 0 }
    byCategory[r.category].count++
    byCategory[r.category].estimated += r.estimated_cost ?? 0
    byCategory[r.category].actual += r.actual_cost ?? 0
  })

  // By property
  const byProperty: Record<string, { name: string; count: number; actual: number }> = {}
  requests.forEach((r) => {
    if (!r.property_id) return
    const name = (r.properties as unknown as { name: string } | null)?.name ?? "Unknown"
    if (!byProperty[r.property_id]) byProperty[r.property_id] = { name, count: 0, actual: 0 }
    byProperty[r.property_id].count++
    byProperty[r.property_id].actual += r.actual_cost ?? 0
  })

  const csvData = requests.map((r) => ({
    Date: fmtDate(r.created_at),
    Property: (r.properties as unknown as { name: string } | null)?.name ?? "—",
    Title: r.title,
    Category: catLabel(r.category),
    Urgency: r.urgency,
    Status: r.status,
    "Estimated Cost": r.estimated_cost ?? "",
    "Actual Cost": r.actual_cost ?? "",
    "Completed Date": fmtDate(r.completed_date),
  }))

  return (
    <div className="space-y-6">
      <div className="hidden print:flex items-center justify-between border-b pb-4 mb-6">
        <h1 className="text-xl font-bold">Maintenance Costs</h1>
        <p className="text-sm text-gray-500">Generated {new Date().toLocaleDateString()}</p>
      </div>

      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Maintenance Costs</h1>
        <p className="text-sm text-muted-foreground">{from} to {to}</p>
      </div>

      <ReportFilters
        properties={properties ?? []}
        showProperty
        csvData={csvData}
        csvFilename={`maintenance-costs-${from}-${to}`}
        title="Maintenance Costs"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Actual Cost", value: fmt(totalActual), color: "text-red-600" },
          { label: "Total Estimated", value: fmt(totalEstimated), color: "text-foreground" },
          { label: "Open Requests", value: String(openCount), color: "text-amber-600" },
          { label: "Avg Cost (Completed)", value: fmt(avgCost), color: "text-foreground" },
        ].map((k) => (
          <Card key={k.label} className="print:border print:shadow-none">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* By Category */}
      <Card className="print:border print:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
                <TableHead className="text-right">Actual Cost</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byCategory)
                .sort((a, b) => b[1].actual - a[1].actual)
                .map(([cat, d]) => (
                  <TableRow key={cat}>
                    <TableCell className="font-medium">{catLabel(cat)}</TableCell>
                    <TableCell className="text-right">{d.count}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmt(d.estimated)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(d.actual)}</TableCell>
                    <TableCell className={`text-right ${d.actual > d.estimated ? "text-red-600" : "text-emerald-600"}`}>
                      {d.estimated > 0 ? fmt(d.actual - d.estimated) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              {Object.keys(byCategory).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No maintenance requests for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {Object.keys(byCategory).length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{requests.length}</TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">{fmt(totalEstimated)}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{fmt(totalActual)}</TableCell>
                  <TableCell className={`text-right font-bold ${totalActual > totalEstimated ? "text-red-600" : "text-emerald-600"}`}>
                    {totalEstimated > 0 ? fmt(totalActual - totalEstimated) : "—"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* By Property */}
      {Object.keys(byProperty).length > 1 && (
        <Card className="print:border print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Property</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Actual Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byProperty)
                  .sort((a, b) => b[1].actual - a[1].actual)
                  .map(([id, d]) => (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right">{d.count}</TableCell>
                      <TableCell className="text-right text-red-600">{fmt(d.actual)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Request Detail */}
      <Card className="print:border print:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Request Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
                <TableHead className="text-right">Actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium max-w-[160px] truncate">{r.title}</TableCell>
                  <TableCell>{(r.properties as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                  <TableCell>{catLabel(r.category)}</TableCell>
                  <TableCell>{urgencyBadge(r.urgency)}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt(r.estimated_cost)}</TableCell>
                  <TableCell className="text-right text-red-600">{fmt(r.actual_cost)}</TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No maintenance requests for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {requests.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">{fmt(totalEstimated)}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{fmt(totalActual)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
