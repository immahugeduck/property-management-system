"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, ChevronRight } from "lucide-react"
import { updateProfile } from "@/app/actions/profile"

interface Props {
  currentFromName: string | null
}

export function BusinessProfileForm({ currentFromName }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentFromName ?? "")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateProfile({ from_name: value })
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setEditing(false)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  function handleCancel() {
    setEditing(false)
    setValue(currentFromName ?? "")
    setError(null)
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between px-6 py-3.5">
        <div>
          <p className="text-sm font-medium">Email display name</p>
          <p className="text-sm text-muted-foreground">
            {currentFromName || "Property HQ (default)"}
          </p>
          {saved && (
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <Check className="h-3 w-3" />
              Saved
            </p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-primary hover:underline font-medium flex items-center gap-1 shrink-0"
        >
          Edit
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Email display name</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Shown as the sender on all emails to tenants and vendors (e.g. &ldquo;BRK Properties&rdquo;).
          Leave blank to use &ldquo;Property HQ&rdquo;.
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Property HQ"
          className="max-w-xs"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel() }}
        />
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
