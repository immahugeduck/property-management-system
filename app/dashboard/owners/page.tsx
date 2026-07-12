import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, UserCircle, Mail, Phone, Building2, Briefcase } from "lucide-react"
import type { PropertyOwner } from "@/lib/types"

type OwnerWithStats = PropertyOwner & { propertyCount: number; monthlyRevenue: number }

export default async function OwnersPage() {
  const supabase = await createClient()

  const { data: owners, error } = await supabase
    .from("property_owners")
    .select("*")
    .order("last_name", { ascending: true })

  if (error) console.error("Error fetching owners:", error)

  // Get property counts per owner
  const { data: properties } = await supabase
    .from("properties")
    .select("id, owner_id, name, status, monthly_rent")

  const allProperties = properties || []

  const ownersWithStats = (owners || []).map(owner => {
    const ownerProperties = allProperties.filter(p => p.owner_id === owner.id)
    const occupiedProps = ownerProperties.filter(p => p.status === "occupied")
    const totalRevenue = occupiedProps.reduce((s, p) => s + (p.monthly_rent || 0), 0)
    return { ...owner, propertyCount: ownerProperties.length, monthlyRevenue: totalRevenue }
  })

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property Owners</h1>
          <p className="text-muted-foreground text-sm">Owners of properties you manage</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/owners/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Owner
          </Link>
        </Button>
      </div>

      {ownersWithStats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No owners yet</h3>
            <p className="text-muted-foreground text-center text-sm mb-6 max-w-sm">
              Add property owner records to track who owns each property in your managed portfolio.
            </p>
            <Button asChild>
              <Link href="/dashboard/owners/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Owner
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ownersWithStats.map((owner: OwnerWithStats) => (
            <Link key={owner.id} href={`/dashboard/owners/${owner.id}`}>
              <Card className="h-full transition-all hover:border-primary/30 hover:bg-accent/30 cursor-pointer group">
                <CardContent className="pt-6">
                  {/* Avatar + Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg shrink-0 group-hover:bg-primary/20 transition-colors">
                      {owner.first_name?.[0] ?? '?'}{owner.last_name?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base leading-tight">
                        {owner.first_name} {owner.last_name}
                      </h3>
                      {owner.company_name && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground truncate">{owner.company_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-1.5 mb-4">
                    {owner.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{owner.email}</span>
                      </div>
                    )}
                    {owner.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{owner.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{owner.propertyCount}</span>
                      <span className="text-muted-foreground">propert{owner.propertyCount !== 1 ? "ies" : "y"}</span>
                    </div>
                    {owner.monthlyRevenue > 0 && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        ${owner.monthlyRevenue.toLocaleString()}/mo
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
