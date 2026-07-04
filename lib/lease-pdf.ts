import "server-only"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import type { LeaseField, LeaseValues } from "@/lib/types"

/**
 * Stamps a lease's field values (text, dates, checkbox marks and signature
 * images) onto the template PDF and returns the flattened bytes.
 *
 * Field coordinates are stored with a top-left origin (the convention used by
 * the field editor), whereas pdf-lib uses a bottom-left origin, so y is
 * converted per page using the page's real height.
 */
export async function generateSignedLeasePdf({
  templateBytes,
  fields,
  values,
}: {
  templateBytes: Uint8Array | ArrayBuffer
  fields: LeaseField[]
  values: LeaseValues
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pages = pdf.getPages()
  const ink = rgb(0.08, 0.08, 0.1)

  for (const field of fields) {
    const page = pages[field.page - 1]
    if (!page) continue
    const { height } = page.getSize()
    const value = values[field.key]
    const size = field.size || 11

    if (field.type === "signature") {
      if (typeof value !== "string" || !value.startsWith("data:image")) continue
      try {
        const base64 = value.slice(value.indexOf(",") + 1)
        const bytes = Buffer.from(base64, "base64")
        const png = await pdf.embedPng(bytes)
        const w = field.w && field.w > 0 ? field.w : 160
        const h = Math.min((png.height / png.width) * w, 46)
        // Sit the signature just above the field baseline.
        page.drawImage(png, { x: field.x, y: height - field.y - h, width: w, height: h })
      } catch {
        // A malformed signature image should not abort the whole document.
      }
      continue
    }

    if (field.type === "checkbox") {
      if (value === true || value === "true") {
        page.drawText("X", { x: field.x, y: height - field.y - size, size, font, color: ink })
      }
      continue
    }

    // text / date
    if (typeof value === "string" && value.trim()) {
      page.drawText(value, {
        x: field.x,
        y: height - field.y - size,
        size,
        font,
        color: ink,
        maxWidth: field.w && field.w > 0 ? field.w : undefined,
        lineHeight: size + 2,
      })
    }
  }

  return pdf.save()
}
