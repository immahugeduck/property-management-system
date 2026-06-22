"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer } from "lucide-react"
import { CsvDownloadButton } from "@/components/reports/csv-download"

interface Property {
  id: string
  name: string
}

interface Tenant {
  id: string
  first_name: string
  last_name: string
}

interface ReportFiltersProps {
  properties?: Property[]
  tenants?: Tenant[]
  showTenant?: boolean
  showProperty?: boolean
  csvData?: Record<string, string | number | null>[]
  csvFilename?: string
  title: string
}

const PRESETS = [
  { label: "This Month", value: "this-month" },
  { label: "Last Month", value: "last-month" },
  { label: "This Quarter", value: "this-quarter" },
  { label: "Last Quarter", value: "last-quarter" },
  { label: "This Year", value: "this-year" },
  { label: "Last Year", value: "last-year" },
  { label: "Custom", value: "custom" },
]

export function getDateRange(preset: string, from?: string, to?: string): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (preset) {
    case "this-month":
      return {
        from: new Date(y, m, 1).toISOString().slice(0, 10),
        to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      }
    case "last-month":
      return {
        from: new Date(y, m - 1, 1).toISOString().slice(0, 10),
        to: new Date(y, m, 0).toISOString().slice(0, 10),
      }
    case "this-quarter": {
      const q = Math.floor(m / 3)
      return {
        from: new Date(y, q * 3, 1).toISOString().slice(0, 10),
        to: new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10),
      }
    }
    case "last-quarter": {
      const q = Math.floor(m / 3)
      const lq = q === 0 ? 3 : q - 1
      const ly = q === 0 ? y - 1 : y
      return {
        from: new Date(ly, lq * 3, 1).toISOString().slice(0, 10),
        to: new Date(ly, lq * 3 + 3, 0).toISOString().slice(0, 10),
      }
    }
    case "last-year":
      return {
        from: `${y - 1}-01-01`,
        to: `${y - 1}-12-31`,
      }
    case "this-year":
    default:
      return {
        from: `${y}-01-01`,
        to: `${y}-12-31`,
      }
  }
}

export function ReportFilters({
  properties,
  tenants,
  showTenant = false,
  showProperty = true,
  csvData,
  csvFilename,
  title,
}: ReportFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const preset = searchParams.get("preset") || "this-year"
  const propertyId = searchParams.get("property") || "all"
  const tenantId = searchParams.get("tenant") || "all"
  const customFrom = searchParams.get("from") || ""
  const customTo = searchParams.get("to") || ""

  const push = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v)
        else params.delete(k)
      })
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const handlePreset = (value: string) => {
    if (value === "custom") {
      push({ preset: "custom" })
    } else {
      push({ preset: value, from: "", to: "" })
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 pb-4 border-b print:hidden">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Date Range</Label>
        <Select value={preset} onValueChange={handlePreset}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => push({ from: e.target.value })}
              className="w-36 h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => push({ to: e.target.value })}
              className="w-36 h-8 text-sm"
            />
          </div>
        </>
      )}

      {showProperty && properties && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Property</Label>
          <Select value={propertyId} onValueChange={(v) => push({ property: v })}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showTenant && tenants && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Tenant</Label>
          <Select value={tenantId} onValueChange={(v) => push({ tenant: v })}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {csvData && csvFilename && (
          <CsvDownloadButton data={csvData} filename={csvFilename} />
        )}
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />
          Print
        </Button>
      </div>
    </div>
  )
}
