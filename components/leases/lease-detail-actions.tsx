"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { getLeaseDocUrl, voidLease, deleteLease } from "@/app/actions/leases"
import { Download, Ban, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { LeaseStatus } from "@/lib/types"

export function LeaseDetailActions({ leaseId, status }: { leaseId: string; status: LeaseStatus }) {
  const router = useRouter()
  const [downloading, startDownload] = useTransition()
  const [voiding, startVoid] = useTransition()
  const [deleting, startDelete] = useTransition()

  function downloadSigned() {
    startDownload(async () => {
      const res = await getLeaseDocUrl(leaseId, "signed")
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      window.open(res.url, "_blank")
    })
  }

  function handleVoid() {
    startVoid(async () => {
      const res = await voidLease(leaseId)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Lease voided")
      router.refresh()
    })
  }

  function handleDelete() {
    startDelete(async () => {
      const res = await deleteLease(leaseId)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Lease deleted")
      router.push("/dashboard/leases")
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "signed" && (
        <Button variant="outline" size="sm" onClick={downloadSigned} disabled={downloading}>
          {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
          Download signed
        </Button>
      )}

      {status !== "signed" && status !== "void" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={voiding}>
              <Ban className="mr-1.5 h-4 w-4" />
              Void
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void this lease?</AlertDialogTitle>
              <AlertDialogDescription>
                The lease will be marked void and the tenant will no longer be able to sign it. This keeps the record for your history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleVoid}>Void lease</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deleting}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lease?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the lease{status === "signed" ? " and its signed PDF" : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
