import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CreateFolderDialog } from "@/components/files/create-folder-dialog"
import { DeleteFolderButton } from "@/components/files/delete-folder-button"
import { FileUploadZone } from "@/components/files/file-upload-zone"
import { FileList } from "@/components/files/file-list"
import { ArrowLeft, FolderOpen, Folder, ChevronRight } from "lucide-react"
import Link2 from "next/link"

export default async function FolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>
}) {
  const { folderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: folder, error } = await supabase
    .from("file_folders")
    .select("*")
    .eq("id", folderId)
    .eq("user_id", user.id)
    .single()

  if (error || !folder) notFound()

  // Build breadcrumb trail by walking parent_id chain
  const breadcrumbs: { id: string; name: string }[] = []
  let current = folder
  while (current.parent_id) {
    const { data: parent } = await supabase
      .from("file_folders")
      .select("id, name, parent_id")
      .eq("id", current.parent_id)
      .single()
    if (!parent) break
    breadcrumbs.unshift({ id: parent.id, name: parent.name })
    current = parent as any
  }

  const [subFoldersResult, filesResult] = await Promise.all([
    supabase
      .from("file_folders")
      .select("*")
      .eq("user_id", user.id)
      .eq("parent_id", folderId)
      .order("name"),
    supabase
      .from("files")
      .select("*, tenant:tenants(id, first_name, last_name), property:properties(id, name)")
      .eq("user_id", user.id)
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false }),
  ])

  const subFolders = subFoldersResult.data || []
  const files = filesResult.data || []

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col gap-3">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <Link href="/dashboard/files" className="hover:text-foreground transition-colors">
            Files
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              <Link
                href={`/dashboard/files/folder/${crumb.id}`}
                className="hover:text-foreground transition-colors"
              >
                {crumb.name}
              </Link>
            </span>
          ))}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{folder.name}</span>
        </nav>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <FolderOpen className="h-6 w-6 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold">{folder.name}</h1>
          </div>
          <div className="flex gap-2">
            <CreateFolderDialog parentId={folderId} />
          </div>
        </div>
      </div>

      {/* Sub-folders */}
      {subFolders.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">FOLDERS</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subFolders.map((sub) => (
              <div key={sub.id} className="group relative">
                <Link href={`/dashboard/files/folder/${sub.id}`}>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer">
                    <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                      <Folder className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{sub.name}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <div className="absolute top-2 right-8">
                  <DeleteFolderButton folderId={sub.id} folderName={sub.name} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">UPLOAD TO THIS FOLDER</h2>
        <FileUploadZone folderId={folderId} />
      </div>

      {/* Files */}
      <div>
        {files.length > 0 && (
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            FILES ({files.length})
          </h2>
        )}
        <FileList files={files as any} showEntity />
      </div>

      {subFolders.length === 0 && files.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <Folder className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            This folder is empty. Upload files or create sub-folders above.
          </p>
        </div>
      )}
    </div>
  )
}
