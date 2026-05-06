import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  BarChart3,
  ArrowRight,
  CheckCircle,
  FileText,
  UserCircle,
  Shield,
  Zap,
  Star,
} from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "Property Portfolio",
    description: "Track every property with rich details — occupancy, rent, type, and full maintenance history.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Tenant Management",
    description: "Tenant cards with contact info, lease dates, payment history, and secure deposit tracking.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: FileText,
    title: "Recurring Invoices",
    description: "Auto-generate monthly rent invoices on the 1st. Professional invoice layout, one click to send.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: CreditCard,
    title: "Payment Tracking",
    description: "Log rent payments, track overdue accounts, and keep a full audit trail per tenant and property.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Wrench,
    title: "Maintenance Requests",
    description: "Tenants submit requests, you track urgency, cost, status, and resolution — all in one place.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: BarChart3,
    title: "Revenue Reports",
    description: "Filter by property, view monthly trends, track maintenance costs, and monitor occupancy rates.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: UserCircle,
    title: "Property Owners",
    description: "Maintain owner cards for each client, link their properties, and track the full portfolio you manage.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Row-level security ensures every user sees only their own data. Built on enterprise-grade Supabase.",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
  },
]

const stats = [
  { value: "100%", label: "Data ownership" },
  { value: "1st", label: "Auto invoices monthly" },
  { value: "360°", label: "Portfolio visibility" },
  { value: "∞", label: "Properties managed" },
]

const testimonials = [
  {
    quote: "Finally a property tool that thinks like a property manager, not a software company. The invoicing flow alone saves me hours every month.",
    name: "Marcus T.",
    role: "Portfolio Manager, 22 units",
  },
  {
    quote: "I manage properties for 8 different owners. The owner cards and per-property reports are exactly what I needed.",
    name: "Sandra R.",
    role: "Independent Property Manager",
  },
  {
    quote: "Switched from a spreadsheet nightmare. Setup took 20 minutes. My tenants love getting the clean invoices.",
    name: "James L.",
    role: "Landlord, 6 properties",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="text-base font-bold text-foreground">Property HQ</span>
              <span className="ml-2 hidden sm:inline-block">
                <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">Pro</Badge>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/sign-up">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 text-center relative">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5 px-4 py-1.5">
            <Zap className="mr-1.5 h-3 w-3" />
            Built for professional property managers
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance max-w-4xl mx-auto leading-[1.15]">
            The Professional
            <span className="text-primary"> Property Management</span>
            <br />Platform
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            Manage properties, collect rent, handle maintenance, and keep owners informed —
            all from one powerful platform that works the way you do.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="min-w-[160px]">
              <Link href="/auth/sign-up">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="min-w-[160px]">
              <Link href="/auth/login">Sign In to Dashboard</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">No credit card required · Free to start</p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground">
              Everything in One Platform
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              From automated invoicing to real-time maintenance tracking, Property HQ has every tool a professional manager needs.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border hover:border-primary/30 transition-colors group">
                <CardContent className="pt-6">
                  <div className={`p-2.5 ${feature.bg} rounded-xl w-fit mb-4`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <h3 className="text-sm font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it looks */}
      <section className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Invoicing</Badge>
              <h2 className="text-3xl font-bold text-foreground mb-5">
                Monthly Invoices,<br />Automatically
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Set up a recurring invoice for any tenant and Property HQ generates professional rent invoices every month on the 1st. Mark as paid in one click.
              </p>
              <ul className="space-y-3">
                {[
                  "Zoho Invoice–style professional layout",
                  "Automatic monthly recurring on the 1st",
                  "Track paid, pending, and overdue status",
                  "Full invoice history per tenant",
                  "Quick-mark payments from the invoice",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice</p>
                  <p className="font-bold text-lg">PHQ-2026-0042</p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20" variant="outline">Paid</Badge>
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tenant</span>
                  <span className="font-medium">Sarah Johnson</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Property</span>
                  <span className="font-medium">Maple Ave Unit 2B</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium">June 2026</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-medium">June 1, 2026</span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Due</span>
                  <span className="text-2xl font-bold text-primary">$1,850</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs">Paid Jun 1</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <span className="text-xs">Recurring</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Trusted by Property Managers</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border">
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.quote}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Run a Tighter Portfolio?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join property managers who use Property HQ to stay organized, collect rent on time, and keep their owners happy.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/sign-up">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">Property HQ</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Property HQ · Professional Property Management Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
