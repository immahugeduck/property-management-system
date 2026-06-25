// Dev-only analysis helper. Extracts text-item positions from a lease PDF so we
// can hand-build the field coordinate maps in lib/lease-templates/*.ts.
// Usage: node scripts/map-lease-fields.mjs <path-to-pdf> [maxPage]
import fs from "node:fs"
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"

const file = process.argv[2]
const maxPage = process.argv[3] ? parseInt(process.argv[3]) : 99

const data = new Uint8Array(fs.readFileSync(file))
const doc = await pdfjs.getDocument({ data }).promise
console.log("PAGES", doc.numPages)

for (let p = 1; p <= Math.min(maxPage, doc.numPages); p++) {
  const page = await doc.getPage(p)
  const vp = page.getViewport({ scale: 1 })
  console.log(`\n===== PAGE ${p} (${Math.round(vp.width)}x${Math.round(vp.height)}) =====`)
  const tc = await page.getTextContent()
  // Items carry transform [a,b,c,d,e,f]; e,f = x,y baseline (origin bottom-left).
  // We convert y to top-left origin for readability: yTop = pageHeight - y.
  const H = vp.height
  for (const it of tc.items) {
    const s = it.str
    if (!s || !s.trim()) continue
    const x = it.transform[4]
    const yBottom = it.transform[5]
    const yTop = H - yBottom
    const w = it.width
    const isBlank = /_{2,}/.test(s)
    const isBox = /☐|□|☐/.test(s)
    const tag = isBlank ? "BLANK" : isBox ? "BOX  " : "     "
    // Only print blanks, boxes, and short labels to keep it scannable.
    if (isBlank || isBox || s.length < 60) {
      console.log(
        `${tag} x=${x.toFixed(1)} yTop=${yTop.toFixed(1)} w=${w.toFixed(1)} | ${JSON.stringify(s)}`
      )
    }
  }
}
