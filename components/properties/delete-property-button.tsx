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
import { Spinner } from "@/components/ui/spinner"

interface DeletePropertyButtonProps {
  propertyId: string
  propertyName: string
}

export function DeletePropertyButton({ propertyId, propertyName }: DeletePropertyButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId)

    if (error) {
      console.error("Error deleting property:", error)
      setLoading(false)
      return
    }

    router.push("/dashboard/properties")
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Property</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{propertyName}&quot;? This action cannot be
            undone. All associated data will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Spinner className="mr-2 h-4 w-4" />}
            Delete Property
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
