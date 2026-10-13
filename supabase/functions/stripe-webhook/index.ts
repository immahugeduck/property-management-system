import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
const stripeApiKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");

if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
if (!rawSecretKeys) throw new Error("SUPABASE_SECRET_KEYS is required");
if (!stripeApiKey) throw new Error("STRIPE_SECRET_KEY is required");
if (!stripeWebhookSecret) throw new Error("STRIPE_WEBHOOK_SIGNING_SECRET is required");

const parsedSecretKeys = JSON.parse(rawSecretKeys) as Record<string, string>;
const firstSecretKeyName = Object.keys(parsedSecretKeys)[0];
if (!firstSecretKeyName) throw new Error("No key found in SUPABASE_SECRET_KEYS");
const supabaseSecretKey = parsedSecretKeys[firstSecretKeyName];
if (!supabaseSecretKey) throw new Error("Resolved Supabase secret key is empty");

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stripe = new Stripe(stripeApiKey, { apiVersion: "2024-11-20" });
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      stripeWebhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    return new Response(message, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existingError) {
    return new Response(existingError.message, { status: 500 });
  }

  if (existing) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: insertEventError } = await supabase.from("stripe_webhook_events").insert({
    event_id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  if (insertEventError) {
    return new Response(insertEventError.message, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const rentPaymentId = session.metadata?.rent_payment_id || null;
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

        if (rentPaymentId) {
          const { error } = await supabase
            .from("rent_payments")
            .update({
              status: "paid",
              paid_date: new Date().toISOString().slice(0, 10),
              stripe_session_id: session.id,
              stripe_payment_intent: paymentIntentId ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", rentPaymentId);

          if (error) throw error;
        }
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const rentPaymentId = pi.metadata?.rent_payment_id || null;

        if (rentPaymentId) {
          const { error } = await supabase
            .from("rent_payments")
            .update({
              status: "paid",
              paid_date: new Date().toISOString().slice(0, 10),
              stripe_payment_intent: pi.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", rentPaymentId);

          if (error) throw error;
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const rentPaymentId = pi.metadata?.rent_payment_id || null;

        if (rentPaymentId) {
          const reason = pi.last_payment_error?.message ?? "Stripe payment failed";
          const { error } = await supabase
            .from("rent_payments")
            .update({
              status: "pending",
              notes: reason,
              stripe_payment_intent: pi.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", rentPaymentId);

          if (error) throw error;
        }
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed processing event";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
