import { createClient } from "@/lib/supabase/server"
import { getCurrentTenant } from "@/lib/tenant-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileSignature, PenLine, CheckCircle2, ChevronRight } from "lucide-react"
import type { Lease } from "@/lib/types"

export default async function PortalDocumentsPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) redirect("/auth/login")

  const supabase = await createClient()
  const { data } = await supabase
    .from("leases")
    .select("*")
    .eq("tenant_id", tenant.id)
    .in("status", ["sent", "signed"])
    .order("created_at", { ascending: false })

  const leases = (data || []) as Lease[]
  const toSign = leases.filter((l) => l.status === "sent")
  const signed = leases.filter((l) => l.status === "signed")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and sign your lease documents</p>
      </div>

      {leases.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
          <FileSignature className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        </div>
      )}

      {toSign.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">AWAITING YOUR SIGNATURE</h2>
          <div className="space-y-2">
            {toSign.map((l) => (
              <Card key={l.id} className="border-amber-500/30">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <PenLine className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.title}</p>
                    <p className="text-xs text-muted-foreground">Action required</p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/portal/documents/${l.id}/sign`}>Review &amp; sign</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {signed.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">SIGNED</h2>
          <div className="space-y-2">
            {signed.map((l) => (
              <Link key={l.id} href={`/portal/documents/${l.id}/sign`}>
                <Card className="transition-colors hover:border-primary/30 hover:bg-accent/30">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="rounded-lg bg-green-500/10 p-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Signed {l.signed_at ? new Date(l.signed_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      Signed
                    </Badge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
