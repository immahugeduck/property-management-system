import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Edit, Phone, Mail, MapPin, HardHat, Wrench, DollarSign } from "lucide-react"
import { DeleteVendorButton } from "@/components/vendors/delete-vendor-button"
import { LogPaymentDialog } from "@/components/vendors/log-payment-dialog"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

const fmtDate = (d: string) => new Date(d).toLocaleDateString()

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [{ data: vendor }, { data: payments }, { data: jobs }] = await Promise.all([
    supabase.from("vendors").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase
      .from("vendor_payments")
      .select("*, maintenance_requests(id, title)")
      .eq("vendor_id", id)
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    supabase
      .from("maintenance_requests")
      .select("id, title, status, created_at, properties(name)")
      .eq("vendor_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  if (!vendor) notFound()

  const totalPaid = payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const openJobs = jobs?.filter((j) => j.status === "open" || j.status === "in_progress").length ?? 0
  const completedJobs = jobs?.filter((j) => j.status === "completed").length ?? 0

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div>
        <Link
          href="/dashboard/vendors"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vendors
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <HardHat className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{vendor.name}</h1>
              {vendor.company_name && (
                <p className="text-muted-foreground">{vendor.company_name}</p>
              )}
              {vendor.specialty && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {vendor.specialty.charAt(0).toUpperCase() + vendor.specialty.slice(1)}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/vendors/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DeleteVendorButton vendorId={id} vendorName={vendor.name} />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Paid", value: fmt(totalPaid), color: "text-red-600" },
          { label: "Open Jobs", value: String(openJobs), color: openJobs > 0 ? "text-amber-600" : "text-foreground" },
          { label: "Completed Jobs", value: String(completedJobs), color: "text-emerald-600" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {vendor.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`tel:${vendor.phone}`} className="hover:underline">{vendor.phone}</a>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${vendor.email}`} className="hover:underline">{vendor.email}</a>
              </div>
            )}
            {vendor.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{vendor.address}</span>
              </div>
            )}
            {vendor.notes && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{vendor.notes}</p>
              </div>
            )}
            {!vendor.phone && !vendor.email && !vendor.address && !vendor.notes && (
              <p className="text-muted-foreground">No contact details on file.</p>
            )}
          </CardContent>
        </Card>

        {/* Job history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" />
              Assigned Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs && jobs.length > 0 ? (
              <div className="space-y-2">
                {jobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/dashboard/maintenance/${j.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-sm">{j.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {(j.properties as unknown as { name: string } | null)?.name} · {fmtDate(j.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        j.status === "completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                        j.status === "in_progress" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                        j.status === "open" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {j.status.replace("_", " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No jobs assigned yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment history */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Payment History
            </CardTitle>
            <LogPaymentDialog
              vendorId={id}
              jobs={jobs?.map((j) => ({ id: j.id, title: j.title })) ?? []}
            />
          </div>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Linked Job</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {(p.maintenance_requests as { id: string; title: string } | null)?.title ?? "—"}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{p.payment_method ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.reference_number ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[160px] truncate">{p.notes ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">{fmt(Number(p.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">No payments logged yet.</p>
              <LogPaymentDialog vendorId={id} jobs={jobs?.map((j) => ({ id: j.id, title: j.title })) ?? []} />
            </div>
          )}

          {payments && payments.length > 0 && (
            <div className="mt-3 pt-3 border-t flex justify-end">
              <p className="text-sm font-semibold">
                Total: <span className="text-red-600">{fmt(totalPaid)}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
