import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateReceiptPdf, type ReceiptData } from "@/lib/receipt"

export const runtime = "nodejs"

function receiptNumber(id: string, paidDate: Date) {
  const year = paidDate.getFullYear()
  const seq = id.replace(/-/g, "").slice(-6).toUpperCase()
  return `RCPT-${year}-${seq}`
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })

  // RLS ensures the requester can only read invoices they own (manager) or are
  // billed to (tenant). No extra scoping needed here.
  const { data: invoice, error } = await supabase
    .from("rent_payments")
    .select(
      "*, tenant:tenants(first_name, last_name, email), property:properties(name, address, city, state, zip_code)",
    )
    .eq("id", id)
    .single()

  if (error || !invoice) return new NextResponse("Not found", { status: 404 })
  if (invoice.status !== "paid") return new NextResponse("Receipt not available until paid", { status: 400 })

  const paidDate = invoice.paid_date ? new Date(invoice.paid_date) : new Date()
  const rcptNum = invoice.receipt_number || receiptNumber(invoice.id, paidDate)
  const tenantName = invoice.tenant ? `${invoice.tenant.first_name} ${invoice.tenant.last_name}` : "Tenant"
  const propertyAddress = invoice.property
    ? [
        invoice.property.address,
        [invoice.property.city, invoice.property.state].filter(Boolean).join(", "),
        invoice.property.zip_code,
      ]
        .filter(Boolean)
        .join(" ")
    : ""

  const data: ReceiptData = {
    receiptNumber: rcptNum,
    paidDate: paidDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    amount: Number(invoice.amount),
    paymentMethod: invoice.payment_method || "—",
    tenantName,
    tenantEmail: invoice.tenant?.email || "",
    propertyName: invoice.property?.name || "Property",
    propertyAddress,
    managerName: "Property HQ",
    periodLabel: new Date(invoice.due_date).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  }

  const pdfBytes = await generateReceiptPdf(data)

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${rcptNum}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
