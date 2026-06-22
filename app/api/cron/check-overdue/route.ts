import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createNotification, notificationTemplates } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"
import { overdueEmail, siteUrl } from "@/lib/email-templates"

function verifyCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return request.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  // Find payments that are pending and past their due date.
  const { data: overduePayments, error } = await supabase
    .from("rent_payments")
    .select("*, tenant:tenants(id, first_name, last_name, email, auth_user_id, user_id)")
    .eq("status", "pending")
    .lt("due_date", today)

  if (error) {
    console.error("[cron] check-overdue error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!overduePayments || overduePayments.length === 0) {
    return NextResponse.json({ success: true, updated: 0 })
  }

  let updated = 0

  for (const payment of overduePayments) {
    // Update status to overdue.
    const { error: updateErr } = await supabase
      .from("rent_payments")
      .update({ status: "overdue" })
      .eq("id", payment.id)

    if (updateErr) {
      console.error("[cron] overdue update error:", updateErr.message)
      continue
    }
    updated++

    const tenant = payment.tenant as any
    if (!tenant) continue

    const amount = Number(payment.amount)
    const dueDate = new Date(payment.due_date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    // Notify the manager.
    if (tenant.user_id) {
      const tmpl = notificationTemplates.paymentOverdue(
        `${tenant.first_name} ${tenant.last_name}`,
        amount,
        Math.ceil((Date.now() - new Date(payment.due_date).getTime()) / 86400000)
      )
      await createNotification({
        client: supabase,
        userId: tenant.user_id,
        recipientType: "manager",
        ...tmpl,
        link: "/dashboard/payments",
      }).catch(() => {})
    }

    // Notify the tenant via portal bell + email.
    if (tenant.auth_user_id) {
      await createNotification({
        client: supabase,
        userId: tenant.auth_user_id,
        recipientType: "tenant",
        type: "payment_overdue",
        title: "Payment Overdue",
        message: `Your rent payment of $${amount.toLocaleString()} was due on ${dueDate}. Please pay as soon as possible.`,
        link: "/portal/payments",
      }).catch(() => {})

      if (tenant.email) {
        const tpl = overdueEmail({
          firstName: tenant.first_name,
          amount,
          dueDateLabel: dueDate,
          portalUrl: siteUrl("/portal/payments"),
        })
        await sendEmail({ to: tenant.email, subject: tpl.subject, html: tpl.html }).catch(() => {})
      }
    }
  }

  console.log(`[cron] check-overdue: marked ${updated} payment(s) overdue`)
  return NextResponse.json({ success: true, updated })
}
