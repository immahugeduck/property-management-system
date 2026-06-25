-- ============================================================
-- REMOVE TENANT RENT-PAYMENT UPDATE POLICY
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- Safe to run multiple times (idempotent).
-- NOTE: Already applied to production on 2026-06-24 — this file
-- exists so version control matches the live database.
-- ============================================================

-- Security hardening: tenants may VIEW their invoices (the
-- rent_payments_select_tenant policy stays in place) but must NOT be able
-- to change payment state. RLS is row-level, not column-level, so the old
-- tenant UPDATE policy allowed a tenant to set status = 'paid' directly via
-- the public anon key — marking their own rent paid without paying. All
-- legitimate payment writes go through service-role server code
-- (Stripe checkout, the Stripe webhook, cron jobs, and manager mark-as-paid).

DROP POLICY IF EXISTS "rent_payments_update_tenant" ON rent_payments;
