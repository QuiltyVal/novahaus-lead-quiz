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

