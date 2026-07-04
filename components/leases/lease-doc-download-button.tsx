"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { getLeaseDocUrl } from "@/app/actions/leases"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function LeaseDocDownloadButton({
  leaseId,
  which = "signed",
  label = "Download",
  size = "sm",
  variant = "outline",
}: {
  leaseId: string
  which?: "template" | "signed"
  label?: string
  size?: "sm" | "default"
  variant?: "outline" | "ghost" | "default"
}) {
  const [pending, start] = useTransition()

  function download() {
    start(async () => {
      const res = await getLeaseDocUrl(leaseId, which)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      window.open(res.url, "_blank")
    })
  }

  return (
    <Button variant={variant} size={size} onClick={download} disabled={pending}>
      {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
      {label}
    </Button>
  )
}
