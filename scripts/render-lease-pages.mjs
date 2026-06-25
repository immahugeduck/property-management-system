// Dev-only: render lease PDF pages to PNG so field positions can be verified visually.
// Usage: node scripts/render-lease-pages.mjs <pdf> <outDir> [scale] [pages csv]
import fs from "node:fs"
import path from "node:path"
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"
import { createCanvas } from "@napi-rs/canvas"

const file = process.argv[2]
const outDir = process.argv[3]
const scale = process.argv[4] ? parseFloat(process.argv[4]) : 1.5
const only = process.argv[5] ? process.argv[5].split(",").map(Number) : null

fs.mkdirSync(outDir, { recursive: true })
const data = new Uint8Array(fs.readFileSync(file))
const doc = await pdfjs.getDocument({ data }).promise

for (let p = 1; p <= doc.numPages; p++) {
  if (only && !only.includes(p)) continue
  const page = await doc.getPage(p)
  const vp = page.getViewport({ scale })
  const canvas = createCanvas(vp.width, vp.height)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, vp.width, vp.height)
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise
  const out = path.join(outDir, `p${String(p).padStart(2, "0")}.png`)
  fs.writeFileSync(out, canvas.toBuffer("image/png"))
  console.log("wrote", out, `${Math.round(vp.width)}x${Math.round(vp.height)} (scale ${scale})`)
}
