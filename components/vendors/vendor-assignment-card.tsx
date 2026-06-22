"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HardHat, Mail, Phone, Send, X } from "lucide-react"
import { assignVendor, sendWorkOrder } from "@/app/actions/vendors"
import type { Vendor } from "@/lib/types"

interface VendorAssignmentCardProps {
  requestId: string
  currentVendor: Vendor | null
  vendors: Vendor[]
}

export function VendorAssignmentCard({ requestId, currentVendor, vendors }: VendorAssignmentCardProps) {
  const [selected, setSelected] = useState(currentVendor?.id ?? "unassigned")
  const [pendingAssign, startAssign] = useTransition()
  const [pendingSend, startSend] = useTransition()
  const [assignError, setAssignError] = useState<string | null>(null)
  const [sendStatus, setSendStatus] = useState<"idle" | "sent" | "error">("idle")
  const [sendMsg, setSendMsg] = useState("")

  function handleAssign(vendorId: string) {
    setSelected(vendorId)
    setAssignError(null)
    const vendorIdOrNull = vendorId === "unassigned" ? null : vendorId
    startAssign(async () => {
      const result = await assignVendor(requestId, vendorIdOrNull)
      if (result.error) setAssignError(result.error)
    })
  }

  function handleSend() {
    setSendStatus("idle")
    setSendMsg("")
    startSend(async () => {
      const result = await sendWorkOrder(requestId)
      if (result.ok) {
        setSendStatus("sent")
        setSendMsg("Work order emailed to vendor.")
      } else {
        setSendStatus("error")
        setSendMsg(result.error ?? "Failed to send email.")
      }
    })
  }

  const activeVendor = vendors.find((v) => v.id === selected)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HardHat className="h-4 w-4" />
          Assigned Vendor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Select value={selected} onValueChange={handleAssign} disabled={pendingAssign}>
            <SelectTrigger>
              <SelectValue placeholder="Assign a vendor…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}{v.company_name ? ` — ${v.company_name}` : ""}{v.specialty ? ` (${v.specialty})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {assignError && <p className="text-xs text-destructive">{assignError}</p>}
        </div>

        {activeVendor && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <Link href={`/dashboard/vendors/${activeVendor.id}`} className="font-medium text-sm hover:underline">
              {activeVendor.name}
              {activeVendor.company_name && (
                <span className="text-muted-foreground font-normal"> · {activeVendor.company_name}</span>
              )}
            </Link>
            <div className="space-y-1 text-xs text-muted-foreground">
              {activeVendor.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <a href={`tel:${activeVendor.phone}`} className="hover:underline">{activeVendor.phone}</a>
                </div>
              )}
              {activeVendor.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <a href={`mailto:${activeVendor.email}`} className="hover:underline">{activeVendor.email}</a>
                </div>
              )}
            </div>

            {activeVendor.email && (
              <div className="pt-1">
                <Button size="sm" variant="outline" onClick={handleSend} disabled={pendingSend} className="w-full">
                  <Send className="mr-2 h-3.5 w-3.5" />
                  {pendingSend ? "Sending…" : "Send Work Order Email"}
                </Button>
                {sendStatus === "sent" && (
                  <p className="text-xs text-emerald-600 mt-1.5">{sendMsg}</p>
                )}
                {sendStatus === "error" && (
                  <p className="text-xs text-destructive mt-1.5">{sendMsg}</p>
                )}
              </div>
            )}

            {!activeVendor.email && (
              <p className="text-xs text-muted-foreground italic">No email — add one to send a work order.</p>
            )}
          </div>
        )}

        {vendors.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No vendors in your directory.{" "}
            <Link href="/dashboard/vendors/new" className="underline hover:text-foreground">Add one</Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
