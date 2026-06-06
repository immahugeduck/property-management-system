"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Repeat, Loader2, CalendarClock } from "lucide-react"
import { upsertRentSchedule, cancelRentSchedule } from "@/app/actions/rent-schedules"
import type { RentSchedule } from "@/lib/types"

interface RentScheduleCardProps {
  tenantId: string
  propertyId: string | null
  defaultAmount: number
  schedule: RentSchedule | null
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function RentScheduleCard({ tenantId, propertyId, defaultAmount, schedule }: RentScheduleCardProps) {
  const [editing, setEditing] = useState(!schedule)
  const [amount, setAmount] = useState(String(schedule?.amount ?? defaultAmount ?? ""))
  const [day, setDay] = useState(String(schedule?.day_of_month ?? 1))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setLoading(true)
    setError(null)
    const res = await upsertRentSchedule({
      tenantId,
      propertyId,
      amount: Number(amount),
      dayOfMonth: Number(day),
    })
    setLoading(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setEditing(false)
  }

  async function stop() {
    if (!schedule) return
    setLoading(true)
    await cancelRentSchedule(schedule.id, tenantId)
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Recurring Rent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing && schedule ? (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <CalendarClock className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  ${Number(schedule.amount).toLocaleString()} on the {ordinal(schedule.day_of_month)} of each month
                </p>
                <p className="text-xs text-muted-foreground">
                  An invoice is auto-issued every month and the tenant is notified.
                </p>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                Active
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={loading}>
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={stop} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Stop"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rent-amount">Monthly amount</Label>
                <Input
                  id="rent-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rent-day">Day of month</Label>
                <Input
                  id="rent-day"
                  type="number"
                  min="1"
                  max="28"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Invoices issue on this day (1–28). Tenants pay online via Stripe and receive a PDF receipt automatically.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {schedule ? "Update schedule" : "Set up recurring rent"}
              </Button>
              {schedule && (
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={loading}>
                  Cancel
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
