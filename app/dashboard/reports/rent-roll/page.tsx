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

export default async function RentRollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { data: tenants } = await supabase
    .from("tenants")
    .select(`
      *,
      property:properties(name, address, city, state)
    `)
    .eq("user_id", user.id)
    .order("last_name", { ascending: true })

  // Get recent payments for each tenant
  const { data: payments } = await supabase
    .from("rent_payments")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: false })

  // Calculate payment status per tenant
  const tenantPaymentStatus: Record<string, { lastPaid: string | null, status: string }> = {}
  
  tenants?.forEach(tenant => {
    const tenantPayments = payments?.filter(p => p.tenant_id === tenant.id) || []
    const lastPayment = tenantPayments.find(p => p.status === "paid")
    const hasPending = tenantPayments.some(p => p.status === "pending")
    const hasOverdue = tenantPayments.some(p => p.status === "overdue")
    
    tenantPaymentStatus[tenant.id] = {
      lastPaid: lastPayment?.paid_date || null,
      status: hasOverdue ? "overdue" : hasPending ? "pending" : "current"
    }
  })

  const totalMonthlyRent = tenants?.reduce((sum, t) => sum + Number(t.rent_amount), 0) || 0
  const activeTenants = tenants?.filter(t => t.status === "active") || []

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "current":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Current</Badge>
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
      case "overdue":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Overdue</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getDaysUntilLeaseEnd = (leaseEnd: string | null) => {
    if (!leaseEnd) return null
    const end = new Date(leaseEnd)
    const today = new Date()
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <PrintLayout 
      title="Rent Roll Report" 
      subtitle={`All tenants as of ${new Date().toLocaleDateString()}`}
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Total Tenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{tenants?.length || 0}</p>
              <p className="text-sm text-muted-foreground">{activeTenants.length} active</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Total Monthly Rent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalMonthlyRent)}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Annual Potential
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalMonthlyRent * 12)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Rent Roll Table */}
        <Card className="print:border print:shadow-none">
          <CardHeader>
            <CardTitle>Tenant Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Lease Start</TableHead>
                  <TableHead>Lease End</TableHead>
                  <TableHead className="text-right">Monthly Rent</TableHead>
                  <TableHead>Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants?.map((tenant) => {
                  const daysUntilEnd = getDaysUntilLeaseEnd(tenant.lease_end)
                  const isExpiringSoon = daysUntilEnd !== null && daysUntilEnd <= 60 && daysUntilEnd > 0
                  
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tenant.first_name} {tenant.last_name}</p>
                          <p className="text-sm text-muted-foreground print:text-gray-500">{tenant.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.property ? (
                          <div>
                            <p className="font-medium">{tenant.property.name}</p>
                            <p className="text-sm text-muted-foreground print:text-gray-500">
                              {tenant.property.city}, {tenant.property.state}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(tenant.lease_start)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{formatDate(tenant.lease_end)}</span>
                          {isExpiringSoon && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs print:bg-amber-100">
                              {daysUntilEnd}d left
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(tenant.rent_amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tenantPaymentStatus[tenant.id]?.status || "current")}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalMonthlyRent)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            {(!tenants || tenants.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No tenants found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PrintLayout>
  )
}
