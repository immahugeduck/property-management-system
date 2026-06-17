"use server"

import { randomBytes } from "crypto"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createNotification } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"

async function getBaseUrl(): Promise<string> {
  // Explicit env var takes priority
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")

  // Derive from the actual incoming request (always correct in server actions)
  const h = await headers()
  const host = h.get("x-forwarded-host") || h.get("host")
  if (host) {
    const proto = h.get("x-forwarded-proto") || "https"
    return `${proto}://${host}`
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  return "http://localhost:3000"
}

/**
 * Manager action: create (or refresh) a one-time invite for a tenant.
 * Emails the tenant a link to set up their portal login.
 */
export async function inviteTenant(tenantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("id, first_name, last_name, email, auth_user_id")
    .eq("id", tenantId)
    .single()

  if (tErr || !tenant) return { error: "Tenant not found" }
  if (tenant.auth_user_id) return { error: "This tenant already has portal access." }
  if (!tenant.email) return { error: "This tenant has no email address on file." }

  const token = randomBytes(24).toString("hex")

  // Expire any prior pending invites for this tenant, then create a fresh one.
  await supabase.from("tenant_invites").update({ status: "expired" }).eq("tenant_id", tenantId).eq("status", "pending")

  const { error: insErr } = await supabase.from("tenant_invites").insert({
    user_id: user.id,
    tenant_id: tenantId,
    email: tenant.email,
    token,
    status: "pending",
  })
  if (insErr) return { error: insErr.message }

  await supabase
    .from("tenants")
    .update({ invited_at: new Date().toISOString(), portal_enabled: true })
    .eq("id", tenantId)

  const base = await getBaseUrl()
  const inviteUrl = `${base}/invite/accept?token=${token}`

  const emailSent = await sendEmail({
    to: tenant.email,
    subject: "You're invited to your Property HQ tenant portal",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin:0 auto; color:#1a1f25;">
        <h1 style="font-size:20px;">Welcome to Property HQ</h1>
        <p>Hi ${tenant.first_name}, your property manager has invited you to your tenant portal where you can view rent invoices, pay online, see your payment history, and message your manager.</p>
        <p style="margin:24px 0;">
          <a href="${inviteUrl}" style="background:#1f8f6b; color:#fff; text-decoration:none; padding:12px 20px; border-radius:8px; font-size:14px; display:inline-block;">Set up your login</a>
        </p>
        <p style="color:#6b7280; font-size:12px;">This invite link expires in 14 days. If the button doesn't work, paste this URL into your browser:<br>${inviteUrl}</p>
      </div>`,
  })

  return { success: true, inviteUrl, emailSent }
}

/**
 * Public action: validate an invite token (used on the accept page).
 * Uses the service role because the visitor is not yet authenticated.
 */
export async function validateInvite(token: string) {
  if (!token) return { valid: false as const, error: "Missing token" }
  const svc = createServiceClient()

  const { data: invite } = await svc
    .from("tenant_invites")
    .select("id, tenant_id, email, status, expires_at")
    .eq("token", token)
    .maybeSingle()

  if (!invite) return { valid: false as const, error: "Invite not found" }
  if (invite.status === "accepted") return { valid: false as const, error: "This invite has already been used." }
  if (invite.status === "expired" || new Date(invite.expires_at) < new Date()) {
    return { valid: false as const, error: "This invite has expired. Please ask your manager for a new one." }
  }

  return { valid: true as const, email: invite.email, tenantId: invite.tenant_id }
}

/**
 * Public action: accept an invite by creating a tenant login and linking it
 * to the tenant record. Runs with the service role to bypass RLS for linking.
 */
export async function acceptInvite(params: { token: string; password: string }) {
  const { token, password } = params
  if (!token) return { error: "Missing token" }
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters." }

  const svc = createServiceClient()

  const { data: invite } = await svc
    .from("tenant_invites")
    .select("id, tenant_id, email, status, expires_at, user_id")
    .eq("token", token)
    .maybeSingle()

  if (!invite) return { error: "Invite not found" }
  if (invite.status !== "pending") return { error: "This invite is no longer valid." }
  if (new Date(invite.expires_at) < new Date()) return { error: "This invite has expired." }

  // Create the auth user (email confirmed since invite proves email ownership).
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  })

  if (createErr || !created.user) {
    // If the user already exists, surface a clear message.
    if (createErr?.message?.toLowerCase().includes("already")) {
      return { error: "An account with this email already exists. Try logging in instead." }
    }
    return { error: createErr?.message || "Could not create account." }
  }

  const authUserId = created.user.id

  // Link the tenant record to the new auth user.
  const { error: linkErr } = await svc
    .from("tenants")
    .update({
      auth_user_id: authUserId,
      portal_activated_at: new Date().toISOString(),
      portal_enabled: true,
    })
    .eq("id", invite.tenant_id)

  if (linkErr) {
    // Roll back the created auth user to avoid orphans.
    await svc.auth.admin.deleteUser(authUserId)
    return { error: linkErr.message }
  }

  await svc.from("tenant_invites").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invite.id)

  // Notify the manager that the tenant activated their portal.
  await createNotification({
    userId: invite.user_id,
    type: "general",
    title: "Tenant portal activated",
    message: `${invite.email} has set up their tenant portal login.`,
    link: "/dashboard/tenants",
  }).catch(() => {})

  return { success: true, email: invite.email }
}
