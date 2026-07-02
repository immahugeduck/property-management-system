import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateFolderDialog } from "@/components/files/create-folder-dialog"
import { DeleteFolderButton } from "@/components/files/delete-folder-button"
import { FileUploadZone } from "@/components/files/file-upload-zone"
import { FileList } from "@/components/files/file-list"
import { InstallDocumentTemplatesButton } from "@/components/files/install-document-templates-button"
import { FolderOpen, Folder, Star, ChevronRight, LayoutGrid } from "lucide-react"

export default async function FilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [foldersResult, filesResult, templateCountResult] = await Promise.all([
    supabase
      .from("file_folders")
      .select("*")
      .eq("user_id", user.id)
      .is("parent_id", null)
      .order("name"),
    supabase
      .from("files")
      .select("*, tenant:tenants(id, first_name, last_name), property:properties(id, name)")
      .eq("user_id", user.id)
      .is("folder_id", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("files")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_template", true),
  ])

  const folders = foldersResult.data || []
  const rootFiles = filesResult.data || []
  const templateCount = templateCountResult.count || 0

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Files</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize leases, templates, and documents
          </p>
        </div>
        <div className="flex gap-2">
          <InstallDocumentTemplatesButton />
          <CreateFolderDialog parentId={null} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Folder className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Folders</p>
                <p className="text-xl font-bold">{folders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <LayoutGrid className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Files</p>
                <p className="text-xl font-bold">{rootFiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Templates</p>
                <p className="text-xl font-bold">{templateCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">FOLDERS</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                <Link href={`/dashboard/files/folder/${folder.id}`}>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer">
                    <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                      <FolderOpen className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(folder.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
                <div className="absolute top-2 right-8">
                  <DeleteFolderButton folderId={folder.id} folderName={folder.name} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">UPLOAD TO ROOT</h2>
        <FileUploadZone folderId={null} />
      </div>

      {/* Root files */}
      {rootFiles.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">FILES</h2>
          <FileList files={rootFiles as any} showEntity />
        </div>
      )}

      {folders.length === 0 && rootFiles.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <FolderOpen className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">No files yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Create folders to organize lease agreements, templates, and tenant documents.
          </p>
          <CreateFolderDialog parentId={null} />
        </div>
      )}
    </div>
  )
}
