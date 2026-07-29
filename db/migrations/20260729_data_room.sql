BEGIN;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS material_usage text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'properties_material_usage_check'
      AND conrelid = 'properties'::regclass
  ) THEN
    ALTER TABLE properties
      ADD CONSTRAINT properties_material_usage_check
      CHECK (material_usage IS NULL OR material_usage IN ('organic', 'paid', 'both'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS tenant_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (id, tenant_id)
);

CREATE TABLE IF NOT EXISTS property_rights_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenant_id text NOT NULL,
  confirmed_by_name text NOT NULL,
  confirmed_by_email text NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  text_version text NOT NULL,
  confirmation_text text NOT NULL,
  material_usage text NOT NULL
    CHECK (material_usage IN ('organic', 'paid', 'both')),
  FOREIGN KEY (property_id, tenant_id)
    REFERENCES properties(id, tenant_id) ON DELETE CASCADE,
  UNIQUE (id, tenant_id)
);

CREATE TABLE IF NOT EXISTS property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenant_id text NOT NULL,
  rights_confirmation_id uuid NOT NULL,
  original_filename text NOT NULL,
  expected_pathname text NOT NULL UNIQUE,
  blob_pathname text,
  blob_url text,
  content_type text NOT NULL
    CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer NOT NULL
    CHECK (byte_size > 0 AND byte_size <= 15728640),
  upload_status text NOT NULL DEFAULT 'pending'
    CHECK (upload_status IN ('pending', 'ready', 'rejected')),
  rejection_reason text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  uploaded_at timestamptz,
  FOREIGN KEY (property_id, tenant_id)
    REFERENCES properties(id, tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (rights_confirmation_id, tenant_id)
    REFERENCES property_rights_confirmations(id, tenant_id) ON DELETE RESTRICT,
  UNIQUE (id, tenant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS property_photos_blob_url_unique_idx
  ON property_photos (blob_url)
  WHERE blob_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS tenant_access_tokens_tenant_active_idx
  ON tenant_access_tokens (tenant_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS property_rights_confirmations_property_idx
  ON property_rights_confirmations (property_id, confirmed_at DESC);

CREATE INDEX IF NOT EXISTS property_photos_property_status_idx
  ON property_photos (property_id, upload_status, created_at DESC);

COMMIT;
