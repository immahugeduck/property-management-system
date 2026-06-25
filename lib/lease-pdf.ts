import "server-only"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import type { LeaseTemplate, LeaseTemplateField, Tenant, Property } from "@/lib/types"

/** Helvetica (WinAnsi) can't encode every character; drop anything it can't draw. */
function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
}

type AutofillContext = {
  tenant?: Pick<Tenant, "first_name" | "last_name" | "email" | "phone"> | null
  property?: Pick<Property, "address" | "city" | "state"> | null
  managerName?: string | null
}

/** Resolve the value for a `source`-bound field from existing records. */
function resolveSource(field: LeaseTemplateField, ctx: AutofillContext): string | undefined {
  const t = ctx.tenant
  const p = ctx.property
  switch (field.source) {
    case "manager.name":
      return ctx.managerName || undefined
    case "tenant.full":
      return t ? `${t.first_name} ${t.last_name}`.trim() : undefined
    case "tenant.first_name":
      return t?.first_name
    case "tenant.last_name":
      return t?.last_name
    case "tenant.email":
      return t?.email || undefined
    case "tenant.phone":
      return t?.phone || undefined
    case "property.address":
      return p?.address
    case "property.city":
      return p?.city
    case "property.state":
      return p?.state
    default:
      return undefined
  }
}

/**
 * Build the initial `values` map for a new lease, pre-filling every field that is
 * bound to an existing record (landlord name, tenant name, property address, ...).
 */
export function resolveAutofill(
  fields: LeaseTemplateField[],
  ctx: AutofillContext
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of fields) {
    const v = resolveSource(f, ctx)
    if (v != null && v !== "") out[f.key] = v
  }
  return out
}

/**
 * Draw `values` onto the template PDF and return flattened bytes. Signature fields
 * expect a PNG data URL; text/date/number draw as text (auto-shrunk to fit width);
 * checkboxes draw an "X" when truthy.
 */
export async function fillLeasePdf(
  templateBytes: Uint8Array | ArrayBuffer,
  fields: LeaseTemplateField[],
  values: Record<string, string | boolean>
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pages = pdf.getPages()
  const ink = rgb(0.04, 0.04, 0.35)

  for (const f of fields) {
    const raw = values[f.key]
    if (raw == null || raw === "" || raw === false) continue
    const page = pages[f.page - 1]
    if (!page) continue
    const H = page.getHeight()

    if (f.type === "checkbox") {
      page.drawText("X", { x: f.x + 1.5, y: H - f.y + 0.5, size: f.size, font, color: rgb(0, 0, 0) })
      continue
    }

    if (f.type === "signature" || f.type === "initials") {
      const dataUrl = String(raw)
      if (!dataUrl.startsWith("data:image/png")) continue
      const png = await pdf.embedPng(dataUrl)
      const boxH = f.h ?? 22
      const boxW = f.w
      // Contain the signature within the box, preserving aspect ratio, and rest
      // its bottom on the baseline (f.y is the signature line, top-left origin).
      const scale = Math.min(boxW / png.width, boxH / png.height)
      const dw = png.width * scale
      const dh = png.height * scale
      page.drawImage(png, { x: f.x, y: H - f.y, width: dw, height: dh })
      continue
    }

    // text / date / number
    let size = Math.min(f.size - 1, 11)
    let text = sanitize(String(raw))
    while (size > 6 && font.widthOfTextAtSize(text, size) > f.w) size -= 0.5
    page.drawText(text, { x: f.x, y: H - f.y + 1.5, size, font, color: ink })
  }

  // Flatten any interactive form (these templates have none, but be safe) and save.
  try {
    pdf.getForm().flatten()
  } catch {
    // no form present
  }
  return pdf.save()
}

/** Convenience: returns the subset of fields a given role is expected to fill. */
export function fieldsForRole(template: LeaseTemplate, role: "manager" | "tenant") {
  return template.fields.filter((f) => f.role === role)
}
