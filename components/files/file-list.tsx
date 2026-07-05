"use client"

import { useState } from "react"
import { deleteFile, getFileSignedUrl } from "@/app/actions/files"
import { FileRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  FileText, File, Image, FileSpreadsheet, Trash2, Download, Loader2,
} from "lucide-react"
import { toast } from "sonner"

interface FileListProps {
  files: FileRecord[]
  showEntity?: boolean
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="h-5 w-5 text-muted-foreground" />
  if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <FileText className="h-5 w-5 text-blue-600" />
  return <File className="h-5 w-5 text-muted-foreground" />
}

function FileRow({ file, showEntity }: { file: FileRecord; showEntity?: boolean }) {
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    const result = await getFileSignedUrl(file.storage_path)
    setDownloading(false)
    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer")
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteFile(file.id)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("File deleted")
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors group">
      <div className="p-1.5 bg-secondary rounded-md shrink-0">
        <FileIcon mimeType={file.mime_type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{file.file_name}</p>
          {file.is_template && (
            <Badge variant="secondary" className="text-xs shrink-0">Template</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{formatBytes(file.file_size)}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{formatDate(file.created_at)}</span>
          {showEntity && file.tenant && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {file.tenant.first_name} {file.tenant.last_name}
              </span>
            </>
          )}
          {showEntity && file.property && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{file.property.name}</span>
            </>
          )}
          {file.description && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground italic">{file.description}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDownload}
          disabled={downloading}
          title="Download"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={deleting}
              title="Delete"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{file.file_name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the file. This action cannot be undone.
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
    </div>
  )
}

export function FileList({ files, showEntity = false }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="py-8 text-center">
        <File className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No files yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {files.map(file => (
        <FileRow key={file.id} file={file} showEntity={showEntity} />
      ))}
    </div>
  )
}
