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

export default async function PropertyOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true })

  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .eq("user_id", user.id)

  const { data: payments } = await supabase
    .from("rent_payments")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "paid")

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)

  const { data: maintenance } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("user_id", user.id)

  // Calculate metrics for each property
  const propertyMetrics = properties?.map(property => {
    const propertyTenants = tenants?.filter(t => t.property_id === property.id) || []
    const propertyPayments = payments?.filter(p => p.property_id === property.id) || []
    const propertyExpenses = expenses?.filter(e => e.property_id === property.id) || []
    const propertyMaintenance = maintenance?.filter(m => m.property_id === property.id) || []

    const totalIncome = propertyPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalExpenses = propertyExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const maintenanceCost = propertyMaintenance.reduce((sum, m) => sum + (Number(m.actual_cost) || 0), 0)
    const openMaintenance = propertyMaintenance.filter(m => m.status === "open" || m.status === "in_progress").length

    return {
      ...property,
      tenantCount: propertyTenants.length,
      activeTenants: propertyTenants.filter(t => t.status === "active").length,
      totalIncome,
      totalExpenses,
      maintenanceCost,
      netIncome: totalIncome - totalExpenses,
      openMaintenance,
      totalMaintenance: propertyMaintenance.length,
    }
  }) || []

  const totalMonthlyRent = properties?.reduce((sum, p) => sum + Number(p.monthly_rent), 0) || 0
  const occupiedCount = properties?.filter(p => p.status === "occupied").length || 0
  const vacantCount = properties?.filter(p => p.status === "vacant").length || 0
  const totalIncome = propertyMetrics.reduce((sum, p) => sum + p.totalIncome, 0)
  const totalExpenses = propertyMetrics.reduce((sum, p) => sum + p.totalExpenses, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "occupied":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Occupied</Badge>
      case "vacant":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Vacant</Badge>
      case "maintenance":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Maintenance</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <PrintLayout 
      title="Property Overview Report" 
      subtitle="Comprehensive property analysis"
    >
      <div className="space-y-6">
        {/* Portfolio Summary */}
        <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Total Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{properties?.length || 0}</p>
              <p className="text-sm text-muted-foreground">
                {occupiedCount} occupied, {vacantCount} vacant
              </p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Potential Monthly
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalMonthlyRent)}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Net Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(totalIncome - totalExpenses)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Property Details Table */}
        <Card className="print:border print:shadow-none">
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Monthly Rent</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propertyMetrics.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{property.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {property.bedrooms}bd / {property.bathrooms}ba
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{property.city}, {property.state}</p>
                        <p className="text-sm text-muted-foreground">{property.zip_code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{property.property_type}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(property.monthly_rent)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {formatCurrency(property.totalIncome)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(property.totalExpenses)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${property.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(property.netIncome)}
                    </TableCell>
                    <TableCell>{getStatusBadge(property.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-bold">Portfolio Total</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalMonthlyRent)}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(totalIncome)}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{formatCurrency(totalExpenses)}</TableCell>
                  <TableCell className={`text-right font-bold ${totalIncome - totalExpenses >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(totalIncome - totalExpenses)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            {(!properties || properties.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No properties found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Summary */}
        <Card className="print:border print:shadow-none">
          <CardHeader>
            <CardTitle>Maintenance by Property</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Total Requests</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Maintenance Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propertyMetrics
                  .filter(p => p.totalMaintenance > 0)
                  .sort((a, b) => b.maintenanceCost - a.maintenanceCost)
                  .map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{property.name}</TableCell>
                      <TableCell className="text-right">{property.totalMaintenance}</TableCell>
                      <TableCell className="text-right">
                        {property.openMaintenance > 0 ? (
                          <span className="text-amber-600">{property.openMaintenance}</span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(property.maintenanceCost)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PrintLayout>
  )
}
