BEGIN;

-- Growth-Lab metadata belongs to the reusable video record, not a single
-- publication or metric snapshot. Both columns stay nullable so historical
-- videos and non-Growth-Lab tenants remain backwards compatible.
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS content_class text,
  ADD COLUMN IF NOT EXISTS hypothesis text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'videos_content_class_check'
      AND conrelid = 'videos'::regclass
  ) THEN
    ALTER TABLE videos
      ADD CONSTRAINT videos_content_class_check
      CHECK (content_class IS NULL OR content_class IN (
        'mood-silent', 'mood-vo', 'transform', 'local-fact',
        'utility', 'avatar', 'narrative', 'ad-style'
      ));
  END IF;
END;
$$;

-- Historical classification only. Hypothesis intentionally remains NULL:
-- none of these entries was preregistered under Growth Lab.
UPDATE videos
SET content_class = CASE reel_code
  WHEN 'reel-001' THEN 'mood-silent'
  WHEN 'reel-002' THEN 'narrative'
  WHEN 'reel-003' THEN 'mood-silent'
  WHEN 'schoenes-leipzig' THEN 'mood-silent' -- published alias for legacy 003
  WHEN 'reel-004' THEN 'transform'
  WHEN 'reel-005' THEN 'ad-style'
  WHEN 'reel-006' THEN 'avatar'
  WHEN 'reel-007' THEN 'transform'
  WHEN 'reel-008' THEN 'mood-silent'
  WHEN 'reel-009' THEN 'transform'
  WHEN 'reel-010' THEN 'transform'
  WHEN 'reel-011' THEN 'avatar'
  WHEN 'reel-012' THEN 'local-fact'
  WHEN 'reel-013' THEN 'utility'
  WHEN 'reel-014' THEN 'ad-style'
  WHEN 'reel-015' THEN 'local-fact'
  ELSE content_class
END
WHERE tenant_id = 'augenblick'
  AND reel_code IN (
    'reel-001', 'reel-002', 'reel-003', 'schoenes-leipzig',
    'reel-004', 'reel-005', 'reel-006', 'reel-007', 'reel-008',
    'reel-009', 'reel-010', 'reel-011', 'reel-012', 'reel-013',
    'reel-014', 'reel-015'
  );

COMMIT;
