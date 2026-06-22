import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { generateReceiptPdf, type ReceiptData } from "@/lib/receipt"
import { sendEmail } from "@/lib/email"
import { receiptEmail } from "@/lib/email-templates"
import { createNotification, notificationTemplates } from "@/lib/notifications"

function receiptNumber(id: string, paidDate: Date) {
  const year = paidDate.getFullYear()
  const seq = id.replace(/-/g, "").slice(-6).toUpperCase()
  return `RCPT-${year}-${seq}`
}

function periodLabel(dueDate: string) {
  return new Date(dueDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

/**
 * Marks an invoice paid, assigns a receipt number, notifies the tenant (in-app),
 * notifies the manager, and emails the tenant a PDF receipt (if email is configured).
 *
 * Uses a privileged client (service role for the webhook, or the manager's server
 * client for manual mark-paid). Idempotent: re-running on an already-paid invoice
 * will not duplicate notifications.
 */
export async function settleInvoicePaid(
  db: SupabaseClient,
  invoiceId: string,
  opts: {
    paymentMethod: string
    stripePaymentIntent?: string | null
    portalUrl: string
    /** Optional explicit paid date (ISO string or yyyy-mm-dd) for offline payments. */
    paidDate?: string
  },
): Promise<{ ok: boolean; alreadyPaid?: boolean }> {
  const { data: invoice } = await db
    .from("rent_payments")
    .select(
      "*, tenant:tenants(id, first_name, last_name, email, auth_user_id), property:properties(name, address, city, state, zip_code)",
    )
    .eq("id", invoiceId)
    .single()

  if (!invoice) return { ok: false }
  if (invoice.status === "paid") return { ok: true, alreadyPaid: true }

  const paidDate = opts.paidDate ? new Date(opts.paidDate) : new Date()
  const rcptNum = invoice.receipt_number || receiptNumber(invoice.id, paidDate)
  const period = periodLabel(invoice.due_date)

  await db
    .from("rent_payments")
    .update({
      status: "paid",
      paid_date: paidDate.toISOString(),
      payment_method: opts.paymentMethod,
      stripe_payment_intent: opts.stripePaymentIntent ?? null,
      receipt_number: rcptNum,
    })
    .eq("id", invoice.id)

  const tenantName = invoice.tenant ? `${invoice.tenant.first_name} ${invoice.tenant.last_name}` : "Tenant"
  const propertyName = invoice.property?.name || "Your property"
  const propertyAddress = invoice.property
    ? [invoice.property.address, [invoice.property.city, invoice.property.state].filter(Boolean).join(", "), invoice.property.zip_code]
        .filter(Boolean)
        .join(" ")
    : ""

  // In-app notification to the tenant (linked auth user)
  if (invoice.tenant?.auth_user_id) {
    const tpl = notificationTemplates.receiptReady(Number(invoice.amount), period)
    await createNotification({
      client: db,
      userId: invoice.tenant.auth_user_id,
      recipientType: "tenant",
      relatedId: invoice.id,
      link: `/portal/payments/${invoice.id}/receipt`,
      ...tpl,
    })
  }

  // In-app notification to the manager
  const mgrTpl = notificationTemplates.paymentReceived(tenantName, Number(invoice.amount), propertyName)
  await createNotification({
    client: db,
    userId: invoice.user_id,
    recipientType: "manager",
    relatedId: invoice.id,
    link: `/dashboard/invoices/${invoice.id}`,
    ...mgrTpl,
  })

  // Email the PDF receipt to the tenant (no-op if email provider not configured)
  if (invoice.tenant?.email) {
    try {
      const receiptData: ReceiptData = {
        receiptNumber: rcptNum,
        paidDate: paidDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        amount: Number(invoice.amount),
        paymentMethod: opts.paymentMethod,
        tenantName,
        tenantEmail: invoice.tenant.email,
        propertyName,
        propertyAddress,
        managerName: "Property HQ",
        periodLabel: period,
      }
      const pdfBytes = await generateReceiptPdf(receiptData)
      const tpl = receiptEmail({
        tenantName,
        amount: Number(invoice.amount),
        periodLabel: period,
        receiptNumber: rcptNum,
        portalUrl: opts.portalUrl,
      })
      await sendEmail({
        to: invoice.tenant.email,
        subject: tpl.subject,
        html: tpl.html,
        attachments: [
          {
            filename: `receipt-${rcptNum}.pdf`,
            content: pdfBytes,
          },
        ],
      })
    } catch (err) {
      console.error("[v0] Failed to email receipt:", err)
    }
  }

  return { ok: true }
}
