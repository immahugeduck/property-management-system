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
  /** Override the display name portion of the FROM address (e.g. "BRK Properties"). */
  fromName?: string
}

/**
 * Normalizes a "from" header into RFC 5322 form: `Display Name <email@domain>`.
 * Resend rejects/misparses values like `Name<email@domain>` (no space before `<`).
 * Also handles a bare email address with no display name.
 */
function normalizeFrom(raw: string): string {
  const value = raw.trim()
  const match = value.match(/^(.*?)<\s*([^>]+?)\s*>$/)
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, "")
    const email = match[2].trim()
    return name ? `${name} <${email}>` : email
  }
  // No angle brackets — treat the whole thing as a bare email address.
  return value
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
export async function sendEmail({ to, subject, html, attachments, fromName }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const emailFromEnv = process.env.EMAIL_FROM || "Property HQ <onboarding@resend.dev>"

  // If the caller supplies a fromName, swap the display part of the FROM address.
  let rawFrom = emailFromEnv
  if (fromName) {
    const match = emailFromEnv.match(/<(.+)>/)
    const emailAddr = match ? match[1] : emailFromEnv
    rawFrom = `${fromName} <${emailAddr}>`
  }
  const from = normalizeFrom(rawFrom)

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
