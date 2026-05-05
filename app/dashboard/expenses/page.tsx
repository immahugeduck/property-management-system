import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Receipt, TrendingDown, Building2, Calendar } from "lucide-react"

const categoryColors: Record<string, string> = {
  repairs: "bg-red-500/10 text-red-600 border-red-500/20",
  utilities: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  insurance: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  taxes: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  management: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  supplies: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  landscaping: "bg-green-500/10 text-green-600 border-green-500/20",
  cleaning: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { data: expenses } = await supabase
    .from("expenses")
    .select(`
      *,
      property:properties(name)
    `)
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  // Calculate stats
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const thisMonthExpenses = expenses?.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }) || []

  const lastMonthExpenses = expenses?.filter(e => {
    const d = new Date(e.date)
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
  }) || []

  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

  // Group by category
  const byCategory: Record<string, number> = {}
  expenses?.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount)
  })

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Expenses</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage property-related expenses
          </p>
        </div>
        <Link href="/dashboard/expenses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(thisMonthTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {thisMonthExpenses.length} expenses recorded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(lastMonthTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {thisMonthTotal > lastMonthTotal ? "Spending increased" : "Spending decreased"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total All Time</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses?.length || 0} total expenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{topCategory?.[0] || "—"}</div>
            <p className="text-xs text-muted-foreground">
              {topCategory ? formatCurrency(topCategory[1]) : "No expenses yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>
            All expenses across your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(expense.date)}
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/dashboard/expenses/${expense.id}`}
                      className="font-medium hover:underline"
                    >
                      {expense.description}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {expense.property?.name || (
                      <span className="text-muted-foreground">General</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={categoryColors[expense.category] || categoryColors.other}>
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.vendor || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!expenses || expenses.length === 0) && (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No expenses recorded</h3>
              <p className="text-muted-foreground mt-2">
                Start tracking your property expenses to see them here.
              </p>
              <Link href="/dashboard/expenses/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Expense
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
