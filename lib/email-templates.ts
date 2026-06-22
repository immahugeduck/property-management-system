/**
 * Centralized, branded email templates for Property HQ.
 *
 * Every transactional email in the app is built from the shared `renderEmail`
 * layout so they all share one consistent, professional look. Each workflow
 * exposes a small builder that returns `{ subject, html }` ready to pass to
 * `sendEmail`.
 *
 * HTML email rules followed here:
 *  - Table-based layout (flexbox/grid are unreliable across email clients)
 *  - Inline styles only (no <style> blocks / external CSS)
 *  - max-width ~560px, web-safe font stack, bulletproof-ish CTA buttons
 */

const BRAND = {
  name: "Property HQ",
  teal: "#1f8f6b",
  ink: "#1a1f25",
  muted: "#6b7280",
  light: "#f6f8f8",
  border: "#e5e7eb",
  danger: "#dc2626",
} as const

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/** Resolve the public site URL for portal/dashboard links inside emails. */
export function siteUrl(path = ""): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined
  const base = (fromEnv || fromVercel || "http://localhost:3000").replace(/\/$/, "")
  if (!path) return base
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

/** Format a number as USD currency. */
export function money(amount: number): string {
  return `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
}

interface DetailRow {
  label: string
  value: string
}

/** A subtle bordered box of label/value rows (amount, period, receipt #, etc.). */
function detailBox(rows: DetailRow[]): string {
  const cells = rows
    .map(
      (r, i) => `
        <tr>
          <td style="padding:${i === 0 ? "0" : "10px"} 0 ${i === rows.length - 1 ? "0" : "10px"};font-family:${FONT};font-size:13px;color:${BRAND.muted};">${r.label}</td>
          <td align="right" style="padding:${i === 0 ? "0" : "10px"} 0 ${i === rows.length - 1 ? "0" : "10px"};font-family:${FONT};font-size:14px;font-weight:600;color:${BRAND.ink};">${r.value}</td>
        </tr>${i === rows.length - 1 ? "" : `<tr><td colspan="2" style="border-top:1px solid ${BRAND.border};font-size:0;line-height:0;">&nbsp;</td></tr>`}`,
    )
    .join("")

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:${BRAND.light};border:1px solid ${BRAND.border};border-radius:10px;">
      <tr><td style="padding:16px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table>
      </td></tr>
    </table>`
}

/** A bulletproof-ish CTA button. */
function button(label: string, url: string, accent: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="border-radius:8px;background:${accent};">
        <a href="${url}" target="_blank"
           style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
          ${label}
        </a>
      </td></tr>
    </table>`
}

interface RenderEmailParams {
  /** Hidden inbox-preview text. */
  preheader: string
  /** Main heading shown at the top of the body. */
  heading: string
  /** Inner body HTML (paragraphs, detail boxes, etc.). */
  body: string
  /** Optional call-to-action button. */
  cta?: { label: string; url: string }
  /** Optional small muted note below the button. */
  footnote?: string
  /** Accent color for the top bar / heading / button. Defaults to brand teal. */
  accent?: string
}

/** Wrap body content in the shared branded email shell. */
export function renderEmail({
  preheader,
  heading,
  body,
  cta,
  footnote,
  accent = BRAND.teal,
}: RenderEmailParams): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.light};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${BRAND.light};">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.light};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
        <tr><td style="height:4px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:26px 32px 0;">
          <span style="font-family:${FONT};font-size:18px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;">${BRAND.name}</span>
        </td></tr>
        <tr><td style="padding:18px 32px 4px;font-family:${FONT};color:${BRAND.ink};font-size:15px;line-height:1.6;">
          <h1 style="margin:0 0 14px;font-size:20px;font-weight:700;color:${BRAND.ink};">${heading}</h1>
          ${body}
          ${cta ? button(cta.label, cta.url, accent) : ""}
          ${footnote ? `<p style="margin:8px 0 0;color:${BRAND.muted};font-size:12px;line-height:1.5;">${footnote}</p>` : ""}
        </td></tr>
        <tr><td style="padding:22px 32px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid ${BRAND.border};padding-top:18px;font-family:${FONT};font-size:12px;line-height:1.5;color:${BRAND.muted};">
              This message was sent by ${BRAND.name}. Please do not reply to this email.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

type Email = { subject: string; html: string }

/* ------------------------------------------------------------------ */
/* Workflow templates                                                  */
/* ------------------------------------------------------------------ */

/** Tenant is invited to set up their portal login. */
export function inviteEmail(params: { firstName: string; inviteUrl: string }): Email {
  return {
    subject: "You're invited to your Property HQ tenant portal",
    html: renderEmail({
      preheader: "Set up your tenant portal to view rent, pay online, and message your manager.",
      heading: "Welcome to your tenant portal",
      body: `
        <p style="margin:0 0 14px;">Hi ${params.firstName}, your property manager has invited you to your tenant portal. There you can view rent invoices, pay online, see your full payment history, submit maintenance requests, and message your manager directly.</p>`,
      cta: { label: "Set up your login", url: params.inviteUrl },
      footnote: `This invite link expires in 14 days. If the button doesn't work, paste this URL into your browser:<br>${params.inviteUrl}`,
    }),
  }
}

/** Tenant has a new chat message from the manager. */
export function newMessageEmail(params: { firstName: string; portalUrl: string }): Email {
  return {
    subject: "New message from your property manager",
    html: renderEmail({
      preheader: "You have a new message waiting in your tenant portal.",
      heading: "You have a new message",
      body: `
        <p style="margin:0 0 14px;">Hi ${params.firstName},</p>
        <p style="margin:0 0 14px;">Your property manager just sent you a message. Log in to your tenant portal to read it and reply.</p>`,
      cta: { label: "Read message", url: params.portalUrl },
      footnote: "Reply directly in your portal — not by responding to this email.",
    }),
  }
}

/** New rent invoice issued to a tenant. */
export function newInvoiceEmail(params: {
  firstName: string
  amount: number
  periodLabel: string
  portalUrl: string
}): Email {
  return {
    subject: `New rent invoice — ${params.periodLabel}`,
    html: renderEmail({
      preheader: `Your ${params.periodLabel} rent invoice is ready to view and pay.`,
      heading: "Your new rent invoice is ready",
      body: `
        <p style="margin:0 0 4px;">Hi ${params.firstName},</p>
        <p style="margin:14px 0 0;">A new rent invoice has been issued to your account.</p>
        ${detailBox([
          { label: "Amount due", value: money(params.amount) },
          { label: "Billing period", value: params.periodLabel },
        ])}`,
      cta: { label: "View & pay invoice", url: params.portalUrl },
      footnote: "Log in to your tenant portal to pay online at any time.",
    }),
  }
}

/** Rent payment is overdue (urgent / red accent). */
export function overdueEmail(params: {
  firstName: string
  amount: number
  dueDateLabel: string
  portalUrl: string
}): Email {
  return {
    subject: `Overdue rent payment — ${money(params.amount)} was due ${params.dueDateLabel}`,
    html: renderEmail({
      accent: BRAND.danger,
      preheader: `Your rent payment of ${money(params.amount)} is past due. Please pay as soon as possible.`,
      heading: "Your rent payment is overdue",
      body: `
        <p style="margin:0 0 4px;">Hi ${params.firstName},</p>
        <p style="margin:14px 0 0;">The following rent payment has not been received and is now past due.</p>
        ${detailBox([
          { label: "Amount due", value: money(params.amount) },
          { label: "Original due date", value: params.dueDateLabel },
        ])}
        <p style="margin:0;">Please log in to your portal to pay immediately, or contact your property manager to make arrangements.</p>`,
      cta: { label: "Pay now", url: params.portalUrl },
      footnote: "If you have already paid, please disregard this message.",
    }),
  }
}

/** Payment receipt confirmation (PDF attached separately by the caller). */
export function receiptEmail(params: {
  tenantName: string
  amount: number
  periodLabel: string
  receiptNumber: string
  portalUrl: string
}): Email {
  return {
    subject: `Payment receipt ${params.receiptNumber} — ${params.periodLabel}`,
    html: renderEmail({
      preheader: `We received your ${params.periodLabel} rent payment of ${money(params.amount)}. Receipt attached.`,
      heading: "Payment received — thank you",
      body: `
        <p style="margin:0 0 4px;">Hi ${params.tenantName},</p>
        <p style="margin:14px 0 0;">We've received your rent payment. Your official receipt is attached as a PDF for your records.</p>
        ${detailBox([
          { label: "Amount paid", value: money(params.amount) },
          { label: "Billing period", value: params.periodLabel },
          { label: "Receipt number", value: `#${params.receiptNumber}` },
        ])}`,
      cta: { label: "View in your portal", url: params.portalUrl },
      footnote: "Thank you for being a valued resident.",
    }),
  }
}

/** Manager alert that a tenant's lease is expiring soon. */
export function leaseExpiringEmail(params: {
  tenantName: string
  propertyName: string
  leaseEndLabel: string
  daysRemaining: number
  tenantUrl: string
}): Email {
  return {
    subject: `Lease expiring in ${params.daysRemaining} days — ${params.tenantName}`,
    html: renderEmail({
      preheader: `${params.tenantName}'s lease at ${params.propertyName} expires on ${params.leaseEndLabel}.`,
      heading: "A lease is expiring soon",
      body: `
        <p style="margin:0 0 4px;">A tenant's lease is approaching its end date. Review the lease and reach out to discuss renewal.</p>
        ${detailBox([
          { label: "Tenant", value: params.tenantName },
          { label: "Property", value: params.propertyName },
          { label: "Lease ends", value: params.leaseEndLabel },
          { label: "Days remaining", value: String(params.daysRemaining) },
        ])}`,
      cta: { label: "View tenant", url: params.tenantUrl },
    }),
  }
}
