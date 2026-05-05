import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  FileText, 
  Users, 
  Wrench, 
  CreditCard,
  TrendingUp,
  Building2,
  ArrowRight
} from "lucide-react"

const reports = [
  {
    name: "Income Statement",
    description: "Monthly and yearly revenue breakdown by property with total income, expenses, and net profit",
    href: "/dashboard/reports/income-statement",
    icon: TrendingUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    name: "Rent Roll Report",
    description: "Complete list of all tenants with their units, lease dates, rent amounts, and payment status",
    href: "/dashboard/reports/rent-roll",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    name: "Payment History",
    description: "Detailed payment records showing all transactions with dates, amounts, and payment methods",
    href: "/dashboard/reports/payment-history",
    icon: CreditCard,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    name: "Maintenance Summary",
    description: "Overview of all maintenance requests with status, costs, and completion rates by property",
    href: "/dashboard/reports/maintenance-summary",
    icon: Wrench,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    name: "Property Overview",
    description: "Comprehensive property report with occupancy, revenue, expenses, and maintenance history",
    href: "/dashboard/reports/property-overview",
    icon: Building2,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
]

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and print detailed reports for your properties
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.name} href={report.href}>
            <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${report.bgColor}`}>
                    <report.icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <CardTitle className="text-lg mt-3">{report.name}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {report.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="p-2 rounded-lg bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Print Any Report</h3>
            <p className="text-sm text-muted-foreground">
              All reports include a print-friendly view. Click any report above, then use the Print button to generate a PDF or send to your printer.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
