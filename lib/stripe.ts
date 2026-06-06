import "server-only"
import Stripe from "stripe"

// Uses the SDK's pinned API version by default.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
