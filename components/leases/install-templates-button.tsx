"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { installDefaultTemplates } from "@/app/actions/lease-templates"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function InstallTemplatesButton({ variant = "default" }: { variant?: "default" | "outline" }) {
  const [pending, start] = useTransition()
  const [, setDone] = useState(false)
  const router = useRouter()

  function install() {
    start(async () => {
      const res = await installDefaultTemplates()
      if (res.error) {
        toast.error(res.error)
        return
      }
      setDone(true)
      toast.success(
        res.installed ? `Installed ${res.installed} lease template${res.installed > 1 ? "s" : ""}` : "Templates already installed",
      )
      router.refresh()
    })
  }

  return (
    <Button onClick={install} disabled={pending} variant={variant}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Install default templates
    </Button>
  )
}
