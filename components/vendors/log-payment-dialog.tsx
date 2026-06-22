"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle } from "lucide-react"
import { logVendorPayment } from "@/app/actions/vendors"

interface Job {
  id: string
  title: string
}

interface LogPaymentDialogProps {
  vendorId: string
  jobs?: Job[]
}

export function LogPaymentDialog({ vendorId, jobs }: LogPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [method, setMethod] = useState("")
  const [jobId, setJobId] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await logVendorPayment(vendorId, {
        amount: Number(fd.get("amount")),
        date: fd.get("date") as string,
        payment_method: method || undefined,
        reference_number: (fd.get("reference_number") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
        maintenance_request_id: jobId || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setMethod("")
        setJobId("")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Log Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Vendor Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount *</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="ach">ACH / Bank Transfer</SelectItem>
                <SelectItem value="card">Credit / Debit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {jobs && jobs.length > 0 && (
            <div className="space-y-1.5">
              <Label>Link to Job (optional)</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No linked job</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reference_number">Reference / Check #</Label>
            <Input id="reference_number" name="reference_number" placeholder="Optional" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Optional" />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Log Payment"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
