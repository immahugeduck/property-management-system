import "server-only"

interface EmailAttachment {
  filename: string
  content: Uint8Array
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

/**
 * Sends an email via Resend if RESEND_API_KEY is configured.
 *
 * If no email provider is configured, this safely no-ops (logs only) so the
 * rest of the app keeps working. To enable real emails:
 *   1. Add the Resend integration / set RESEND_API_KEY
 *   2. Set EMAIL_FROM (e.g. "Property HQ <receipts@yourdomain.com>")
 *
 * Returns true if the email was actually sent.
 */
export async function sendEmail({ to, subject, html, attachments }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || "Property HQ <onboarding@resend.dev>"

  if (!apiKey) {
    console.log(`[v0] Email not sent (no RESEND_API_KEY). Would have sent "${subject}" to ${to}`)
    return false
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString("base64"),
        })),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.log(`[v0] Resend email failed (${res.status}): ${text}`)
      return false
    }
    return true
  } catch (err) {
    console.log("[v0] Resend email error:", err)
    return false
  }
}

export function receiptEmailHtml(params: {
  tenantName: string
  amount: number
  periodLabel: string
  receiptNumber: string
  portalUrl: string
}) {
  const money = `$${params.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1f25;">
    <div style="background:#f6f8f8; padding:24px; border-radius:12px 12px 0 0;">
      <h1 style="margin:0; font-size:20px;">Property HQ</h1>
      <p style="margin:4px 0 0; color:#6b7280; font-size:13px;">Payment Receipt</p>
    </div>
    <div style="padding:24px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 12px 12px;">
      <p>Hi ${params.tenantName},</p>
      <p>We've received your rent payment of <strong>${money}</strong> for <strong>${params.periodLabel}</strong>. Your official receipt (#${params.receiptNumber}) is attached as a PDF.</p>
      <p style="margin:24px 0;">
        <a href="${params.portalUrl}" style="background:#1f8f6b; color:#fff; text-decoration:none; padding:12px 20px; border-radius:8px; font-size:14px; display:inline-block;">View in your portal</a>
      </p>
      <p style="color:#6b7280; font-size:12px;">Thank you for being a valued resident.</p>
    </div>
  </div>`
}
