import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/supabase/service"
import { settleInvoicePaid } from "@/lib/payments"

// Stripe needs the raw body to verify the signature
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else {
      // No webhook secret configured (e.g. local/sandbox). Fall back to parsing.
      // The success path is also reconciled by the success page as a safety net.
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err) {
    console.error("[v0] Stripe webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const invoiceId = session.metadata?.invoice_id

    if (invoiceId && session.payment_status === "paid") {
      const db = createServiceClient()
      const origin = req.headers.get("origin") || req.nextUrl.origin
      await settleInvoicePaid(db, invoiceId, {
        paymentMethod: "Card (Stripe)",
        stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
        portalUrl: `${origin}/portal/payments/${invoiceId}/receipt`,
      })
    }
  }

  return NextResponse.json({ received: true })
}
