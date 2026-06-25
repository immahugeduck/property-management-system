// Dev-only: derive precise field coordinates for the Indiana lease from its text
// anchors and emit lib/lease-templates/indiana.ts. Coordinates are stored in PDF
// points with a TOP-LEFT origin (x = left, y = distance from page top to the text
// baseline). The fill engine and the browser overlay both consume this geometry.
import fs from "node:fs"
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"

const PDF = "lib/lease-templates/assets/indiana-residential-lease.pdf"
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(PDF)) }).promise

const pages = []
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p)
  const vp = page.getViewport({ scale: 1 })
  const tc = await page.getTextContent()
  pages.push({ H: vp.height, W: vp.width, items: tc.items })
}

// Locate the text item on `page` (1-based) by the baseline distance-from-top
// (`yTop`) and, optionally, the left edge `xTop`. This is robust against repeated
// strings (multiple "Date:" / "City of" lines).
function at(page, yTop, xTop = null, { wantBlank = false } = {}) {
  const P = pages[page - 1]
  let cands = P.items
    .filter((i) => i.str.trim() && Math.abs(P.H - i.transform[5] - yTop) < 3)
  if (wantBlank) cands = cands.filter((i) => /_{2,}/.test(i.str))
  const it = xTop == null ? cands[0] : cands.find((i) => Math.abs(i.transform[4] - xTop) < 4)
  if (!it) throw new Error(`page ${page}: no item at yTop=${yTop}${xTop != null ? ` xTop=${xTop}` : ""}`)
  return it
}

// Geometry of the `run`-th underscore run inside the item located at (yTop[,xTop]).
function blank(page, yTop, run, { xTop = null, pad = 1 } = {}) {
  const it = at(page, yTop, xTop, { wantBlank: true })
  const s = it.str
  const runs = [...s.matchAll(/_{2,}/g)]
  const m = runs[run]
  if (!m) throw new Error(`page ${page}: run ${run} missing in ${JSON.stringify(s)}`)
  const start = m.index
  const len = m[0].length
  const x = it.transform[4] + (start / s.length) * it.width + pad
  const w = (len / s.length) * it.width - pad
  const baselineTop = pages[page - 1].H - it.transform[5]
  const size = Math.round(it.transform[0])
  return { page, x: round(x), y: round(baselineTop), w: round(w), size }
}

// Geometry of a checkbox glyph (☐) at (yTop,xTop) — returns its top-left box.
function box(page, yTop, xTop) {
  const it = at(page, yTop, xTop)
  const baselineTop = pages[page - 1].H - it.transform[5]
  const size = Math.round(it.transform[0])
  return { page, x: round(it.transform[4]), y: round(baselineTop), w: size, size }
}
const round = (n) => Math.round(n * 10) / 10

// --- Field definitions (key, label, type, role, source) + geometry anchor. ---
const F = []
const add = (def, geo) => F.push({ ...def, ...geo })

// I. PARTIES (page 1)
add({ key: "agreement_day", label: "Agreement date (month & day)", type: "text", role: "manager", source: null, required: true },
  blank(1, 116.3, 0))
add({ key: "agreement_year", label: "Agreement year (YY)", type: "text", role: "manager", source: null, required: true },
  blank(1, 116.3, 1))
add({ key: "landlord_name", label: "Landlord name", type: "text", role: "manager", source: "manager.name", required: true },
  blank(1, 143.8, 0, { xTop: 123.3 }))
add({ key: "landlord_address", label: "Landlord mailing address", type: "text", role: "manager", source: null, required: true },
  blank(1, 157.8, 0))
add({ key: "landlord_city", label: "Landlord city", type: "text", role: "manager", source: null, required: true },
  blank(1, 157.8, 1))
add({ key: "landlord_state", label: "Landlord state", type: "text", role: "manager", source: null, required: true },
  blank(1, 171.5, 0))
add({ key: "tenant_names", label: "Tenant name(s)", type: "text", role: "manager", source: "tenant.full", required: true },
  blank(1, 199.1, 0, { xTop: 126.3 }))

// II. LEASE TYPE — check the Fixed Lease box + term dates (page 1)
add({ key: "lease_type_fixed", label: "Fixed lease", type: "checkbox", role: "manager", source: null, required: false },
  box(1, 352.6, 108.0))
add({ key: "term_start_day", label: "Lease start (month & day)", type: "text", role: "manager", source: null, required: true },
  blank(1, 366.9, 0))
add({ key: "term_start_year", label: "Lease start year (YY)", type: "text", role: "manager", source: null, required: true },
  blank(1, 366.9, 1))
add({ key: "term_end_day", label: "Lease end (month & day)", type: "text", role: "manager", source: null, required: true },
  blank(1, 366.9, 2))
add({ key: "term_end_year", label: "Lease end year (YY)", type: "text", role: "manager", source: null, required: true },
  blank(1, 366.9, 3))

// IV. THE PROPERTY (page 1)
add({ key: "premises_address", label: "Property address", type: "text", role: "manager", source: "property.address", required: true },
  blank(1, 681.5, 0))
add({ key: "premises_city", label: "Property city", type: "text", role: "manager", source: "property.city", required: true },
  blank(1, 681.5, 1))
add({ key: "premises_state", label: "Property state", type: "text", role: "manager", source: "property.state", required: true },
  blank(1, 695.2, 0))

// VIII. RENT (page 2)
add({ key: "rent_amount", label: "Monthly rent ($)", type: "text", role: "manager", source: null, required: true },
  blank(2, 394.1, 0))
add({ key: "rent_due_day", label: "Rent due day of month", type: "text", role: "manager", source: null, required: true },
  blank(2, 394.1, 1))

// XIV. SECURITY DEPOSIT (page 3)
add({ key: "security_deposit", label: "Security deposit ($)", type: "text", role: "manager", source: null, required: false },
  blank(3, 322.6, 0))

// Page 10 — AMOUNT DUE AT SIGNING summary
add({ key: "due_security_deposit", label: "Security deposit due ($)", type: "text", role: "manager", source: null, required: false },
  blank(10, 106.5, 0))
add({ key: "due_first_month", label: "First month's rent due ($)", type: "text", role: "manager", source: null, required: false },
  blank(10, 134.3, 0))

// Signature block (page 9) — anchored by baseline Y, disambiguated by X.
add({ key: "landlord_signature", label: "Landlord signature", type: "signature", role: "manager", source: null, required: true },
  { ...blank(9, 286.9, 0, { xTop: 194.8 }), h: 22 })
add({ key: "landlord_sign_date", label: "Landlord sign date", type: "text", role: "manager", source: null, required: true },
  blank(9, 286.9, 0, { xTop: 378.9 }))
add({ key: "landlord_print", label: "Landlord printed name", type: "text", role: "manager", source: "manager.name", required: true },
  blank(9, 314.4, 0))
add({ key: "tenant_signature", label: "Tenant signature", type: "signature", role: "tenant", source: null, required: true },
  { ...blank(9, 342.1, 0, { xTop: 183.3 }), h: 22 })
add({ key: "tenant_sign_date", label: "Tenant sign date", type: "date", role: "tenant", source: null, required: true },
  blank(9, 342.1, 0, { xTop: 367.1 }))
add({ key: "tenant_print", label: "Tenant printed name", type: "text", role: "tenant", source: "tenant.full", required: true },
  blank(9, 369.6, 0))

const pageSizes = pages.map((p) => ({ w: round(p.W), h: round(p.H) }))
const out = `// AUTO-GENERATED by scripts/gen-indiana-map.mjs — do not edit by hand.
// Field geometry is in PDF points, TOP-LEFT origin; \`y\` is the text baseline.
import type { LeaseTemplateField } from "@/lib/types"

export const INDIANA_PAGE_SIZES = ${JSON.stringify(pageSizes)} as const

export const INDIANA_PAGE_COUNT = ${doc.numPages}

export const INDIANA_FIELDS: LeaseTemplateField[] = ${JSON.stringify(F, null, 2)}
`
fs.writeFileSync("lib/lease-templates/indiana.ts", out)
console.log(`Wrote lib/lease-templates/indiana.ts with ${F.length} fields across ${doc.numPages} pages`)
