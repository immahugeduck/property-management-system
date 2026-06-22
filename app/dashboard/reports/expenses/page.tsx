import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ReportFilters, getDateRange } from "@/components/reports/report-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

const fmtDate = (d: string) => new Date(d).toLocaleDateString()

const categoryLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, " ")

export default async function ExpenseReportPage({
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

  const [{ data: properties }, { data: rawExpenses }] = await Promise.all([
    supabase.from("properties").select("id, name").eq("user_id", user.id).order("name"),
    supabase
      .from("expenses")
      .select("id, amount, date, category, description, vendor, property_id, properties(name)")
      .eq("user_id", user.id)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false }),
  ])

  const expenses = rawExpenses?.filter((e) =>
    propertyId === "all" || e.property_id === propertyId
  ) ?? []

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const periodMonths = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24 * 30))
  const avgMonthly = totalExpenses / periodMonths

  // By category
  const byCategory: Record<string, number> = {}
  expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount)
  })
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const topCategory = sortedCategories[0]?.[0] ?? "—"

  // By property
  const byProperty: Record<string, { name: string; amount: number }> = {}
  expenses.forEach((e) => {
    if (!e.property_id) return
    const name = (e.properties as unknown as { name: string } | null)?.name ?? "Unknown"
    if (!byProperty[e.property_id]) byProperty[e.property_id] = { name, amount: 0 }
    byProperty[e.property_id].amount += Number(e.amount)
  })

  const csvData = expenses.map((e) => ({
    Date: fmtDate(e.date),
    Property: (e.properties as unknown as { name: string } | null)?.name ?? "—",
    Category: categoryLabel(e.category),
    Description: e.description,
    Vendor: e.vendor ?? "",
    Amount: Number(e.amount),
  }))

  return (
    <div className="space-y-6">
      <div className="hidden print:flex items-center justify-between border-b pb-4 mb-6">
        <h1 className="text-xl font-bold">Expense Report</h1>
        <p className="text-sm text-gray-500">Generated {new Date().toLocaleDateString()}</p>
      </div>

      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Expense Report</h1>
        <p className="text-sm text-muted-foreground">{from} to {to}</p>
      </div>

      <ReportFilters
        properties={properties ?? []}
        showProperty
        csvData={csvData}
        csvFilename={`expenses-${from}-${to}`}
        title="Expense Report"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Expenses", value: fmt(totalExpenses), color: "text-red-600" },
          { label: "Avg / Month", value: fmt(avgMonthly), color: "text-foreground" },
          { label: "Top Category", value: categoryLabel(topCategory), color: "text-foreground" },
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
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.map(([cat, amount]) => (
                <TableRow key={cat}>
                  <TableCell className="font-medium">{categoryLabel(cat)}</TableCell>
                  <TableCell className="text-right text-red-600">{fmt(amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {expenses.filter((e) => e.category === cat).length}
                  </TableCell>
                </TableRow>
              ))}
              {sortedCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No expenses recorded for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {sortedCategories.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{fmt(totalExpenses)}</TableCell>
                  <TableCell className="text-right font-bold">100%</TableCell>
                  <TableCell className="text-right font-bold">{expenses.length}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* By Property */}
      {Object.keys(byProperty).length > 0 && (
        <Card className="print:border print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Property</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byProperty)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([id, d]) => (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right text-red-600">{fmt(d.amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {totalExpenses > 0 ? ((d.amount / totalExpenses) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Transaction Detail */}
      <Card className="print:border print:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transaction Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{fmtDate(e.date)}</TableCell>
                  <TableCell>{(e.properties as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                  <TableCell>{categoryLabel(e.category)}</TableCell>
                  <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                  <TableCell className="text-muted-foreground">{e.vendor ?? "—"}</TableCell>
                  <TableCell className="text-right text-red-600">{fmt(Number(e.amount))}</TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No expenses for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {expenses.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{fmt(totalExpenses)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
