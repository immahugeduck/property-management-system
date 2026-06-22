"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { TrendingUp, Receipt, CreditCard, FileText, Building2, Wrench } from "lucide-react"

const groups = [
  {
    label: "Financial",
    items: [
      { name: "Profit & Loss", href: "/dashboard/reports/profit-loss", icon: TrendingUp },
      { name: "Expense Report", href: "/dashboard/reports/expenses", icon: Receipt },
    ],
  },
  {
    label: "Payments",
    items: [
      { name: "Rent Collection", href: "/dashboard/reports/rent-collection", icon: CreditCard },
      { name: "Tenant Ledger", href: "/dashboard/reports/tenant-ledger", icon: FileText },
    ],
  },
  {
    label: "Properties",
    items: [
      { name: "Occupancy Summary", href: "/dashboard/reports/occupancy", icon: Building2 },
    ],
  },
  {
    label: "Maintenance",
    items: [
      { name: "Maintenance Costs", href: "/dashboard/reports/maintenance-costs", icon: Wrench },
    ],
  },
]

export function ReportsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-3 pt-5">
      <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Reports
      </p>
      {groups.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
