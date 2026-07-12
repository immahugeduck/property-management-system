import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createNotification, notificationTemplates } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"
import { leaseExpiringEmail, siteUrl } from "@/lib/email-templates"
import { getFromName } from "@/lib/profile"

function verifyCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // No secret set: allow only outside production so local dev still works.
    // In production a missing secret means DENY, never allow-all.
    return process.env.NODE_ENV !== "production"
  }
  return request.headers.get("authorization") === `Bearer ${secret}`
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch all tenants with a lease end date.
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, first_name, last_name, email, auth_user_id, user_id, lease_end, property:properties(name)")
    .not("lease_end", "is", null)

  if (error) {
    console.error("[cron] lease-alerts error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!tenants || tenants.length === 0) {
    return NextResponse.json({ success: true, alerted: 0 })
  }

  let alerted = 0
  const fromNameCache = new Map<string, string>()

  for (const tenant of tenants) {
    if (!tenant.lease_end) continue

    const days = daysUntil(tenant.lease_end)
    // Supabase types the to-one embed as an array; at runtime it is a single object.
    const propertyName = (tenant.property as unknown as { name: string } | null)?.name || "their unit"

    // Alert windows: 60-day and 30-day. Run weekly so ±3 days is the tolerance.
    const is60Day = days >= 57 && days <= 63
    const is30Day = days >= 27 && days <= 33
    if (!is60Day && !is30Day) continue

    const daysRemaining = is30Day ? 30 : 60
    const leaseEndFormatted = new Date(tenant.lease_end).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    // Notify the manager.
    if (tenant.user_id) {
      const tmpl = notificationTemplates.leaseExpiring(
        `${tenant.first_name} ${tenant.last_name}`,
        propertyName,
        daysRemaining
      )
      await createNotification({
        client: supabase,
        userId: tenant.user_id,
        recipientType: "manager",
        ...tmpl,
        relatedId: tenant.id,
        link: `/dashboard/tenants/${tenant.id}`,
      }).catch(() => {})

      // Email the manager too. A manager's email lives in Supabase auth
      // (auth.users), NOT in user_profiles — so fetch it via the service-role
      // admin API. (The old code queried a non-existent "profiles" table, so
      // this email silently never sent.)
      let managerEmail: string | undefined
      try {
        const { data: managerUser } = await supabase.auth.admin.getUserById(tenant.user_id)
        managerEmail = managerUser?.user?.email ?? undefined
      } catch (err) {
        console.error("[cron] lease-alerts manager lookup error:", err)
      }

      if (managerEmail) {
        const managerId = tenant.user_id as string
        if (!fromNameCache.has(managerId)) {
          fromNameCache.set(managerId, await getFromName(supabase, managerId))
        }
        const fromName = fromNameCache.get(managerId)!
        const tpl = leaseExpiringEmail({
          tenantName: `${tenant.first_name} ${tenant.last_name}`,
          propertyName,
          leaseEndLabel: leaseEndFormatted,
          daysRemaining,
          tenantUrl: siteUrl(`/dashboard/tenants/${tenant.id}`),
        })
        await sendEmail({ to: managerEmail, subject: tpl.subject, html: tpl.html, fromName }).catch(() => {})
      }
    }

    // Also notify the tenant via portal bell (if active).
    if (tenant.auth_user_id) {
      await createNotification({
        client: supabase,
        userId: tenant.auth_user_id,
        recipientType: "tenant",
        type: "lease_expiring",
        title: "Lease Expiring Soon",
        message: `Your lease expires on ${leaseEndFormatted}. Contact your manager to discuss renewal.`,
        link: "/portal",
      }).catch(() => {})
    }

    alerted++
  }

  console.log(`[cron] lease-alerts: sent ${alerted} alert(s)`)
  return NextResponse.json({ success: true, alerted })
}
