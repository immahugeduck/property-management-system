import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Building2, MapPin, Bed, Bath, DollarSign } from "lucide-react"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

const statusColors = {
  vacant: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  occupied: "bg-green-500/10 text-green-500 border-green-500/20",
  maintenance: "bg-red-500/10 text-red-500 border-red-500/20",
}

const propertyTypeLabels = {
  apartment: "Apartment",
  house: "House",
  condo: "Condo",
  townhouse: "Townhouse",
  commercial: "Commercial",
}

export default async function PropertiesPage() {
  const supabase = await createClient()
  
  const { data: properties, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching properties:", error)
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground">
            Manage your property portfolio
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/properties/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Link>
        </Button>
      </div>

      {!properties || properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first property to start managing your portfolio
            </p>
            <Button asChild>
              <Link href="/dashboard/properties/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {property.city}, {property.state}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={statusColors[property.status as keyof typeof statusColors]}
                    >
                      {property.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {property.address}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        {property.bedrooms} bed
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        {property.bathrooms} bath
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                        {propertyTypeLabels[property.property_type as keyof typeof propertyTypeLabels]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">Monthly Rent</span>
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(property.monthly_rent)}
                      </span>
                    </div>
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
