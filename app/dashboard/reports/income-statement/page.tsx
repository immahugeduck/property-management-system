import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PrintLayout } from "@/components/reports/print-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter 
} from "@/components/ui/table"

export default async function IncomeStatementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get all payments for the current year
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01`
  const endOfYear = `${currentYear}-12-31`

  const { data: payments } = await supabase
    .from("rent_payments")
    .select(`
      *,
      property:properties(name, address)
    `)
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("paid_date", startOfYear)
    .lte("paid_date", endOfYear)
    .order("paid_date", { ascending: false })

  const { data: expenses } = await supabase
    .from("expenses")
    .select(`
      *,
      property:properties(name, address)
    `)
    .eq("user_id", user.id)
    .gte("date", startOfYear)
    .lte("date", endOfYear)
    .order("date", { ascending: false })

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)

  // Calculate totals by property
  const propertyIncome: Record<string, { name: string, income: number, expenses: number }> = {}

  properties?.forEach(p => {
    propertyIncome[p.id] = { name: p.name, income: 0, expenses: 0 }
  })

  payments?.forEach(p => {
    if (p.property_id && propertyIncome[p.property_id]) {
      propertyIncome[p.property_id].income += Number(p.amount)
    }
  })

  expenses?.forEach(e => {
    if (e.property_id && propertyIncome[e.property_id]) {
      propertyIncome[e.property_id].expenses += Number(e.amount)
    }
  })

  const totalIncome = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const netProfit = totalIncome - totalExpenses

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {}
  expenses?.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount)
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  return (
    <PrintLayout 
      title="Income Statement" 
      subtitle={`Financial Summary for ${currentYear}`}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
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
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card className="print:border print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-600">
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(netProfit)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Income by Property */}
        <Card className="print:border print:shadow-none">
          <CardHeader>
            <CardTitle>Income & Expenses by Property</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(propertyIncome).map(([id, data]) => (
                  <TableRow key={id}>
                    <TableCell className="font-medium">{data.name}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(data.income)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(data.expenses)}</TableCell>
                    <TableCell className={`text-right font-medium ${data.income - data.expenses >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(data.income - data.expenses)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(totalIncome)}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{formatCurrency(totalExpenses)}</TableCell>
                  <TableCell className={`text-right font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(netProfit)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="print:border print:shadow-none">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(expensesByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <TableRow key={category}>
                      <TableCell className="font-medium capitalize">{category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total Expenses</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalExpenses)}</TableCell>
                  <TableCell className="text-right font-bold">100%</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PrintLayout>
  )
}
