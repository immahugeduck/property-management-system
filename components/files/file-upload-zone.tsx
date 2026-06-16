"use client"

import { useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { saveFileMetadata } from "@/app/actions/files"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, X, CheckCircle, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  folderId?: string | null
  tenantId?: string | null
  propertyId?: string | null
  ownerId?: string | null
  isTemplate?: boolean
  onUploadComplete?: () => void
  compact?: boolean
}

interface UploadItem {
  file: File
  progress: number
  status: "pending" | "uploading" | "done" | "error"
  error?: string
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function FileUploadZone({
  folderId,
  tenantId,
  propertyId,
  ownerId,
  isTemplate = false,
  onUploadComplete,
  compact = false,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: File[]) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Not authenticated")
      return
    }

    const newUploads: UploadItem[] = files.map(f => ({ file: f, progress: 0, status: "pending" }))
    setUploads(prev => [...prev, ...newUploads])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const uploadIndex = uploads.length + i

      setUploads(prev => prev.map((u, idx) =>
        idx === uploadIndex ? { ...u, status: "uploading", progress: 10 } : u
      ))

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const storagePath = `${user.id}/${Date.now()}-${safeName}`

      const { error: storageError } = await supabase.storage
        .from("property-files")
        .upload(storagePath, file, { upsert: false })

      if (storageError) {
        setUploads(prev => prev.map((u, idx) =>
          idx === uploadIndex ? { ...u, status: "error", error: storageError.message, progress: 0 } : u
        ))
        toast.error(`Failed to upload ${file.name}`)
        continue
      }

      setUploads(prev => prev.map((u, idx) =>
        idx === uploadIndex ? { ...u, progress: 80 } : u
      ))

      const result = await saveFileMetadata({
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        folderId,
        tenantId,
        propertyId,
        ownerId,
        isTemplate,
      })

      if (result.error) {
        await supabase.storage.from("property-files").remove([storagePath])
        setUploads(prev => prev.map((u, idx) =>
          idx === uploadIndex ? { ...u, status: "error", error: result.error, progress: 0 } : u
        ))
        toast.error(`Failed to save ${file.name}`)
      } else {
        setUploads(prev => prev.map((u, idx) =>
          idx === uploadIndex ? { ...u, status: "done", progress: 100 } : u
        ))
        toast.success(`${file.name} uploaded`)
        onUploadComplete?.()
      }
    }
  }, [uploads.length, folderId, tenantId, propertyId, ownerId, isTemplate, onUploadComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) processFiles(files)
  }, [processFiles])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length) processFiles(files)
    e.target.value = ""
  }

  const removeUpload = (idx: number) => {
    setUploads(prev => prev.filter((_, i) => i !== idx))
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleChange} />
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </Button>
        {uploads.length > 0 && (
          <div className="space-y-1.5">
            {uploads.map((u, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1 text-muted-foreground">{u.file.name}</span>
                {u.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                {u.status === "done" && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                {u.status === "error" && <span className="text-destructive text-xs">{u.error}</span>}
                <button onClick={() => removeUpload(idx)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleChange} />
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/30"
        )}
      >
        <div className="p-3 bg-primary/10 rounded-full">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Drop files here or click to upload</p>
          <p className="text-sm text-muted-foreground mt-1">Any file type up to 50 MB</p>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{u.file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatBytes(u.file.size)}</span>
                </div>
                {u.status === "uploading" && (
                  <Progress value={u.progress} className="h-1.5 mt-1.5" />
                )}
                {u.status === "error" && (
                  <p className="text-xs text-destructive mt-0.5">{u.error}</p>
                )}
                {u.status === "done" && (
                  <p className="text-xs text-green-500 mt-0.5">Upload complete</p>
                )}
              </div>
              {u.status === "done" && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
              {u.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              {(u.status === "done" || u.status === "error") && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeUpload(idx) }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
