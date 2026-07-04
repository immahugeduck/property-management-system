"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Eraser, PenLine } from "lucide-react"

interface SignaturePadProps {
  value?: string | null
  onChange: (dataUrl: string | null) => void
  label?: string
  disabled?: boolean
}

/**
 * Draw-to-sign canvas. Emits a trimmed PNG data URL on change, or null when cleared.
 * Works with both mouse and touch.
 */
export function SignaturePad({ value, onChange, label, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)
  const [empty, setEmpty] = useState(!value)

  // Prepare the backing store at device resolution for crisp strokes.
  const setup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#0f172a"
  }, [])

  useEffect(() => {
    setup()
    const onResize = () => setup()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [setup])

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasInk.current = true
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    if (hasInk.current) {
      setEmpty(false)
      onChange(canvasRef.current?.toDataURL("image/png") ?? null)
    }
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInk.current = false
    setEmpty(true)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          {!empty && !disabled && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
              <Eraser className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      )}
      <div className="relative rounded-lg border-2 border-dashed border-border bg-background">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-36 w-full touch-none rounded-lg"
          style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
        />
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <PenLine className="mb-1 h-5 w-5" />
            <span className="text-xs">Draw your signature here</span>
          </div>
        )}
      </div>
    </div>
  )
}
