"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { settleInvoicePaid } from "@/lib/payments"

/**
 * Manager-initiated "mark as paid" for offline payments (cash, check, ACH, etc.).
 * Verifies the manager owns the invoice, records the chosen method/date, and runs
 * the shared settlement flow (receipt PDF email + in-app notifications).
 */
export async function markInvoicePaid(
  invoiceId: string,
  paymentMethod: string,
  paidDate?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authorized" }

  // Confirm this invoice belongs to the signed-in manager (RLS also enforces this).
  const { data: invoice } = await supabase
    .from("rent_payments")
    .select("id, user_id, status")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single()

  if (!invoice) return { ok: false, error: "Invoice not found" }
  if (invoice.status === "paid") return { ok: true }

  const h = await headers()
  const host = h.get("x-forwarded-host") || h.get("host")
  const proto = h.get("x-forwarded-proto") || "https"

  const db = createServiceClient()
  const res = await settleInvoicePaid(db, invoiceId, {
    paymentMethod,
    paidDate,
    portalUrl: `${proto}://${host}/portal/payments/${invoiceId}/receipt`,
  })

  if (!res.ok) return { ok: false, error: "Could not record payment" }

  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  revalidatePath("/dashboard/invoices")
  revalidatePath("/dashboard/payments")
  return { ok: true }
}
