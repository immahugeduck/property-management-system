import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react"
import { DeleteOwnerButton } from "@/components/owners/delete-owner-button"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const statusColors = {
  vacant: "border-amber-500/30 text-amber-500",
  occupied: "border-emerald-500/30 text-emerald-500",
  maintenance: "border-red-500/30 text-red-500",
}

export default async function OwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: owner, error } = await supabase
    .from("property_owners")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !owner) notFound()

  const { data: properties } = await supabase
    .from("properties")
    .select("*, tenants(id, status), rent_payments(amount, status)")
    .eq("owner_id", id)
    .order("name")

  const props = properties || []
  const totalRevenue = props.filter(p => p.status === "occupied").reduce((s: number, p: any) => s + (p.monthly_rent || 0), 0)
  const totalTenants = props.reduce((s: number, p: any) => s + (p.tenants?.filter((t: any) => t.status === "active").length || 0), 0)
  const totalCollected = props.reduce((s: number, p: any) => {
    return s + (p.rent_payments || []).filter((pay: any) => pay.status === "paid").reduce((ss: number, pay: any) => ss + (pay.amount || 0), 0)
  }, 0)

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/owners" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Owners
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl shrink-0">
              {owner.first_name[0]}{owner.last_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{owner.first_name} {owner.last_name}</h1>
              {owner.company_name && (
                <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                  <Briefcase className="h-4 w-4" />
                  <span>{owner.company_name}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Owner since {formatDate(owner.created_at)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/owners/${id}/edit`}>
                <Edit className="mr-1.5 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DeleteOwnerButton ownerId={id} ownerName={`${owner.first_name} ${owner.last_name}`} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Active Tenants</p>
                <p className="text-xl font-bold">{totalTenants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Owner Card + Properties */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Contact Card */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {owner.email && (
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-secondary rounded-md"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href={`mailto:${owner.email}`} className="text-sm font-medium hover:text-primary hover:underline transition-colors">{owner.email}</a>
                </div>
              </div>
            )}
            {owner.phone && (
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-secondary rounded-md"><Phone className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a href={`tel:${owner.phone}`} className="text-sm font-medium hover:text-primary hover:underline transition-colors">{owner.phone}</a>
                </div>
              </div>
            )}
            {(owner.address || owner.city) && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-secondary rounded-md mt-0.5"><MapPin className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">
                    {owner.address && <span>{owner.address}<br /></span>}
                    {owner.city && owner.state ? `${owner.city}, ${owner.state} ${owner.zip_code || ""}` : owner.city || owner.state}
                  </p>
                </div>
              </div>
            )}
            {owner.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{owner.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Properties ({props.length})
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/properties/new">Add Property</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {props.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No properties linked to this owner yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Edit a property and select this owner to link it.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {props.map((property: any) => {
                  const activeTenants = (property.tenants || []).filter((t: any) => t.status === "active").length
                  return (
                    <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{property.name}</p>
                            <p className="text-xs text-muted-foreground">{property.address}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-sm font-semibold">{formatCurrency(property.monthly_rent)}/mo</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{activeTenants} tenant{activeTenants !== 1 ? "s" : ""}</span>
                            <Badge variant="outline" className={`text-xs ${statusColors[property.status as keyof typeof statusColors]}`}>
                              {property.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                {/* Summary row */}
                <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
                  <span className="text-muted-foreground">{props.length} properties · {totalTenants} tenants</span>
                  <span className="font-semibold">{formatCurrency(totalRevenue)}/mo expected</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
