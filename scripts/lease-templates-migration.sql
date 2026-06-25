-- ============================================================
-- LEASE TEMPLATES + E-SIGNING MIGRATION
-- Idempotent. Reuses is_tenant_of() from the tenant portal migration.
-- ============================================================

-- Reusable lease templates (e.g. the Indiana Residential Lease). The source PDF
-- lives in the property-files storage bucket; `fields` holds the fillable-field
-- geometry (PDF points, top-left origin).
CREATE TABLE IF NOT EXISTS lease_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  page_count INT NOT NULL DEFAULT 1,
  page_sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  slug TEXT,                      -- stable identifier for the default templates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lease_templates_user_slug
  ON lease_templates(user_id, slug) WHERE slug IS NOT NULL;
ALTER TABLE lease_templates ENABLE ROW LEVEL SECURITY;

-- A lease instance created from a template for a specific tenant.
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES lease_templates(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Lease Agreement',
  status TEXT NOT NULL DEFAULT 'draft',   -- draft | sent | signed | voided
  values JSONB NOT NULL DEFAULT '{}'::jsonb,
  signed_storage_path TEXT,
  signed_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  signer_name TEXT,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leases_user_id ON leases(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_template_id ON leases(template_id);
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- ---------------- RLS POLICIES ----------------

-- Templates: managers manage their own; tenants may read a template referenced by
-- a lease that belongs to them (needed to render the document for signing).
DROP POLICY IF EXISTS "lease_templates_manager" ON lease_templates;
CREATE POLICY "lease_templates_manager" ON lease_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lease_templates_select_tenant" ON lease_templates;
CREATE POLICY "lease_templates_select_tenant" ON lease_templates
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM leases l
      WHERE l.template_id = lease_templates.id AND is_tenant_of(l.tenant_id)
    )
  );

-- Leases: managers manage their own; tenants can read their own and update them
-- only while the lease is out for signature.
DROP POLICY IF EXISTS "leases_manager" ON leases;
CREATE POLICY "leases_manager" ON leases
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "leases_select_tenant" ON leases;
CREATE POLICY "leases_select_tenant" ON leases
  FOR SELECT USING (auth.uid() = user_id OR is_tenant_of(tenant_id));

DROP POLICY IF EXISTS "leases_update_tenant" ON leases;
CREATE POLICY "leases_update_tenant" ON leases
  FOR UPDATE USING (
    auth.uid() = user_id OR (is_tenant_of(tenant_id) AND status = 'sent')
  ) WITH CHECK (
    auth.uid() = user_id OR is_tenant_of(tenant_id)
  );

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_lease_templates_updated ON lease_templates;
CREATE TRIGGER trg_lease_templates_updated BEFORE UPDATE ON lease_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leases_updated ON leases;
CREATE TRIGGER trg_leases_updated BEFORE UPDATE ON leases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
