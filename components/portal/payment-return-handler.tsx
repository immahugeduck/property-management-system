"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { reconcileInvoicePayment } from "@/app/actions/rent-checkout"

export function PaymentReturnHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    const paid = searchParams.get("paid")
    const canceled = searchParams.get("canceled")

    if (paid) {
      handled.current = true
      reconcileInvoicePayment(paid).then((res) => {
        if (res.paid) {
          toast.success("Payment successful — your receipt is ready to download.")
        } else {
          toast.info("Payment is being processed. Your receipt will appear here shortly.")
        }
        router.replace("/portal/payments")
        router.refresh()
      })
    } else if (canceled) {
      handled.current = true
      toast.info("Payment canceled.")
      router.replace("/portal/payments")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
