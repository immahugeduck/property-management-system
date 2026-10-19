export interface FolderOption {
  id: string
  /** Full path for display, e.g. "Leases / 2026". */
  label: string
}

/**
 * Turn a flat list of folders into move-to options labelled with their full
 * path, sorted alphabetically. Cycles or missing parents are tolerated.
 */
export function buildFolderOptions(
  folders: { id: string; name: string; parent_id: string | null }[]
): FolderOption[] {
  const byId = new Map(folders.map((f) => [f.id, f]))

  return folders
    .map((folder) => {
      const parts: string[] = []
      const seen = new Set<string>()
      let current: typeof folder | undefined = folder
      while (current && !seen.has(current.id)) {
        seen.add(current.id)
        parts.unshift(current.name)
        current = current.parent_id ? byId.get(current.parent_id) : undefined
      }
      return { id: folder.id, label: parts.join(" / ") }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}
