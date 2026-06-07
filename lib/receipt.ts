import "server-only"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export interface ReceiptData {
  receiptNumber: string
  paidDate: string
  amount: number
  paymentMethod: string
  tenantName: string
  tenantEmail: string
  propertyName: string
  propertyAddress: string
  managerName: string
  periodLabel: string
}

const BRAND = rgb(0.13, 0.55, 0.42) // emerald-ish accent
const INK = rgb(0.1, 0.12, 0.15)
const MUTED = rgb(0.42, 0.45, 0.5)
const LINE = rgb(0.85, 0.87, 0.89)

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Generates a professional rent payment receipt as a PDF.
 * Returns the raw PDF bytes (Uint8Array) suitable for download or email attachment.
 */
export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const margin = 56
  let y = height - margin

  // Header band
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: rgb(0.97, 0.98, 0.98) })
  page.drawText("Property HQ", { x: margin, y: height - 64, size: 22, font: bold, color: INK })
  page.drawText("Payment Receipt", { x: margin, y: height - 88, size: 12, font, color: MUTED })

  // Receipt meta (right aligned)
  const metaRightX = width - margin
  const drawRight = (text: string, yy: number, f = font, size = 10, color = MUTED) => {
    const w = f.widthOfTextAtSize(text, size)
    page.drawText(text, { x: metaRightX - w, y: yy, size, font: f, color })
  }
  drawRight(`Receipt #${data.receiptNumber}`, height - 60, bold, 11, INK)
  drawRight(`Paid: ${data.paidDate}`, height - 78, font, 10, MUTED)

  y = height - 160

  // PAID badge
  page.drawRectangle({ x: margin, y: y - 6, width: 64, height: 22, color: BRAND })
  page.drawText("PAID", { x: margin + 18, y: y, size: 11, font: bold, color: rgb(1, 1, 1) })
  y -= 50

  // Billed to / Property columns
  const colGap = (width - margin * 2) / 2
  page.drawText("BILLED TO", { x: margin, y, size: 9, font: bold, color: MUTED })
  page.drawText("PROPERTY", { x: margin + colGap, y, size: 9, font: bold, color: MUTED })
  y -= 18
  page.drawText(data.tenantName, { x: margin, y, size: 11, font: bold, color: INK })
  page.drawText(data.propertyName, { x: margin + colGap, y, size: 11, font: bold, color: INK })
  y -= 15
  page.drawText(data.tenantEmail, { x: margin, y, size: 10, font, color: MUTED })
  const addrLines = wrapText(data.propertyAddress, font, 10, colGap - 12)
  addrLines.forEach((ln, i) => {
    page.drawText(ln, { x: margin + colGap, y: y - i * 13, size: 10, font, color: MUTED })
  })
  y -= Math.max(40, addrLines.length * 13 + 20)

  // Line items table
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE })
  y -= 22
  page.drawText("DESCRIPTION", { x: margin, y, size: 9, font: bold, color: MUTED })
  drawRight("AMOUNT", y, bold, 9, MUTED)
  y -= 20
  page.drawText(`Rent — ${data.periodLabel}`, { x: margin, y, size: 11, font, color: INK })
  drawRight(money(data.amount), y, font, 11, INK)
  y -= 16
  page.drawText(`Payment method: ${data.paymentMethod}`, { x: margin, y, size: 9, font, color: MUTED })
  y -= 18
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE })
  y -= 26

  // Total
  page.drawText("Total Paid", { x: width - margin - 220, y, size: 12, font: bold, color: INK })
  drawRight(money(data.amount), y, bold, 16, BRAND)

  // Footer
  const footerY = margin + 20
  page.drawLine({ start: { x: margin, y: footerY + 24 }, end: { x: width - margin, y: footerY + 24 }, thickness: 1, color: LINE })
  page.drawText(`Issued by ${data.managerName} via Property HQ`, { x: margin, y: footerY, size: 9, font, color: MUTED })
  page.drawText("This receipt confirms payment was received in full. Thank you.", { x: margin, y: footerY - 13, size: 9, font, color: MUTED })

  return pdf.save()
}

function wrapText(text: string, font: import("pdf-lib").PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [text]
}
