"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Paperclip, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { submitTenantMaintenance } from "@/app/actions/tenant-maintenance"

export function TenantMaintenanceForm({ hasProperty, userId }: { hasProperty: boolean; userId: string }) {
  const [loading, setLoading] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const images = files.filter((f) => f.type.startsWith("image/"))
    if (images.length !== files.length) toast.error("Only image files are supported.")
    setPhotos((prev) => [...prev, ...images].slice(0, 5))
    e.target.value = ""
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)

    // Upload photos to Supabase Storage first
    const photoPaths: string[] = []
    if (photos.length > 0) {
      const supabase = createClient()
      for (const photo of photos) {
        const ext = photo.name.split(".").pop()
        const path = `${userId}/maintenance/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from("property-files").upload(path, photo)
        if (error) {
          toast.error(`Failed to upload ${photo.name}`)
        } else {
          photoPaths.push(path)
        }
      }
    }

    formData.set("photo_paths", JSON.stringify(photoPaths))
    const res = await submitTenantMaintenance(formData)
    setLoading(false)
    if (res.ok) {
      toast.success("Request submitted. Your manager has been notified.")
      setPhotos([])
      router.refresh()
      const form = document.getElementById("tenant-maint-form") as HTMLFormElement | null
      form?.reset()
    } else {
      toast.error(res.error || "Could not submit request.")
    }
  }

  if (!hasProperty) {
    return (
      <p className="text-sm text-muted-foreground">
        Your account isn&apos;t linked to a property yet. Please contact your property manager.
      </p>
    )
  }

  return (
    <form id="tenant-maint-form" action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Brief summary of the issue" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Summary</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Where, how, and when you noticed it (e.g. 'Heard a drip under the kitchen sink this morning')..."
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select name="category" defaultValue="general">
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plumbing">Plumbing</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="hvac">HVAC</SelectItem>
              <SelectItem value="appliance">Appliances</SelectItem>
              <SelectItem value="structural">Structural</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="urgency">Priority</Label>
          <Select name="urgency" defaultValue="medium">
            <SelectTrigger id="urgency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Photo attachments */}
      <div className="space-y-2">
        <Label>Photos (optional, up to 5)</Label>
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group">
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[120px] truncate">{photo.name}</span>
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="ml-1 rounded hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {photos.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Add photo
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Request
      </Button>
    </form>
  )
}
