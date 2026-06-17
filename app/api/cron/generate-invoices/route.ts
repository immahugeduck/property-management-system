import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createNotification, notificationTemplates } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"

function periodLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function verifyCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // allow in dev without a secret
  return request.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodKey = periodStart.toISOString().slice(0, 10)

  const { data: schedules, error } = await supabase
    .from("rent_schedules")
    .select("*, tenant:tenants(id, first_name, last_name, email, auth_user_id), property:properties(id, name)")
    .eq("active", true)

  if (error) {
    console.error("[cron] generate-invoices error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ success: true, created: 0 })
  }

  let created = 0

  for (const s of schedules) {
    // Only generate once the day_of_month has arrived this month.
    if (now.getDate() < (s.day_of_month || 1)) continue
    // Skip if already generated for this month.
    if (s.last_generated_for && s.last_generated_for >= periodKey) continue

    const dueDate = new Date(now.getFullYear(), now.getMonth(), s.day_of_month || 1)
    const receiptBase = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`

    const { error: insErr } = await supabase.from("rent_payments").insert({
      user_id: s.user_id,
      tenant_id: s.tenant_id,
      property_id: s.property_id,
      amount: s.amount,
      due_date: dueDate.toISOString().slice(0, 10),
      status: "pending",
      is_recurring: true,
      recurring_day: s.day_of_month,
      rent_schedule_id: s.id,
      receipt_number: `${receiptBase}-${s.tenant_id.slice(0, 6)}`,
    })

    if (insErr) {
      console.error("[cron] invoice insert error:", insErr.message)
      continue
    }

    await supabase.from("rent_schedules").update({ last_generated_for: periodKey }).eq("id", s.id)
    created++

    const tenant = s.tenant as any
    const label = periodLabel(periodStart)

    if (tenant?.auth_user_id) {
      const tmpl = notificationTemplates.invoiceIssued(s.amount, label)
      await createNotification({
        client: supabase,
        userId: tenant.auth_user_id,
        recipientType: "tenant",
        ...tmpl,
        link: "/portal/payments",
      }).catch(() => {})

      if (tenant.email) {
        const money = `$${Number(s.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        await sendEmail({
          to: tenant.email,
          subject: `New Rent Invoice — ${label}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1f25;">
              <h1 style="font-size:20px;">Property HQ — New Invoice</h1>
              <p>Hi ${tenant.first_name},</p>
              <p>Your rent invoice of <strong>${money}</strong> for <strong>${label}</strong> is ready.</p>
              <p style="margin:24px 0;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/portal/payments"
                   style="background:#1f8f6b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;display:inline-block;">
                  View &amp; Pay Invoice
                </a>
              </p>
              <p style="color:#6b7280;font-size:12px;">Log in to your tenant portal to pay online.</p>
            </div>`,
        }).catch(() => {})
      }
    }
  }

  console.log(`[cron] generate-invoices: created ${created} invoice(s)`)
  return NextResponse.json({ success: true, created })
}
