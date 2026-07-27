BEGIN;

INSERT INTO tenants (id, name)
VALUES
  ('augenblick', 'Augenblick Leads'),
  ('novahaus', 'NovaHaus Immobilien')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO projects (id, tenant_id, name)
VALUES
  ('augenblick-organic', 'augenblick', 'Augenblick Organic Channel'),
  ('leipzig-owner-apartments', 'novahaus', 'NovaHaus Immobilien')
ON CONFLICT (id) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    updated_at = now();

INSERT INTO content_accounts (id, owner_tenant_id, platform, handle, display_name)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'augenblick',
  'instagram',
  'augenblickleads',
  '@augenblickleads'
)
ON CONFLICT (id) DO UPDATE
SET owner_tenant_id = EXCLUDED.owner_tenant_id,
    handle = EXCLUDED.handle,
    display_name = EXCLUDED.display_name,
    status = 'active';

INSERT INTO properties (
  id, tenant_id, project_id, external_key, title, city,
  status, photo_rights_status, notes
)
VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'novahaus',
    'leipzig-owner-apartments',
    '3-zimmer',
    '3-Zimmer mit Garten',
    'Leipzig',
    'active',
    'not_required',
    'Bestehende Demo-Option des NovaHaus-Quiz.'
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'novahaus',
    'leipzig-owner-apartments',
    '4-zimmer',
    '4-Zimmer mit Dachterrasse',
    'Leipzig',
    'active',
    'not_required',
    'Bestehende Demo-Option des NovaHaus-Quiz.'
  )
ON CONFLICT (tenant_id, external_key) DO UPDATE
SET title = EXCLUDED.title,
    project_id = EXCLUDED.project_id,
    status = EXCLUDED.status,
    photo_rights_status = EXCLUDED.photo_rights_status,
    notes = EXCLUDED.notes;

INSERT INTO videos (
  id, tenant_id, reel_code, title, purpose, format_slug,
  pillar_slugs, cta_type, manifest_path, final_file_path, status, notes
)
VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    'augenblick',
    'reel-001',
    'Brick / facade baseline',
    'engagement',
    'architecture_mood',
    ARRAY['beauty_mood', 'spaces_architecture'],
    'none',
    'nova-haus-organic-engine/editor/manifests/reel-001-altbau-licht-ruhe-instagram-audio.json',
    'nova-haus-organic-engine/editor/renders/reel-001-altbau-licht-ruhe-instagram-audio.mp4',
    'published',
    'Первый опубликованный baseline Reel; публичный caption отсутствует.'
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'augenblick',
    'schoenes-leipzig',
    'Schönes Leipzig',
    'engagement',
    'leipzig_mood',
    ARRAY['beauty_mood', 'leipzig_local'],
    'none',
    NULL,
    NULL,
    'published',
    'Для опубликованного файла не найден однозначный локальный manifest.'
  ),
  (
    'c0000000-0000-4000-8000-000000000003',
    'augenblick',
    'reel-002',
    'House → apartment → Leipzig',
    'engagement',
    'pov_journey',
    ARRAY['beauty_mood', 'production_proof'],
    'none',
    'nova-haus-organic-engine/editor/manifests/reel-002-final-candidate-v2-joris29-finalquiet.md',
    'nova-haus-organic-engine/editor/renders/reel-002-final-candidate-v2-joris29-finalquiet.mp4',
    'published',
    NULL
  ),
  (
    'c0000000-0000-4000-8000-000000000004',
    'augenblick',
    'reel-004',
    'Räume. Licht. Leipzig.',
    'engagement',
    'before_after',
    ARRAY['production_proof', 'visual_transformation'],
    'soft_engagement',
    'nova-haus-organic-engine/editor/manifests/reel-004-staging-manual-upload.json',
    'nova-haus-organic-engine/editor/renders/manual-upload/reel-004-staging-clean.mp4',
    'published',
    NULL
  ),
  (
    'c0000000-0000-4000-8000-000000000005',
    'augenblick',
    'reel-005',
    'Vom Eingang bis über die Dächer',
    'engagement',
    'pov_tour',
    ARRAY['beauty_mood', 'production_proof'],
    'forced_choice_comment',
    'nova-haus-organic-engine/editor/manifests/reel-005-altbau-fpv-leipzig-manual-upload.json',
    'nova-haus-organic-engine/editor/renders/manual-upload/reel-005-altbau-fpv-leipzig-clean.mp4',
    'published',
    NULL
  )
ON CONFLICT (tenant_id, reel_code) DO UPDATE
SET title = EXCLUDED.title,
    purpose = EXCLUDED.purpose,
    format_slug = EXCLUDED.format_slug,
    pillar_slugs = EXCLUDED.pillar_slugs,
    cta_type = EXCLUDED.cta_type,
    manifest_path = EXCLUDED.manifest_path,
    final_file_path = EXCLUDED.final_file_path,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes;

INSERT INTO social_posts (
  id, tenant_id, account_id, video_id, permalink, caption, cta,
  published_on, publish_method, status
)
VALUES
  (
    'd0000000-0000-4000-8000-000000000001',
    'augenblick',
    'a0000000-0000-4000-8000-000000000001',
    (SELECT id FROM videos WHERE tenant_id = 'augenblick' AND reel_code = 'reel-001'),
    'https://www.instagram.com/augenblickleads/reel/DadYt-7s1CC/',
    NULL,
    NULL,
    '2026-07-06',
    'backfill',
    'published'
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'augenblick',
    'a0000000-0000-4000-8000-000000000001',
    (SELECT id FROM videos WHERE tenant_id = 'augenblick' AND reel_code = 'schoenes-leipzig'),
    'https://www.instagram.com/augenblickleads/reel/DahhWZuM7yJ/',
    $$Schönes Leipzig
😍

#leipzig #plagwitz #altbau$$,
    NULL,
    '2026-07-08',
    'backfill',
    'published'
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    'augenblick',
    'a0000000-0000-4000-8000-000000000001',
    (SELECT id FROM videos WHERE tenant_id = 'augenblick' AND reel_code = 'reel-002'),
    'https://www.instagram.com/augenblickleads/reel/DakU-hqM60K/',
    '#leipzig #altbau #connewitz',
    NULL,
    '2026-07-09',
    'backfill',
    'published'
  ),
  (
    'd0000000-0000-4000-8000-000000000004',
    'augenblick',
    'a0000000-0000-4000-8000-000000000001',
    (SELECT id FROM videos WHERE tenant_id = 'augenblick' AND reel_code = 'reel-004'),
    'https://www.instagram.com/augenblickleads/reel/DamwQsFszrd/',
    $$Vorher leer. Nachher vorstellbar.

Leipzig ist mehr als eine Adresse.
Es ist Licht, Raum und die Vorstellung davon,
wie sich ein Zuhause anfühlen könnte.

KI-Visualisierung.

#leipzig #immobilienleipzig #altbau
#wohneninleipzig #plagwitz$$,
    'soft_engagement',
    '2026-07-10',
    'backfill',
    'published'
  ),
  (
    'd0000000-0000-4000-8000-000000000005',
    'augenblick',
    'a0000000-0000-4000-8000-000000000001',
    (SELECT id FROM videos WHERE tenant_id = 'augenblick' AND reel_code = 'reel-005'),
    'https://www.instagram.com/augenblickleads/reel/DaqJnYlMu4Z/',
    $$Eine Altbau-Besichtigung, die nicht an der Wohnungstür endet.

Welcher Moment bleibt dir im Kopf — die Tür, der Rundgang oder der Blick über Leipzig?

KI-Visualisierung.

#leipzig #immobilienleipzig #altbau #immobilienmarketing #visualisierung$$,
    'forced_choice_comment',
    '2026-07-11',
    'backfill',
    'published'
  )
ON CONFLICT (permalink) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    account_id = EXCLUDED.account_id,
    video_id = EXCLUDED.video_id,
    caption = EXCLUDED.caption,
    cta = EXCLUDED.cta,
    published_on = EXCLUDED.published_on,
    status = EXCLUDED.status;

INSERT INTO post_metric_snapshots (
  id, post_id, captured_at, window_label, views, reach, likes, comments,
  saves, shares, follows, profile_activity, source, note, raw
)
VALUES
  (
    'e0000000-0000-4000-8000-000000000001',
    (SELECT id FROM social_posts WHERE permalink = 'https://www.instagram.com/augenblickleads/reel/DadYt-7s1CC/'),
    '2026-07-09T12:00:00+02:00',
    'backfill',
    145, 127, 0, 0, 0, 0, 0, 0,
    'wiki_backfill',
    'Scorecard reported this snapshot at an age of about 3 days; exact capture time was not recorded.',
    '{"observed_age":"3 days"}'::jsonb
  ),
  (
    'e0000000-0000-4000-8000-000000000002',
    (SELECT id FROM social_posts WHERE permalink = 'https://www.instagram.com/augenblickleads/reel/DahhWZuM7yJ/'),
    '2026-07-09T12:00:00+02:00',
    'backfill',
    365, 128, 2, 0, 0, 0, 0, 0,
    'wiki_backfill',
    'Scorecard reported this snapshot at an age of about 1 day; exact capture time was not recorded.',
    '{"observed_age":"1 day","facebook_reactions":2}'::jsonb
  ),
  (
    'e0000000-0000-4000-8000-000000000003',
    (SELECT id FROM social_posts WHERE permalink = 'https://www.instagram.com/augenblickleads/reel/DakU-hqM60K/'),
    '2026-07-09T20:00:00+02:00',
    'backfill',
    287, 139, 2, 0, 0, 0, 0, 0,
    'wiki_backfill',
    'Scorecard reported this snapshot at an age of about 8 hours; capture time is approximate.',
    '{"observed_age":"8 hours"}'::jsonb
  ),
  (
    'e0000000-0000-4000-8000-000000000004',
    (SELECT id FROM social_posts WHERE permalink = 'https://www.instagram.com/augenblickleads/reel/DamwQsFszrd/'),
    '2026-07-12T09:58:00+02:00',
    'backfill',
    NULL, NULL, 4, 0, NULL, NULL, NULL, NULL,
    'instagram_public',
    'Public profile snapshot; private Insights were not available.',
    '{"partial":true}'::jsonb
  ),
  (
    'e0000000-0000-4000-8000-000000000005',
    (SELECT id FROM social_posts WHERE permalink = 'https://www.instagram.com/augenblickleads/reel/DaqJnYlMu4Z/'),
    '2026-07-12T09:58:00+02:00',
    'backfill',
    NULL, NULL, 1, 0, NULL, NULL, NULL, NULL,
    'instagram_public',
    'Public profile snapshot; private Insights were not available.',
    '{"partial":true}'::jsonb
  )
ON CONFLICT (id) DO UPDATE
SET post_id = EXCLUDED.post_id,
    captured_at = EXCLUDED.captured_at,
    window_label = EXCLUDED.window_label,
    views = EXCLUDED.views,
    reach = EXCLUDED.reach,
    likes = EXCLUDED.likes,
    comments = EXCLUDED.comments,
    saves = EXCLUDED.saves,
    shares = EXCLUDED.shares,
    follows = EXCLUDED.follows,
    profile_activity = EXCLUDED.profile_activity,
    source = EXCLUDED.source,
    note = EXCLUDED.note,
    raw = EXCLUDED.raw;

COMMIT;
