import { describe, it, expect, vi, beforeEach } from "vitest"
import { createFakeSupabase, type ReadResult } from "@/test/utils/fake-supabase"

// Mock every side-effect dependency so the test exercises settlement logic only.
vi.mock("@/lib/receipt", () => ({
  generateReceiptPdf: vi.fn(async () => new Uint8Array([1, 2, 3])),
}))
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }))
vi.mock("@/lib/email-templates", () => ({
  receiptEmail: vi.fn(() => ({ subject: "Receipt", html: "<p>Receipt</p>" })),
}))
vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(async () => {}),
  notificationTemplates: {
    receiptReady: () => ({ type: "payment_received", title: "Receipt ready", message: "" }),
    paymentReceived: () => ({ type: "payment_received", title: "Payment received", message: "" }),
  },
}))
vi.mock("@/lib/profile", () => ({ getFromName: vi.fn(async () => "Property HQ") }))

import { settleInvoicePaid } from "@/lib/payments"
import { sendEmail } from "@/lib/email"
import { createNotification } from "@/lib/notifications"

const baseInvoice = {
  id: "11111111-2222-3333-4444-555555555555",
  user_id: "manager-1",
  amount: 1500,
  due_date: "2026-07-01",
  status: "pending",
  receipt_number: null,
  tenant: {
    id: "tenant-1",
    first_name: "Sam",
    last_name: "Rivera",
    email: "sam@example.com",
    auth_user_id: "auth-1",
  },
  property: { name: "Maple Court", address: "1 Main St", city: "Indy", state: "IN", zip_code: "46011" },
}

const settleOpts = { paymentMethod: "Card (Stripe)", portalUrl: "https://app.test/receipt" }

beforeEach(() => vi.clearAllMocks())

function supabaseReturning(invoice: unknown) {
  return createFakeSupabase({ read: (): ReadResult => ({ data: invoice, error: null }) })
}

describe("settleInvoicePaid", () => {
  it("returns { ok: false } and writes nothing when the invoice is missing", async () => {
    const { client, writes } = supabaseReturning(null)
    const result = await settleInvoicePaid(client, "missing-id", settleOpts)
    expect(result).toEqual({ ok: false })
    expect(writes).toHaveLength(0)
    expect(createNotification).not.toHaveBeenCalled()
  })

  it("is idempotent: an already-paid invoice is a no-op with no side effects", async () => {
    const { client, writes } = supabaseReturning({ ...baseInvoice, status: "paid" })
    const result = await settleInvoicePaid(client, baseInvoice.id, settleOpts)
    expect(result).toEqual({ ok: true, alreadyPaid: true })
    expect(writes).toHaveLength(0)
    expect(createNotification).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("marks the invoice paid, assigns a receipt number, and notifies both parties", async () => {
    const { client, writes } = supabaseReturning({ ...baseInvoice })
    const result = await settleInvoicePaid(client, baseInvoice.id, settleOpts)

    expect(result).toEqual({ ok: true })

    const update = writes.find((w) => w.table === "rent_payments" && w.op === "update")
    expect(update).toBeDefined()
    expect(update!.values.status).toBe("paid")
    expect(update!.values.paid_date).toBeTruthy()
    expect(update!.values.receipt_number).toMatch(/^RCPT-\d{4}-[0-9A-F]{6}$/)
    expect(update!.values.payment_method).toBe("Card (Stripe)")

    // Tenant + manager notifications.
    expect(createNotification).toHaveBeenCalledTimes(2)
    // Receipt email to the tenant.
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it("skips the receipt email when the tenant has no email on file", async () => {
    const invoice = { ...baseInvoice, tenant: { ...baseInvoice.tenant, email: null } }
    const { client } = supabaseReturning(invoice)
    const result = await settleInvoicePaid(client, baseInvoice.id, settleOpts)
    expect(result).toEqual({ ok: true })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("preserves an existing receipt number instead of generating a new one", async () => {
    const { client, writes } = supabaseReturning({ ...baseInvoice, receipt_number: "RCPT-2026-ABCDEF" })
    await settleInvoicePaid(client, baseInvoice.id, settleOpts)
    const update = writes.find((w) => w.table === "rent_payments" && w.op === "update")
    expect(update!.values.receipt_number).toBe("RCPT-2026-ABCDEF")
  })
})
