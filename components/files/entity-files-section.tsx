"use client"

import { useState } from "react"
import { FileRecord } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploadZone } from "./file-upload-zone"
import { FileList } from "./file-list"
import { FolderOpen, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EntityFilesSectionProps {
  initialFiles: FileRecord[]
  tenantId?: string
  propertyId?: string
  ownerId?: string
  title?: string
}

export function EntityFilesSection({
  initialFiles,
  tenantId,
  propertyId,
  ownerId,
  title = "Files & Documents",
}: EntityFilesSectionProps) {
  const [files, setFiles] = useState<FileRecord[]>(initialFiles)
  const [showUpload, setShowUpload] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {title}
            {files.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({files.length})</span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? (
              <>
                <ChevronUp className="mr-1.5 h-4 w-4" />
                Hide Upload
              </>
            ) : (
              <>
                <ChevronDown className="mr-1.5 h-4 w-4" />
                Upload File
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showUpload && (
          <FileUploadZone
            tenantId={tenantId}
            propertyId={propertyId}
            ownerId={ownerId}
            compact={false}
            onUploadComplete={() => {
              setShowUpload(false)
              window.location.reload()
            }}
          />
        )}
        <FileList files={files} />
      </CardContent>
    </Card>
  )
}
