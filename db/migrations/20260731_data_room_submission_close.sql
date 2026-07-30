BEGIN;

-- A submission is a package: the client fills the form once, and the browser
-- transfers every photo of that package in one go. Until now the server had no
-- record of that package ever ending, so "finished" had to be guessed from the
-- state of individual files -- which cannot tell a client who delivered
-- everything from one whose phone locked halfway through.
--
-- closed_at is that missing fact. It is set either by the browser at the end of
-- the submission or by the sweep once the upload window has passed, and the
-- reason records which of the two it was. notified_at is claimed separately, so
-- a closed package is announced exactly once.
ALTER TABLE property_rights_confirmations
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_reason text,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'property_rights_confirmations_closed_check'
      AND conrelid = 'property_rights_confirmations'::regclass
  ) THEN
    ALTER TABLE property_rights_confirmations
      ADD CONSTRAINT property_rights_confirmations_closed_check
      CHECK (
        (closed_at IS NULL AND closed_reason IS NULL)
        OR (closed_at IS NOT NULL AND closed_reason IN ('client_submitted', 'timed_out'))
      );
  END IF;
END;
$$;

-- Announcing a package that is still open would report a submission in progress.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'property_rights_confirmations_notified_check'
      AND conrelid = 'property_rights_confirmations'::regclass
  ) THEN
    ALTER TABLE property_rights_confirmations
      ADD CONSTRAINT property_rights_confirmations_notified_check
      CHECK (notified_at IS NULL OR closed_at IS NOT NULL);
  END IF;
END;
$$;

-- The sweep looks for open packages; the notice looks for closed ones nobody
-- has been told about. Both are a small slice of a table that only grows.
CREATE INDEX IF NOT EXISTS property_rights_confirmations_open_idx
  ON property_rights_confirmations (confirmed_at)
  WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS property_rights_confirmations_unnotified_idx
  ON property_rights_confirmations (closed_at)
  WHERE closed_at IS NOT NULL AND notified_at IS NULL;

COMMIT;
