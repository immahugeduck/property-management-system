import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Phone, Mail, HardHat, ChevronRight } from "lucide-react"

const specialtyColor: Record<string, string> = {
  plumbing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  electrical: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  hvac: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  appliance: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  structural: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  landscaping: "bg-green-500/10 text-green-600 border-green-500/20",
  cleaning: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  general: "bg-muted text-muted-foreground",
}

export default async function VendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .eq("user_id", user.id)
    .order("name")

  // Get total paid per vendor
  const { data: payments } = await supabase
    .from("vendor_payments")
    .select("vendor_id, amount")
    .eq("user_id", user.id)

  const totalByVendor: Record<string, number> = {}
  payments?.forEach((p) => {
    totalByVendor[p.vendor_id] = (totalByVendor[p.vendor_id] ?? 0) + Number(p.amount)
  })

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground mt-1">Manage your maintenance vendors and contractors</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vendors/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Link>
        </Button>
      </div>

      {vendors && vendors.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <Link key={v.id} href={`/dashboard/vendors/${v.id}`}>
              <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <HardHat className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">{v.name}</p>
                        {v.company_name && (
                          <p className="text-xs text-muted-foreground">{v.company_name}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                  </div>

                  {v.specialty && (
                    <Badge variant="outline" className={`text-xs mb-3 ${specialtyColor[v.specialty] ?? specialtyColor.general}`}>
                      {v.specialty.charAt(0).toUpperCase() + v.specialty.slice(1)}
                    </Badge>
                  )}

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {v.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{v.phone}</span>
                      </div>
                    )}
                    {v.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{v.email}</span>
                      </div>
                    )}
                  </div>

                  {totalByVendor[v.id] > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Total paid:{" "}
                        <span className="font-semibold text-foreground">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalByVendor[v.id])}
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <HardHat className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No vendors yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add vendors and contractors to assign them to maintenance requests and track payments.
            </p>
            <Button asChild>
              <Link href="/dashboard/vendors/new">
                <Plus className="mr-2 h-4 w-4" />
                Add your first vendor
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
