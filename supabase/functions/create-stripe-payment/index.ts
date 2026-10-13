import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
const stripeApiKey = Deno.env.get("STRIPE_SECRET_KEY");

if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
if (!rawSecretKeys) throw new Error("SUPABASE_SECRET_KEYS is required");
if (!stripeApiKey) throw new Error("STRIPE_SECRET_KEY is required");

const parsedSecretKeys = JSON.parse(rawSecretKeys) as Record<string, string>;
const firstSecretKeyName = Object.keys(parsedSecretKeys)[0];
if (!firstSecretKeyName) throw new Error("No key found in SUPABASE_SECRET_KEYS");
const supabaseSecretKey = parsedSecretKeys[firstSecretKeyName];
if (!supabaseSecretKey) throw new Error("Resolved Supabase secret key is empty");

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stripe = new Stripe(stripeApiKey, { apiVersion: "2024-11-20" });

type CreatePaymentRequest = {
  rent_payment_id?: string;
  payment_type?: "rent" | "deposit";
  amount_cents?: number;
  currency?: string;
  tenant_email?: string;
  tenant_name?: string;
  description?: string;
  success_url: string;
  cancel_url: string;
  connected_account_id?: string;
  application_fee_bps?: number;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as CreatePaymentRequest;

    const paymentType = payload.payment_type ?? "rent";
    const currency = (payload.currency ?? "usd").toLowerCase();
    let amountCents = payload.amount_cents;
    let description = payload.description ?? "Property payment";
    let internalPaymentId: string | null = null;

    if (payload.rent_payment_id) {
      const { data: rentPayment, error: rentPaymentError } = await supabase
        .from("rent_payments")
        .select("id, amount, tenant_id, due_date")
        .eq("id", payload.rent_payment_id)
        .single();

      if (rentPaymentError || !rentPayment) {
        return new Response(JSON.stringify({ error: "Invalid rent_payment_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      internalPaymentId = rentPayment.id;
      amountCents = amountCents ?? Math.round(Number(rentPayment.amount) * 100);
      description = payload.description ?? `Rent due ${rentPayment.due_date}`;
    }

    if (!amountCents || amountCents <= 0) {
      return new Response(JSON.stringify({ error: "amount_cents must be > 0" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!payload.success_url || !payload.cancel_url) {
      return new Response(JSON.stringify({ error: "success_url and cancel_url are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let applicationFeeAmount: number | undefined = undefined;
    if (payload.connected_account_id && payload.application_fee_bps && payload.application_fee_bps > 0) {
      applicationFeeAmount = Math.round((amountCents * payload.application_fee_bps) / 10000);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: payload.success_url,
      cancel_url: payload.cancel_url,
      customer_email: payload.tenant_email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: paymentType === "deposit" ? "Security Deposit" : "Rent Payment",
              description,
            },
          },
        },
      ],
      payment_intent_data: {
        ...(payload.connected_account_id
          ? {
              transfer_data: { destination: payload.connected_account_id },
              ...(applicationFeeAmount ? { application_fee_amount: applicationFeeAmount } : {}),
            }
          : {}),
        metadata: {
          payment_type: paymentType,
          rent_payment_id: internalPaymentId ?? "",
        },
      },
      metadata: {
        payment_type: paymentType,
        rent_payment_id: internalPaymentId ?? "",
      },
    });

    if (internalPaymentId) {
      const { error: updateError } = await supabase
        .from("rent_payments")
        .update({
          stripe_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalPaymentId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        checkout_session_id: session.id,
        checkout_url: session.url,
        amount_cents: amountCents,
        currency,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
