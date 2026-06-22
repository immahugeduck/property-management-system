import "server-only"
import Stripe from "stripe"

/**
 * Lazily-instantiated Stripe client.
 *
 * The Stripe SDK throws "Neither apiKey nor config.authenticator provided" if
 * constructed without STRIPE_SECRET_KEY. Because `next build` evaluates route
 * modules to collect page data (without runtime env vars), constructing Stripe
 * at module load time would fail the entire production build. We defer creation
 * until the client is actually used at request time via a Proxy, so the import
 * surface (`import { stripe } from "@/lib/stripe"`) stays unchanged.
 */
let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    // Uses the SDK's pinned API version by default.
    _stripe = new Stripe(apiKey)
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === "function" ? value.bind(client) : value
  },
}) as Stripe
