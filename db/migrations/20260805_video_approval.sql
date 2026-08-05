BEGIN;

-- A reel belongs to an object long before it is published. Until now the link
-- video -> property existed only through post_properties, which is written
-- after publishing: exactly the wrong side of the client's decision.
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS property_id uuid,
  ADD COLUMN IF NOT EXISTS preview_blob_pathname text,
  ADD COLUMN IF NOT EXISTS preview_blob_url text,
  ADD COLUMN IF NOT EXISTS client_review_status text NOT NULL DEFAULT 'not_requested';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'videos_property_fkey' AND conrelid = 'videos'::regclass
  ) THEN
    ALTER TABLE videos
      ADD CONSTRAINT videos_property_fkey
      FOREIGN KEY (property_id, tenant_id)
      REFERENCES properties(id, tenant_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'videos_client_review_status_check' AND conrelid = 'videos'::regclass
  ) THEN
    ALTER TABLE videos
      ADD CONSTRAINT videos_client_review_status_check
      CHECK (client_review_status IN ('not_requested', 'pending', 'approved', 'rework'));
  END IF;

  -- Showing a reel to the client requires both halves: whose object it is, and
  -- a URL the browser can actually play. Neither alone is enough.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'videos_reviewable_check' AND conrelid = 'videos'::regclass
  ) THEN
    ALTER TABLE videos
      ADD CONSTRAINT videos_reviewable_check
      CHECK (
        client_review_status = 'not_requested'
        OR (property_id IS NOT NULL AND preview_blob_url IS NOT NULL)
      );
  END IF;
END;
$$;

-- Every decision is kept, not overwritten: "переделать" followed by "подходит"
-- is two rows, and the note that caused the rework stays readable afterwards.
CREATE TABLE IF NOT EXISTS video_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  tenant_id text NOT NULL,
  decision text NOT NULL
    CHECK (decision IN ('approved', 'rework')),
  note text,
  decided_by_name text NOT NULL,
  decided_by_email text NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  text_version text NOT NULL,
  decision_text text NOT NULL,
  FOREIGN KEY (video_id, tenant_id)
    REFERENCES videos(id, tenant_id) ON DELETE CASCADE,
  UNIQUE (id, tenant_id)
);

-- A rework request without a note is a dead end for the operator: nothing to
-- act on, and the client is already gone.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'video_approvals_rework_note_check'
      AND conrelid = 'video_approvals'::regclass
  ) THEN
    ALTER TABLE video_approvals
      ADD CONSTRAINT video_approvals_rework_note_check
      CHECK (decision = 'approved' OR length(btrim(coalesce(note, ''))) > 0);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS videos_property_review_idx
  ON videos (property_id, client_review_status, updated_at DESC)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS video_approvals_video_idx
  ON video_approvals (video_id, decided_at DESC);

COMMIT;
