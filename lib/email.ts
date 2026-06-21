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

  if (!process.env.EMAIL_FROM) {
    console.log(
      "[v0] EMAIL_FROM is not set — using Resend's onboarding@resend.dev sender, which can only deliver to your own Resend account email. Set EMAIL_FROM to a verified domain address for real delivery.",
    )
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
