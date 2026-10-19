"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
import { Trash2 } from "lucide-react"

interface DeleteOwnerButtonProps {
  ownerId: string
  ownerName: string
}

export function DeleteOwnerButton({ ownerId, ownerName }: DeleteOwnerButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: deleteError } = await supabase.from("property_owners").delete().eq("id", ownerId)
    if (deleteError) {
      // 23503 = still referenced. Recorded payouts block deletion on purpose
      // so the payout history can't disappear.
      setError(
        deleteError.code === "23503"
          ? `${ownerName} has recorded payouts, so they can't be deleted. The payout history has to stay on file.`
          : `Couldn't delete ${ownerName}: ${deleteError.message}`,
      )
      setLoading(false)
      return
    }
    router.push("/dashboard/owners")
    router.refresh()
  }

  return (
    <>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={loading}>
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Owner?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{ownerName}</strong> from your records. Their properties will remain but will be unlinked from this owner.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete Owner
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
