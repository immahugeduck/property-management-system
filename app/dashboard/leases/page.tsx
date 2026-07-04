import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LeaseStatusBadge } from "@/components/leases/lease-status-badge"
import { FileSignature, Plus, FileText, ChevronRight } from "lucide-react"
import type { LeaseStatus } from "@/lib/types"

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function LeasesPage() {
  const supabase = await createClient()

  const [{ data: leases }, { data: templates }] = await Promise.all([
    supabase
      .from("leases")
      .select("id, title, status, sent_at, signed_at, created_at, tenant:tenants(first_name, last_name), property:properties(name)")
      .order("created_at", { ascending: false }),
    supabase.from("lease_templates").select("id, name, description, page_count").order("name"),
  ])

  const allLeases = leases || []
  const allTemplates = templates || []

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leases</h1>
          <p className="text-muted-foreground">Create, send, and track lease agreements for e-signature</p>
        </div>
        <Button asChild disabled={allTemplates.length === 0}>
          <Link href="/dashboard/leases/new">
            <Plus className="mr-2 h-4 w-4" />
            New lease
          </Link>
        </Button>
      </div>

      {allLeases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileSignature className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No leases yet</h3>
            <p className="mb-4 max-w-sm text-muted-foreground">
              Start from one of your lease templates, fill in the details, and send it to a tenant to sign.
            </p>
            {allTemplates.length > 0 && (
              <Button asChild>
                <Link href="/dashboard/leases/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first lease
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allLeases.map((lease) => {
            const tenant = Array.isArray(lease.tenant) ? lease.tenant[0] : lease.tenant
            const property = Array.isArray(lease.property) ? lease.property[0] : lease.property
            return (
              <Link key={lease.id} href={`/dashboard/leases/${lease.id}`} className="block">
                <Card className="transition-colors hover:bg-accent/40">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{lease.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {tenant ? `${tenant.first_name} ${tenant.last_name}` : "No tenant"}
                        {property?.name ? ` · ${property.name}` : ""}
                      </p>
                    </div>
                    <div className="hidden text-right text-xs text-muted-foreground sm:block">
                      {lease.status === "signed"
                        ? `Signed ${formatDate(lease.signed_at)}`
                        : lease.status === "sent"
                          ? `Sent ${formatDate(lease.sent_at)}`
                          : `Created ${formatDate(lease.created_at)}`}
                    </div>
                    <LeaseStatusBadge status={lease.status as LeaseStatus} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lease templates</CardTitle>
        </CardHeader>
        <CardContent>
          {allTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lease templates are set up yet. Templates define the fillable fields and signature spots on a PDF.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {allTemplates.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    {t.description && <p className="truncate text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{t.page_count} pages</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
