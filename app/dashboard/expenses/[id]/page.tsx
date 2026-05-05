import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Building2, Calendar, DollarSign, Tag, Store, FileText } from "lucide-react"
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button"

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

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { id } = await params

  const { data: expense } = await supabase
    .from("expenses")
    .select(`
      *,
      property:properties(id, name, address)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!expense) {
    notFound()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", { 
      weekday: "long",
      month: "long", 
      day: "numeric", 
      year: "numeric" 
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/expenses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{expense.description}</h1>
            <p className="text-muted-foreground">
              Recorded {formatDate(expense.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/expenses/${expense.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <DeleteExpenseButton expenseId={expense.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <DollarSign className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Amount</span>
                </div>
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(expense.amount)}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(expense.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <Badge className={`mt-1 ${categoryColors[expense.category] || categoryColors.other}`}>
                      {expense.category}
                    </Badge>
                  </div>
                </div>
              </div>

              {expense.vendor && (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vendor</p>
                    <p className="font-medium">{expense.vendor}</p>
                  </div>
                </div>
              )}

              {expense.notes && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Notes
                  </div>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg">{expense.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Property Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expense.property ? (
                <Link 
                  href={`/dashboard/properties/${expense.property.id}`}
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <p className="font-medium">{expense.property.name}</p>
                  <p className="text-sm text-muted-foreground">{expense.property.address}</p>
                </Link>
              ) : (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">General expense - not linked to a specific property</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
