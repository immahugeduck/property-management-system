import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PrintLayout } from "@/components/reports/print-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter 
} from "@/components/ui/table"

export default async function MaintenanceSummaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { data: requests } = await supabase
    .from("maintenance_requests")
    .select(`
      *,
      property:properties(name, address),
      tenant:tenants(first_name, last_name)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const openRequests = requests?.filter(r => r.status === "open") || []
  const inProgressRequests = requests?.filter(r => r.status === "in_progress") || []
  const completedRequests = requests?.filter(r => r.status === "completed") || []

  const totalEstimatedCost = requests?.reduce((sum, r) => sum + (Number(r.estimated_cost) || 0), 0) || 0
  const totalActualCost = completedRequests.reduce((sum, r) => sum + (Number(r.actual_cost) || 0), 0)

  // Group by category
  const byCategory: Record<string, { count: number, cost: number }> = {}
  requests?.forEach(r => {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { count: 0, cost: 0 }
    }
    byCategory[r.category].count++
    byCategory[r.category].cost += Number(r.actual_cost) || 0
  })

  // Group by property
  const byProperty: Record<string, { name: string, count: number, cost: number }> = {}
  requests?.forEach(r => {
    if (r.property_id && r.property) {
      if (!byProperty[r.property_id]) {
        byProperty[r.property_id] = { name: r.property.name, count: 0, cost: 0 }
      }
      byProperty[r.property_id].count++
      byProperty[r.property_id].cost += Number(r.actual_cost) || 0
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString()
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "emergency":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Emergency</Badge>
      case "high":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">High</Badge>
      case "medium":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Medium</Badge>
      case "low":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Low</Badge>
      default:
        return <Badge variant="outline">{urgency}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Open</Badge>
      case "in_progress":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">In Progress</Badge>
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>
      case "cancelled":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <PrintLayout 
      title="Maintenance Summary" 
      subtitle="Overview of all maintenance requests"
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Open Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{openRequests.length}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{inProgressRequests.length}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{completedRequests.length}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalActualCost)}</p>
            </CardContent>
          </Card>
        </div>

        {/* By Category */}
        <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
          <Card className="print:border print:shadow-none">
            <CardHeader>
              <CardTitle>By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(byCategory)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([category, data]) => (
                      <TableRow key={category}>
                        <TableCell className="font-medium capitalize">{category}</TableCell>
                        <TableCell className="text-right">{data.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.cost)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="print:border print:shadow-none">
            <CardHeader>
              <CardTitle>By Property</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(byProperty)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([id, data]) => (
                      <TableRow key={id}>
                        <TableCell className="font-medium">{data.name}</TableCell>
                        <TableCell className="text-right">{data.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.cost)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* All Requests */}
        <Card className="print:border print:shadow-none">
          <CardHeader>
            <CardTitle>All Maintenance Requests</CardTitle>
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
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell className="font-medium max-w-48 truncate">
                      {request.title}
                    </TableCell>
                    <TableCell>{request.property?.name || "—"}</TableCell>
                    <TableCell className="capitalize">{request.category}</TableCell>
                    <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                    <TableCell className="text-right">
                      {request.actual_cost ? formatCurrency(request.actual_cost) : "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalActualCost)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            {(!requests || requests.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No maintenance requests found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PrintLayout>
  )
}
