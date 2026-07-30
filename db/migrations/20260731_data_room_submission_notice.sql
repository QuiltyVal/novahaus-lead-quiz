BEGIN;

-- A finished client submission had no trace of having been announced, so the
-- operator learned about uploaded material only by opening the admin by chance.
--
-- The column is what makes the announcement happen exactly once: photos finish
-- concurrently, and without a claim that only one caller can win, the last two
-- uploads of a submission would each decide it was complete.
ALTER TABLE property_rights_confirmations
  ADD COLUMN IF NOT EXISTS submission_notified_at timestamptz;

COMMIT;
