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

export default async function PaymentHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { data: payments } = await supabase
    .from("rent_payments")
    .select(`
      *,
      tenant:tenants(first_name, last_name),
      property:properties(name)
    `)
    .eq("user_id", user.id)
    .order("due_date", { ascending: false })
    .limit(100)

  const paidPayments = payments?.filter(p => p.status === "paid") || []
  const pendingPayments = payments?.filter(p => p.status === "pending") || []
  const overduePayments = payments?.filter(p => p.status === "overdue") || []

  const totalCollected = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalOverdue = overduePayments.reduce((sum, p) => sum + Number(p.amount), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
      case "overdue":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Overdue</Badge>
      case "partial":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Partial</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <PrintLayout 
      title="Payment History" 
      subtitle="Complete payment records"
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{payments?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card className="print:border print:shadow-none">
          <CardHeader>
            <CardTitle>All Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(payment.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.tenant ? `${payment.tenant.first_name} ${payment.tenant.last_name}` : "—"}
                    </TableCell>
                    <TableCell>
                      {payment.property?.name || "—"}
                    </TableCell>
                    <TableCell>{formatDate(payment.due_date)}</TableCell>
                    <TableCell>{formatDate(payment.paid_date)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.payment_method || "—"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold">Total Collected</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">
                    {formatCurrency(totalCollected)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            {(!payments || payments.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No payments found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PrintLayout>
  )
}
