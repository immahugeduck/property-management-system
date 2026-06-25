"use client"

import { useEffect, useRef, useState } from "react"
import type { LeaseTemplateField } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Loader2, PenLine } from "lucide-react"

interface LeaseDocumentProps {
  url: string
  pageSizes: { w: number; h: number }[]
  fields: LeaseTemplateField[]
  values: Record<string, string | boolean>
  /** Which role's fields are editable here; the other role's values render as text. */
  editableRole?: "manager" | "tenant"
  /** Captured signature PNGs keyed by field key. */
  signatures?: Record<string, string>
  onValueChange?: (key: string, value: string) => void
  onSignatureClick?: (key: string) => void
}

type RenderedPage = { index: number; width: number; height: number; canvas: HTMLCanvasElement }

/**
 * Renders a lease PDF to canvases (via pdf.js) and overlays its fillable fields.
 * Editable fields for `editableRole` become inputs / signature buttons; everything
 * else is shown as read-only text so the document reads like the final lease.
 */
export function LeaseDocument({
  url,
  pageSizes,
  fields,
  values,
  editableRole,
  signatures = {},
  onValueChange,
  onSignatureClick,
}: LeaseDocumentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<RenderedPage[]>([])
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function render() {
      setLoading(true)
      setError(null)
      try {
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
        const containerWidth = containerRef.current?.clientWidth || 800
        const baseWidth = pageSizes[0]?.w || 612
        const pageScale = Math.min(containerWidth / baseWidth, 2)

        const doc = await pdfjs.getDocument({ url }).promise
        const rendered: RenderedPage[] = []
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p)
          const viewport = page.getViewport({ scale: pageScale * (window.devicePixelRatio || 1) })
          const canvas = document.createElement("canvas")
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext("2d")!
          await page.render({ canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise
          rendered.push({
            index: p,
            width: page.getViewport({ scale: pageScale }).width,
            height: page.getViewport({ scale: pageScale }).height,
            canvas,
          })
        }
        if (cancelled) return
        setScale(pageScale)
        setPages(rendered)
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "Failed to render document")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    render()
    return () => {
      cancelled = true
    }
  }, [url, pageSizes])

  return (
    <div ref={containerRef} className="space-y-4">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading document…
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not display the lease: {error}
        </div>
      )}
      {pages.map((pg) => {
        const pageFields = fields.filter((f) => f.page === pg.index)
        return (
          <div
            key={pg.index}
            className="relative mx-auto overflow-hidden rounded-lg border border-border bg-white shadow-sm"
            style={{ width: pg.width, height: pg.height }}
          >
            <canvas
              width={pg.canvas.width}
              height={pg.canvas.height}
              ref={(el) => {
                if (el && el.getContext) {
                  const ctx = el.getContext("2d")!
                  ctx.drawImage(pg.canvas, 0, 0)
                }
              }}
              style={{ width: pg.width, height: pg.height, display: "block" }}
            />
            {pageFields.map((f) => (
              <FieldOverlay
                key={f.key}
                field={f}
                scale={scale}
                value={values[f.key]}
                signature={signatures[f.key]}
                editable={editableRole === f.role}
                onValueChange={onValueChange}
                onSignatureClick={onSignatureClick}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function FieldOverlay({
  field: f,
  scale,
  value,
  signature,
  editable,
  onValueChange,
  onSignatureClick,
}: {
  field: LeaseTemplateField
  scale: number
  value: string | boolean | undefined
  signature?: string
  editable: boolean
  onValueChange?: (key: string, value: string) => void
  onSignatureClick?: (key: string) => void
}) {
  const size = f.size
  const lineH = (size + 4) * scale

  if (f.type === "checkbox") {
    const checked = value === true || value === "true"
    const box = size * scale
    return (
      <div
        style={{ position: "absolute", left: f.x * scale, top: (f.y - size) * scale, width: box, height: box }}
        className="flex items-center justify-center"
      >
        {editable ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onValueChange?.(f.key, e.target.checked ? "true" : "")}
            className="h-full w-full cursor-pointer accent-primary"
          />
        ) : (
          checked && <span style={{ fontSize: size * scale }} className="font-bold leading-none">✕</span>
        )}
      </div>
    )
  }

  if (f.type === "signature" || f.type === "initials") {
    const h = (f.h ?? 22) * scale
    return (
      <div
        style={{ position: "absolute", left: f.x * scale, top: (f.y - (f.h ?? 22)) * scale, width: f.w * scale, height: h }}
      >
        {signature ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signature} alt="signature" className="h-full w-full object-contain object-left" />
        ) : editable ? (
          <button
            type="button"
            onClick={() => onSignatureClick?.(f.key)}
            className="flex h-full w-full items-center justify-center gap-1 rounded border border-dashed border-primary/60 bg-primary/5 text-[10px] font-medium text-primary hover:bg-primary/10"
          >
            <PenLine className="h-3 w-3" /> Sign
          </button>
        ) : null}
      </div>
    )
  }

  // text / date / number
  const display = typeof value === "string" ? value : ""
  if (editable) {
    return (
      <input
        type="text"
        value={display}
        placeholder={f.required ? "•" : ""}
        onChange={(e) => onValueChange?.(f.key, e.target.value)}
        title={f.label}
        style={{
          position: "absolute",
          left: f.x * scale,
          top: (f.y - size) * scale,
          width: f.w * scale,
          height: lineH,
          fontSize: Math.min(size, 11) * scale,
        }}
        className={cn(
          "rounded-sm border-b border-primary/50 bg-primary/5 px-0.5 text-foreground outline-none focus:border-primary focus:bg-primary/10",
        )}
      />
    )
  }
  return (
    <div
      style={{
        position: "absolute",
        left: f.x * scale,
        top: (f.y - size) * scale,
        width: f.w * scale,
        height: lineH,
        fontSize: Math.min(size, 11) * scale,
      }}
      className="overflow-hidden whitespace-nowrap px-0.5 leading-tight text-[#0a0a59]"
    >
      {display}
    </div>
  )
}
