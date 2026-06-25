// Dev-only: derive field coordinates for the E Street apartment lease from its text
// anchors and emit lib/lease-templates/apartment.ts. Same conventions as the
// Indiana generator: PDF points, TOP-LEFT origin, y = text baseline.
import fs from "node:fs"
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"

const PDF = "lib/lease-templates/assets/apartment-lease.pdf"
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(PDF)) }).promise

const pages = []
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p)
  const vp = page.getViewport({ scale: 1 })
  const tc = await page.getTextContent()
  pages.push({ H: vp.height, W: vp.width, items: tc.items })
}
const round = (n) => Math.round(n * 10) / 10

function at(page, yTop, xTop = null, { wantBlank = false } = {}) {
  const P = pages[page - 1]
  let cands = P.items.filter((i) => i.str.trim() && Math.abs(P.H - i.transform[5] - yTop) < 3)
  if (wantBlank) cands = cands.filter((i) => /_{2,}/.test(i.str))
  const it = xTop == null ? cands[0] : cands.find((i) => Math.abs(i.transform[4] - xTop) < 5)
  if (!it) throw new Error(`page ${page}: no item at yTop=${yTop}${xTop != null ? ` xTop=${xTop}` : ""}`)
  return it
}

function blank(page, yTop, run, { xTop = null, pad = 1 } = {}) {
  const it = at(page, yTop, xTop, { wantBlank: true })
  const s = it.str
  const runs = [...s.matchAll(/_{2,}/g)]
  const m = runs[run]
  if (!m) throw new Error(`page ${page} y${yTop}: run ${run} missing in ${JSON.stringify(s)}`)
  const x = it.transform[4] + (m.index / s.length) * it.width + pad
  const w = (m[0].length / s.length) * it.width - pad
  return { page, x: round(x), y: round(pages[page - 1].H - it.transform[5]), w: round(w), size: Math.round(it.transform[0]) }
}

// A field whose target has no underscores (e.g. a "Print Name:" label) — place
// text starting just after the anchor item.
function afterLabel(page, yTop, xTop, width) {
  const it = at(page, yTop, xTop)
  return {
    page,
    x: round(it.transform[4] + it.width + 4),
    y: round(pages[page - 1].H - it.transform[5]),
    w: width,
    size: Math.round(it.transform[0]),
  }
}

const F = []
const add = (def, geo) => F.push({ ...def, ...geo })
const T = (key, label, source = null, required = true, role = "manager") => ({ key, label, type: "text", role, source, required })
const SIG = (key, label, role) => ({ key, label, type: "signature", role, source: null, required: true })

// --- PAGE 1: parties, premises, term, rent, deposit ---
add(T("agreement_day", "Agreement day", null, true), blank(1, 107.8, 0))
add(T("agreement_month", "Agreement month", null, true), blank(1, 107.8, 1))
add(T("agreement_year", "Agreement year (YY)", null, true), blank(1, 107.8, 2))
add(T("tenant1_name", "Tenant 1 name", "tenant.full", true), blank(1, 137.8, 0))
add(T("tenant2_name", "Tenant 2 name", null, false), blank(1, 137.8, 1))
add(T("apartment_number", "Apartment number", null, true), blank(1, 223.8, 0))
add(T("commence_day", "Term start day", null, true), blank(1, 261.8, 0))
add(T("commence_month", "Term start month", null, true), blank(1, 261.8, 1))
add(T("commence_year", "Term start year (YY)", null, true), blank(1, 261.8, 2))
add(T("end_day", "Term end day", null, true), blank(1, 276.8, 0))
add(T("end_month", "Term end month", null, true), blank(1, 276.8, 1))
add(T("end_year", "Term end year (YY)", null, true), blank(1, 276.8, 2))
add(T("possession_day", "Possession day", null, true), blank(1, 291.8, 0))
add(T("possession_month", "Possession month", null, true), blank(1, 306.8, 0))
add(T("possession_year", "Possession year (YY)", null, true), blank(1, 306.8, 1))
add(T("rent_total_thousands", "Total rent — thousands (words)", null, true), blank(1, 382.8, 0))
add(T("rent_total_hundreds", "Total rent — hundreds (words)", null, true), blank(1, 382.8, 1))
add(T("rent_total_amount", "Total rent — amount", null, true), blank(1, 397.8, 0))
add(T("due_signing_words", "Due at signing (words)", null, true), blank(1, 420.8, 0))
add(T("due_signing_amount", "Due at signing — amount", null, true), blank(1, 435.8, 0))
add(T("monthly_words", "Monthly installment (words)", null, true), blank(1, 435.8, 1))
add(T("first_payment_month", "First payment month", null, true), blank(1, 465.8, 0))
add(T("first_payment_year", "First payment year (YY)", null, true), blank(1, 465.8, 1))
add(T("partial_words", "Partial month rent (words)", null, false), blank(1, 503.8, 0))
add(T("partial_amount", "Partial month rent — amount", null, false), blank(1, 503.8, 1))
add(T("deposit_words", "Security deposit (words)", null, true), blank(1, 594.8, 0))
add(T("deposit_amount", "Security deposit — amount", null, true), blank(1, 594.8, 1))

// --- PAGE 2: insurance ---
add(T("insurance_amount", "Liability insurance amount", null, false), blank(2, 164.8, 0))

// --- PAGE 3: lead-based paint disclosure (initials) ---
add(T("ll_initial_a2", "Landlord initials — no knowledge of lead paint", null, false), blank(3, 407.8, 0))
add(T("ll_initial_b2", "Landlord initials — no lead paint records", null, false), blank(3, 544.8, 0))
add(T("tenant_initial_c", "Tenant initials — received information", null, false, "tenant"), blank(3, 605.8, 0))
add(T("tenant_initial_d", "Tenant initials — received pamphlet", null, false, "tenant"), blank(3, 628.8, 0))

// --- PAGE 5: execution — witness date + landlord ---
add(T("witness_day", "Execution day", null, true), blank(5, 522.8, 0))
add(T("witness_month", "Execution month", null, true), blank(5, 537.8, 0))
add(T("witness_year", "Execution year (YY)", null, true), blank(5, 537.8, 1))
add({ ...SIG("landlord_signature", "Landlord signature", "manager"), h: 18 }, blank(5, 637.8, 0))
add(T("landlord_print", "Landlord printed name", "manager.name", true), blank(5, 652.8, 0))
add(T("landlord_title", "Landlord title", null, true), blank(5, 667.8, 0))

// --- PAGE 6: tenant signatures ---
add({ ...SIG("tenant1_signature", "Tenant signature", "tenant"), h: 18 }, blank(6, 105.8, 0, { xTop: 82.8 }))
add(T("tenant1_print", "Tenant printed name", "tenant.full", true, "tenant"), afterLabel(6, 119.8, 82.8, 150))

// --- PAGE 7: smoke detector compliance form ---
add(T("smoke_property_address", "Smoke form — property address", "property.address", false), blank(7, 110.8, 0))
add(T("smoke_landlord", "Smoke form — landlord", "manager.name", false), blank(7, 183.8, 0))
add(T("smoke_tenant_printed", "Smoke form — tenant printed name", "tenant.full", false, "tenant"), blank(7, 320.8, 0, { xTop: 82.8 }))
add({ ...SIG("smoke_tenant_signed", "Smoke form — tenant signature", "tenant"), h: 18, required: false }, blank(7, 320.8, 0, { xTop: 306.0 }))
add({ ...T("smoke_date", "Smoke form — date", null, false, "tenant"), type: "date" }, blank(7, 438.8, 0))

// --- PAGE 12: rules acknowledgement ---
add({ ...T("rules_ll_date", "Rules — landlord date", null, false), type: "date" }, blank(12, 264.8, 0, { xTop: 82.8 }))
add(T("rules_ll_print", "Rules — landlord printed name", "manager.name", false), blank(12, 264.8, 0, { xTop: 306.0 }))
add({ ...T("rules_tenant_date", "Rules — tenant date", null, false, "tenant"), type: "date" }, blank(12, 324.8, 0, { xTop: 82.8 }))
add(T("rules_tenant_print", "Rules — tenant printed name", "tenant.full", false, "tenant"), blank(12, 324.8, 0, { xTop: 306.0 }))

const pageSizes = pages.map((p) => ({ w: round(p.W), h: round(p.H) }))
const out = `// AUTO-GENERATED by scripts/gen-apartment-map.mjs — do not edit by hand.
// Field geometry is in PDF points, TOP-LEFT origin; \`y\` is the text baseline.
import type { LeaseTemplateField } from "@/lib/types"

export const APARTMENT_PAGE_SIZES = ${JSON.stringify(pageSizes)} as const

export const APARTMENT_PAGE_COUNT = ${doc.numPages}

export const APARTMENT_FIELDS: LeaseTemplateField[] = ${JSON.stringify(F, null, 2)}
`
fs.writeFileSync("lib/lease-templates/apartment.ts", out)
console.log(`Wrote lib/lease-templates/apartment.ts with ${F.length} fields across ${doc.numPages} pages`)
