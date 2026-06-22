"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface CsvDownloadButtonProps {
  data: Record<string, string | number | null>[]
  filename: string
}

function toCsv(rows: Record<string, string | number | null>[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const escape = (v: string | number | null) => {
    const s = v == null ? "" : String(v)
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n")
}

export function CsvDownloadButton({ data, filename }: CsvDownloadButtonProps) {
  const handleDownload = () => {
    const csv = toCsv(data)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={!data.length}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Export CSV
    </Button>
  )
}
