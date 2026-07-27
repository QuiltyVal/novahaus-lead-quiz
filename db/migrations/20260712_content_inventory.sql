BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

COMMIT;
