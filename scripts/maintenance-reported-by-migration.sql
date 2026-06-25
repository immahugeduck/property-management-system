-- Adds a free-text "reported by" name to maintenance requests so a request can
-- record who reported the issue when it wasn't a tenant in the system
-- (e.g. a maintenance worker, lawn crew, or other third party).
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS reported_by_name text;
