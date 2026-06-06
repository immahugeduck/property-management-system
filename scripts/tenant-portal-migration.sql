-- ============================================================
-- TENANT PORTAL MIGRATION
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Link tenant records to their own auth login
-- ------------------------------------------------------------
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_activated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenants_auth_user_id ON tenants(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email_lower ON tenants(LOWER(email));

-- ------------------------------------------------------------
-- 2. Tenant invites (one-time invite tokens)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- manager who sent invite
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | expired
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_token ON tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant_id ON tenant_invites(tenant_id);
ALTER TABLE tenant_invites ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. Recurring invoice + Stripe columns on rent_payments
-- ------------------------------------------------------------
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS recurring_day INT DEFAULT 1; -- day of month invoice issues
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Recurring rent schedules (the "set up once" template per tenant)
CREATE TABLE IF NOT EXISTS rent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  day_of_month INT NOT NULL DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  last_generated_for DATE, -- the month period last generated (first of month)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_tenant_id ON rent_schedules(tenant_id);
ALTER TABLE rent_schedules ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 4. Helper: does the current auth user own this tenant record?
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_of(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = p_tenant_id AND t.auth_user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- 5. RLS POLICIES
-- ------------------------------------------------------------

-- TENANTS: tenant can read & update their own record (limited), manager keeps full access
DROP POLICY IF EXISTS "tenants_select_self" ON tenants;
CREATE POLICY "tenants_select_self" ON tenants
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = auth_user_id);

-- PROPERTIES: tenant can read the property they are assigned to
DROP POLICY IF EXISTS "properties_select_tenant" ON properties;
CREATE POLICY "properties_select_tenant" ON properties
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM tenants t WHERE t.property_id = properties.id AND t.auth_user_id = auth.uid())
  );

-- RENT_PAYMENTS: tenant can read their own invoices/payments
DROP POLICY IF EXISTS "rent_payments_select_tenant" ON rent_payments;
CREATE POLICY "rent_payments_select_tenant" ON rent_payments
  FOR SELECT USING (auth.uid() = user_id OR is_tenant_of(tenant_id));

-- RENT_PAYMENTS: tenant can update payment status fields when paying (scoped to their record)
DROP POLICY IF EXISTS "rent_payments_update_tenant" ON rent_payments;
CREATE POLICY "rent_payments_update_tenant" ON rent_payments
  FOR UPDATE USING (auth.uid() = user_id OR is_tenant_of(tenant_id));

-- MESSAGES: tenant can read & send messages on their own thread
DROP POLICY IF EXISTS "messages_select_tenant" ON messages;
CREATE POLICY "messages_select_tenant" ON messages
  FOR SELECT USING (auth.uid() = user_id OR is_tenant_of(tenant_id));

DROP POLICY IF EXISTS "messages_insert_tenant" ON messages;
CREATE POLICY "messages_insert_tenant" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_tenant_of(tenant_id));

DROP POLICY IF EXISTS "messages_update_tenant" ON messages;
CREATE POLICY "messages_update_tenant" ON messages
  FOR UPDATE USING (auth.uid() = user_id OR is_tenant_of(tenant_id));

-- NOTIFICATIONS already scope by user_id = auth.uid(), which works for tenants too
-- (a tenant notification is inserted with user_id = tenant's auth_user_id)

-- RENT_SCHEDULES: manager full access, tenant read-only
DROP POLICY IF EXISTS "rent_schedules_manager" ON rent_schedules;
CREATE POLICY "rent_schedules_manager" ON rent_schedules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rent_schedules_select_tenant" ON rent_schedules;
CREATE POLICY "rent_schedules_select_tenant" ON rent_schedules
  FOR SELECT USING (auth.uid() = user_id OR is_tenant_of(tenant_id));

-- TENANT_INVITES: only the manager who created them
DROP POLICY IF EXISTS "tenant_invites_manager" ON tenant_invites;
CREATE POLICY "tenant_invites_manager" ON tenant_invites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DONE
-- ============================================================
