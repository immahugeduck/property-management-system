import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  User,
  Building2,
  Bell,
  Shield,
  CreditCard,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: stats } = await supabase.from("properties").select("id").limit(1000)
  const propertyCount = stats?.length || 0

  const settingsSections = [
    {
      title: "Account",
      icon: User,
      description: "Manage your account and authentication settings",
      items: [
        { label: "Email address", value: user?.email, action: "Change" },
        { label: "Password", value: "••••••••", action: "Update" },
        { label: "Account created", value: user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—", action: null },
      ],
    },
    {
      title: "Business Profile",
      icon: Building2,
      description: "Your business info appears on invoices and reports",
      items: [
        { label: "Business name", value: "Not configured", action: "Set up" },
        { label: "Business address", value: "Not configured", action: "Set up" },
        { label: "Phone number", value: "Not configured", action: "Set up" },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      description: "Control when and how you receive alerts",
      items: [
        { label: "Overdue payment alerts", value: "Enabled", action: "Configure" },
        { label: "Lease expiration alerts", value: "Enabled", action: "Configure" },
        { label: "Maintenance updates", value: "Enabled", action: "Configure" },
      ],
    },
  ]

  return (
    <div className="space-y-6 pt-12 lg:pt-0 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your Property HQ account and preferences</p>
      </div>

      {/* Plan Banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Property HQ Pro</p>
                  <Badge className="text-xs bg-primary text-primary-foreground">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {propertyCount} {propertyCount === 1 ? "property" : "properties"} · Unlimited tenants & invoices
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Sections */}
      {settingsSections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <section.icon className="h-4 w-4 text-muted-foreground" />
              {section.title}
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.value}</p>
                  </div>
                  {item.action && (
                    <button className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
                      {item.action}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Data & Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Data & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            All your data is stored securely in an isolated database with row-level security. Only you can access your properties, tenants, and invoices.
          </p>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Database</span>
            <span className="font-medium flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
              Supabase PostgreSQL
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Authentication</span>
            <span className="font-medium">Supabase Auth</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Row-Level Security</span>
            <span className="font-medium text-emerald-500">Enabled</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
