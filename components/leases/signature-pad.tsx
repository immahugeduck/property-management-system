"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Eraser, Check } from "lucide-react"

interface SignaturePadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (pngDataUrl: string) => void
  title?: string
}

/**
 * A lightweight canvas signature pad. Captures a transparent PNG data URL of the
 * drawn signature — no external dependency.
 */
export function SignaturePad({ open, onOpenChange, onConfirm, title = "Draw your signature" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)
  const [empty, setEmpty] = useState(true)

  const setup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
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
    if (open) {
      // Wait for the dialog to lay out before sizing the canvas.
      const id = setTimeout(() => {
        setup()
        hasInk.current = false
        setEmpty(true)
      }, 50)
      return () => clearTimeout(id)
    }
  }, [open, setup])

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent) {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current!.getContext("2d")!
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext("2d")!
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasInk.current = true
    if (empty) setEmpty(false)
  }
  function end() {
    drawing.current = false
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInk.current = false
    setEmpty(true)
  }

  function confirm() {
    const canvas = canvasRef.current
    if (!canvas || !hasInk.current) return
    onConfirm(canvas.toDataURL("image/png"))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-white">
          <canvas
            ref={canvasRef}
            className="h-44 w-full touch-none rounded-lg"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
        </div>
        <p className="text-xs text-muted-foreground">Sign using your mouse, trackpad, or finger.</p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={clear}>
            <Eraser className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <Button type="button" onClick={confirm} disabled={empty}>
            <Check className="mr-2 h-4 w-4" />
            Apply signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
