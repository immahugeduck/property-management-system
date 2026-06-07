"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2 } from "lucide-react"
import { createRentCheckout } from "@/app/actions/rent-checkout"
import { toast } from "sonner"

export function PayRentButton({ invoiceId, size = "default" }: { invoiceId: string; size?: "default" | "sm" }) {
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    const res = await createRentCheckout(invoiceId)
    if (res.error) {
      toast.error(res.error)
      setLoading(false)
      return
    }
    if (res.url) {
      // Open Stripe Checkout. If embedded in an iframe, open in a new tab.
      if (typeof window !== "undefined" && window.self !== window.top) {
        window.open(res.url, "_blank")
        setLoading(false)
      } else {
        window.location.href = res.url
      }
    }
  }

  return (
    <Button onClick={handlePay} disabled={loading} size={size}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
      Pay Now
    </Button>
  )
}
