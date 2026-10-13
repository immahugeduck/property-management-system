import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
if (!rawSecretKeys) throw new Error("SUPABASE_SECRET_KEYS is required");

const secretKeys = JSON.parse(rawSecretKeys) as Record<string, string>;
const secretKeyName = Object.keys(secretKeys)[0];
if (!secretKeyName) throw new Error("No secret key found in SUPABASE_SECRET_KEYS");
const supabaseSecretKey = secretKeys[secretKeyName];
if (!supabaseSecretKey) throw new Error("Resolved secret key is empty");

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function firstDayOfCurrentMonthUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dueDate = firstDayOfCurrentMonthUTC();
  const dueDateISO = toISODate(dueDate);

  const { data: schedules, error: scheduleError } = await supabase
    .from("rent_schedules")
    .select("id, user_id, tenant_id, property_id, amount, day_of_month, active")
    .eq("active", true)
    .eq("day_of_month", 1);

  if (scheduleError) {
    return new Response(JSON.stringify({ error: scheduleError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!schedules || schedules.length === 0) {
    return new Response(
      JSON.stringify({ message: "No active day-1 schedules found", created: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const tenantIds = schedules.map((s) => s.tenant_id);

  const { data: existingPayments, error: existingError } = await supabase
    .from("rent_payments")
    .select("tenant_id")
    .eq("due_date", dueDateISO)
    .in("tenant_id", tenantIds);

  if (existingError) {
    return new Response(JSON.stringify({ error: existingError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const alreadyCreatedTenantIds = new Set((existingPayments ?? []).map((p) => p.tenant_id));

  const rowsToInsert = schedules
    .filter((s) => !alreadyCreatedTenantIds.has(s.tenant_id))
    .map((s) => ({
      user_id: s.user_id,
      tenant_id: s.tenant_id,
      property_id: s.property_id,
      amount: s.amount,
      due_date: dueDateISO,
      status: "pending",
      is_recurring: true,
      recurring_day: 1,
      rent_schedule_id: s.id,
      notes: `Auto-generated monthly rent for ${dueDateISO}`,
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("rent_payments")
      .insert(rowsToInsert);

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(
    JSON.stringify({
      message: "Monthly rent payments processed",
      due_date: dueDateISO,
      found_schedules: schedules.length,
      created: rowsToInsert.length,
      skipped_existing: schedules.length - rowsToInsert.length,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
