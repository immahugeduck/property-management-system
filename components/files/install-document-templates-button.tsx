"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { installDocumentTemplates } from "@/app/actions/files"
import { FilePlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function InstallDocumentTemplatesButton({ variant = "outline" }: { variant?: "default" | "outline" }) {
  const [pending, start] = useTransition()
  const router = useRouter()

  function install() {
    start(async () => {
      const res = await installDocumentTemplates()
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(
        res.installed
          ? `Added ${res.installed} document template${res.installed > 1 ? "s" : ""}`
          : "Document templates already added",
      )
      router.refresh()
    })
  }

  return (
    <Button onClick={install} disabled={pending} variant={variant} size="sm">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
      Add document templates
    </Button>
  )
}
