"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileUploadZone } from "@/components/files/file-upload-zone"
import { FileText, Download, Trash2, Upload, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { deleteFile, getFileSignedUrl } from "@/app/actions/files"
import { useRouter } from "next/navigation"

type DocType = "lease" | "addendum" | "notice"

interface LeaseFile {
  id: string
  file_name: string
  file_size: number
  mime_type: string | null
  storage_path: string
  document_type: DocType | null
  created_at: string
  is_template: boolean
}

interface Props {
  tenantId: string
  initialDocs: LeaseFile[]
  templates: LeaseFile[]
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  lease: "Lease Agreement",
  addendum: "Addendum",
  notice: "Notice",
}

const DOC_TYPE_COLORS: Record<DocType, string> = {
  lease: "bg-primary/10 text-primary border-primary/20",
  addendum: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  notice: "bg-amber-500/10 text-amber-600 border-amber-500/20",
}

function fmtBytes(b: number) {
  if (b === 0) return "0 B"
  const k = 1024, s = ["B", "KB", "MB"]
  const i = Math.floor(Math.log(b) / Math.log(k))
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function DocRow({ file, onDelete }: { file: LeaseFile; onDelete: (id: string) => void }) {
  const [downloading, startDownload] = useTransition()
  const [deleting, startDelete] = useTransition()
  const type = file.document_type as DocType

  async function handleDownload() {
    startDownload(async () => {
      const result = await getFileSignedUrl(file.storage_path)
      if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer")
      }
    })
  }

  async function handleDelete() {
    startDelete(async () => {
      await deleteFile(file.id)
      onDelete(file.id)
    })
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className="p-2 rounded-md bg-muted shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {fmtBytes(file.file_size)} · {fmtDate(file.created_at)}
        </p>
      </div>
      {type && (
        <Badge variant="outline" className={`shrink-0 text-xs ${DOC_TYPE_COLORS[type]}`}>
          {DOC_TYPE_LABELS[type]}
        </Badge>
      )}
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} disabled={downloading}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function TemplateRow({ file }: { file: LeaseFile }) {
  const [downloading, startDownload] = useTransition()

  async function handleDownload() {
    startDownload(async () => {
      const result = await getFileSignedUrl(file.storage_path)
      if (result.url) window.open(result.url, "_blank", "noopener,noreferrer")
    })
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="p-1.5 rounded-md bg-muted shrink-0">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground flex-1 min-w-0 truncate">{file.file_name}</p>
      <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={handleDownload} disabled={downloading}>
        <ExternalLink className="mr-1.5 h-3 w-3" />
        Download blank
      </Button>
    </div>
  )
}

export function LeaseDocumentsCard({ tenantId, initialDocs, templates }: Props) {
  const router = useRouter()
  const [docs, setDocs] = useState<LeaseFile[]>(initialDocs)
  const [showUpload, setShowUpload] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [uploadType, setUploadType] = useState<DocType>("lease")

  const activeLease = docs.find(d => d.document_type === "lease")

  function handleDelete(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  function handleUploaded() {
    setShowUpload(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Lease Documents
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowUpload(v => !v)}>
            <Upload className="mr-2 h-3.5 w-3.5" />
            Upload
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Upload zone */}
        {showUpload && (
          <div className="space-y-3 p-4 rounded-lg border border-dashed">
            <div className="flex gap-2">
              {(["lease", "addendum", "notice"] as DocType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setUploadType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    uploadType === t
                      ? DOC_TYPE_COLORS[t]
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {DOC_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <FileUploadZone
              tenantId={tenantId}
              documentType={uploadType}
              compact
              onUploadComplete={handleUploaded}
            />
          </div>
        )}

        {/* Active lease highlight */}
        {activeLease ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Active Lease</p>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-medium flex-1 truncate">{activeLease.file_name}</p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs shrink-0"
                onClick={async () => {
                  const r = await getFileSignedUrl(activeLease.storage_path)
                  if (r.url) window.open(r.url, "_blank", "noopener,noreferrer")
                }}
              >
                <Download className="mr-1.5 h-3 w-3" />
                Download
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Uploaded {fmtDate(activeLease.created_at)} · {fmtBytes(activeLease.file_size)}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No lease agreement on file.</p>
            <Button size="sm" variant="outline" onClick={() => { setUploadType("lease"); setShowUpload(true) }}>
              <Upload className="mr-2 h-3.5 w-3.5" />
              Upload lease
            </Button>
          </div>
        )}

        {/* All documents list */}
        {docs.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">All Documents</p>
            <div>
              {docs.map(d => (
                <DocRow key={d.id} file={d} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        {/* Templates section */}
        {templates.length > 0 && (
          <div>
            <button
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showTemplates ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Blank Templates ({templates.length})
            </button>
            {showTemplates && (
              <div className="mt-2">
                {templates.map(t => <TemplateRow key={t.id} file={t} />)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
