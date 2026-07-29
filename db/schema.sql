CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  lead_id uuid PRIMARY KEY,
  tenant_id text NOT NULL,
  project_id text NOT NULL,
  created_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  status text NOT NULL,
  segment text NOT NULL,
  priority text NOT NULL,

  first_name text,
  last_name text,
  name text,
  email text,
  phone text,

  wohnung text,
  wohnung_label text,
  purchase_timeline text,
  purchase_timeline_label text,
  equity_bucket text,
  equity_bucket_label text,
  financing_status text,
  financing_status_label text,

  score text,
  original_score text,
  underqualified boolean NOT NULL DEFAULT false,
  next_action text,
  next_best_action text,
  followup_due_at timestamptz,
  assigned_to text,
  handoff_required boolean NOT NULL DEFAULT false,
  handoff_reason text,
  qualification_reason text,
  lead_summary text,

  consent_contact boolean NOT NULL DEFAULT false,
  consent_data_processing boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz,
  consent_ip text,
  consent_user_agent text,

  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  raw jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  provider text NOT NULL DEFAULT 'template',
  model text,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft_created',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_tenant_project_created_idx
  ON leads (tenant_id, project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS leads_segment_status_idx
  ON leads (segment, status);

CREATE INDEX IF NOT EXISTS lead_events_lead_created_idx
  ON lead_events (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS email_drafts_lead_created_idx
  ON email_drafts (lead_id, created_at DESC);

-- Content inventory, object attribution, and manual Instagram Insights snapshots.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS content_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_tenant_id text REFERENCES tenants(id),
  platform text NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram')),
  handle text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  timezone text NOT NULL DEFAULT 'Europe/Berlin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, owner_tenant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS content_accounts_platform_handle_unique_idx
  ON content_accounts (platform, lower(handle));

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id),
  project_id text REFERENCES projects(id),
  external_key text NOT NULL,
  title text NOT NULL,
  address_label text,
  district text,
  city text NOT NULL DEFAULT 'Leipzig',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'reserved', 'sold', 'archived')),
  photo_rights_status text NOT NULL DEFAULT 'open'
    CHECK (photo_rights_status IN ('open', 'requested', 'confirmed', 'not_required', 'blocked')),
  sold_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, external_key),
  UNIQUE (id, tenant_id)
);

CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id),
  reel_code text NOT NULL,
  title text NOT NULL,
  purpose text NOT NULL
    CHECK (purpose IN ('engagement', 'property', 'conversion', 'b2b_demo')),
  format_slug text NOT NULL,
  pillar_slugs text[] NOT NULL DEFAULT '{}',
  content_class text
    CHECK (content_class IS NULL OR content_class IN (
      'mood-silent', 'mood-vo', 'transform', 'local-fact',
      'utility', 'avatar', 'narrative', 'ad-style'
    )),
  hypothesis text,
  cta_type text,
  manifest_path text,
  final_file_path text,
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'ready', 'published', 'archived')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, reel_code),
  UNIQUE (id, tenant_id)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id),
  account_id uuid NOT NULL REFERENCES content_accounts(id),
  video_id uuid NOT NULL,
  permalink text NOT NULL UNIQUE,
  platform_media_id text,
  caption text,
  cta text,
  tracking_key text,
  published_on date NOT NULL,
  published_at timestamptz,
  publish_method text NOT NULL DEFAULT 'manual'
    CHECK (publish_method IN ('manual', 'api', 'backfill')),
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'removed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (video_id, tenant_id) REFERENCES videos(id, tenant_id),
  UNIQUE (id, tenant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS social_posts_account_media_unique_idx
  ON social_posts (account_id, platform_media_id)
  WHERE platform_media_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS social_posts_tenant_tracking_key_unique_idx
  ON social_posts (tenant_id, tracking_key)
  WHERE tracking_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS post_properties (
  post_id uuid NOT NULL,
  property_id uuid NOT NULL,
  tenant_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, property_id),
  FOREIGN KEY (post_id, tenant_id) REFERENCES social_posts(id, tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (property_id, tenant_id) REFERENCES properties(id, tenant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  window_label text NOT NULL DEFAULT 'manual'
    CHECK (window_label IN ('24h', '72h', '7d', '30d', 'manual', 'backfill')),
  views integer CHECK (views IS NULL OR views >= 0),
  reach integer CHECK (reach IS NULL OR reach >= 0),
  likes integer CHECK (likes IS NULL OR likes >= 0),
  comments integer CHECK (comments IS NULL OR comments >= 0),
  saves integer CHECK (saves IS NULL OR saves >= 0),
  shares integer CHECK (shares IS NULL OR shares >= 0),
  follows integer CHECK (follows IS NULL OR follows >= 0),
  profile_activity integer CHECK (profile_activity IS NULL OR profile_activity >= 0),
  website_clicks integer CHECK (website_clicks IS NULL OR website_clicks >= 0),
  watch_time_seconds numeric CHECK (watch_time_seconds IS NULL OR watch_time_seconds >= 0),
  average_watch_time_seconds numeric CHECK (average_watch_time_seconds IS NULL OR average_watch_time_seconds >= 0),
  source text NOT NULL DEFAULT 'manual_insights',
  note text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_metric_snapshots_post_captured_idx
  ON post_metric_snapshots (post_id, captured_at DESC, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS leads_id_tenant_unique_idx
  ON leads (lead_id, tenant_id);

CREATE TABLE IF NOT EXISTS lead_properties (
  lead_id uuid NOT NULL,
  property_id uuid NOT NULL,
  tenant_id text NOT NULL,
  source text NOT NULL DEFAULT 'quiz_selection',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, property_id),
  FOREIGN KEY (lead_id, tenant_id) REFERENCES leads(lead_id, tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (property_id, tenant_id) REFERENCES properties(id, tenant_id) ON DELETE CASCADE
);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source_post_id uuid REFERENCES social_posts(id);

CREATE INDEX IF NOT EXISTS properties_tenant_status_idx
  ON properties (tenant_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS videos_tenant_purpose_idx
  ON videos (tenant_id, purpose, updated_at DESC);

CREATE INDEX IF NOT EXISTS social_posts_tenant_published_idx
  ON social_posts (tenant_id, published_on DESC);

CREATE INDEX IF NOT EXISTS post_properties_property_idx
  ON post_properties (property_id, post_id);

CREATE INDEX IF NOT EXISTS lead_properties_property_idx
  ON lead_properties (property_id, lead_id);

DROP TRIGGER IF EXISTS content_accounts_updated_at ON content_accounts;
CREATE TRIGGER content_accounts_updated_at
BEFORE UPDATE ON content_accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at
BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS videos_updated_at ON videos;
CREATE TRIGGER videos_updated_at
BEFORE UPDATE ON videos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS social_posts_updated_at ON social_posts;
CREATE TRIGGER social_posts_updated_at
BEFORE UPDATE ON social_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Token-gated customer Data Room for object metadata, rights evidence, and photos.
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
