import { isDatabaseConfigured, query, withTransaction } from '@/lib/db'
import {
  normalizeContentClass,
  normalizeGrowthHypothesis,
  normalizeInstagramHandle,
  normalizeInstagramPermalink,
  normalizeMetricWindow,
  normalizeOptionalText,
  normalizePillarSlugs,
  normalizePurpose,
  normalizeRequiredText,
  normalizeSlug,
  normalizeUuidList,
  parseNullableNonNegativeInteger,
  parseNullableNonNegativeNumber,
  PHOTO_RIGHTS_STATUSES,
  PROPERTY_STATUSES,
} from '@/lib/contentValidation'

export { isDatabaseConfigured }

function normalizeDate(value, field) {
  const normalized = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`${field} is invalid`)
  return normalized
}

function normalizeOptionalDateTime(value, field) {
  const normalized = String(value || '').trim()
  if (!normalized) return null
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field} is invalid`)
  return parsed.toISOString()
}

function assertConfigured() {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL is not configured')
}

export async function listClients() {
  if (!isDatabaseConfigured()) return { configured: false, clients: [] }

  const { rows } = await query(`
    SELECT
      t.id,
      t.name,
      t.created_at,
      COALESCE((SELECT count(*)::int FROM projects pr WHERE pr.tenant_id = t.id), 0) AS project_count,
      COALESCE((SELECT count(*)::int FROM content_accounts ca WHERE ca.owner_tenant_id = t.id AND ca.status <> 'archived'), 0) AS account_count,
      COALESCE((SELECT count(*)::int FROM properties p WHERE p.tenant_id = t.id AND p.status <> 'archived'), 0) AS property_count,
      COALESCE(content_stats.post_count, 0) AS post_count,
      content_stats.views,
      content_stats.reach,
      content_stats.likes,
      content_stats.saves,
      content_stats.shares,
      COALESCE((SELECT count(*)::int FROM leads l WHERE l.tenant_id = t.id), 0) AS lead_count
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT
        count(*)::int AS post_count,
        sum(latest.views)::bigint AS views,
        sum(latest.reach)::bigint AS reach,
        sum(latest.likes)::bigint AS likes,
        sum(latest.saves)::bigint AS saves,
        sum(latest.shares)::bigint AS shares
      FROM social_posts sp
      LEFT JOIN LATERAL (
        SELECT pms.views, pms.reach, pms.likes, pms.saves, pms.shares
        FROM post_metric_snapshots pms
        WHERE pms.post_id = sp.id
        ORDER BY pms.captured_at DESC, pms.created_at DESC
        LIMIT 1
      ) latest ON true
      WHERE sp.tenant_id = t.id AND sp.status = 'published'
    ) content_stats ON true
    ORDER BY t.name ASC
  `)

  return { configured: true, clients: rows }
}

export async function listProjects() {
  if (!isDatabaseConfigured()) return []
  const { rows } = await query(`
    SELECT id, tenant_id, name
    FROM projects
    ORDER BY tenant_id ASC, name ASC
  `)
  return rows
}

export async function listContentAccounts() {
  if (!isDatabaseConfigured()) return []
  const { rows } = await query(`
    SELECT ca.*, t.name AS owner_name
    FROM content_accounts ca
    LEFT JOIN tenants t ON t.id = ca.owner_tenant_id
    WHERE ca.status <> 'archived'
    ORDER BY ca.platform ASC, ca.handle ASC
  `)
  return rows
}

export async function createClient({
  clientId,
  clientName,
  projectId,
  projectName,
  instagramHandle,
}) {
  assertConfigured()
  const tenantId = normalizeSlug(clientId, 'client ID')
  const name = normalizeRequiredText(clientName, 'client name', 160)
  const normalizedProjectId = normalizeSlug(projectId || `${tenantId}-content`, 'project ID')
  const normalizedProjectName = normalizeRequiredText(projectName || `${name} Content`, 'project name', 160)
  const handle = normalizeInstagramHandle(instagramHandle)

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO tenants (id, name) VALUES ($1, $2)`,
      [tenantId, name]
    )
    await client.query(
      `INSERT INTO projects (id, tenant_id, name) VALUES ($1, $2, $3)`,
      [normalizedProjectId, tenantId, normalizedProjectName]
    )

    let account = null
    if (handle) {
      const accountResult = await client.query(
        `
          INSERT INTO content_accounts (owner_tenant_id, platform, handle, display_name)
          VALUES ($1, 'instagram', $2, $3)
          RETURNING *
        `,
        [tenantId, handle, `@${handle}`]
      )
      account = accountResult.rows[0]
    }

    return {
      client: { id: tenantId, name },
      project: { id: normalizedProjectId, name: normalizedProjectName },
      account,
    }
  })
}

export async function createProperty({
  tenantId,
  projectId,
  externalKey,
  title,
  addressLabel,
  district,
  city,
  status,
  photoRightsStatus,
  notes,
}) {
  assertConfigured()
  const normalizedTenantId = normalizeSlug(tenantId, 'client ID')
  const normalizedProjectId = normalizeSlug(projectId, 'project ID')
  const normalizedExternalKey = normalizeSlug(externalKey, 'object key')
  const normalizedStatus = String(status || 'draft')
  const normalizedRightsStatus = String(photoRightsStatus || 'open')

  if (!PROPERTY_STATUSES.includes(normalizedStatus)) throw new Error('Object status is invalid')
  if (!PHOTO_RIGHTS_STATUSES.includes(normalizedRightsStatus)) throw new Error('Photo rights status is invalid')

  return withTransaction(async (client) => {
    const projectResult = await client.query(
      `SELECT id FROM projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [normalizedProjectId, normalizedTenantId]
    )
    if (!projectResult.rows[0]) throw new Error('Project does not belong to the selected client')

    const result = await client.query(
      `
        INSERT INTO properties (
          tenant_id, project_id, external_key, title, address_label,
          district, city, status, photo_rights_status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        normalizedTenantId,
        normalizedProjectId,
        normalizedExternalKey,
        normalizeRequiredText(title, 'object title', 200),
        normalizeOptionalText(addressLabel, 300),
        normalizeOptionalText(district, 120),
        normalizeOptionalText(city, 120) || 'Leipzig',
        normalizedStatus,
        normalizedRightsStatus,
        normalizeOptionalText(notes, 4000),
      ]
    )
    return result.rows[0]
  })
}

export async function listContentExperiments({ tenantId = '' } = {}) {
  if (!isDatabaseConfigured()) return { configured: false, experiments: [] }

  const values = []
  const conditions = [`v.status IN ('draft', 'ready')`]
  if (tenantId) {
    values.push(tenantId)
    conditions.push(`v.tenant_id = $${values.length}`)
  }

  const { rows } = await query(
    `
      SELECT
        v.id,
        v.tenant_id,
        v.reel_code,
        v.title,
        v.content_class,
        v.hypothesis,
        v.status,
        v.created_at,
        v.updated_at,
        t.name AS client_name
      FROM videos v
      JOIN tenants t ON t.id = v.tenant_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY v.updated_at DESC, v.reel_code ASC
    `,
    values
  )

  return { configured: true, experiments: rows }
}

export async function preregisterContentExperiment({
  tenantId,
  reelCode,
  title,
  contentClass,
  hypothesis,
}) {
  assertConfigured()
  const payload = {
    tenantId: normalizeSlug(tenantId, 'client ID'),
    reelCode: normalizeSlug(reelCode, 'Reel code'),
    title: normalizeRequiredText(title, 'Reel title', 240),
    contentClass: normalizeContentClass(contentClass, { required: true }),
    hypothesis: normalizeGrowthHypothesis(hypothesis, { required: true }),
  }

  const result = await query(
    `
      INSERT INTO videos (
        tenant_id, reel_code, title, purpose, format_slug, pillar_slugs,
        content_class, hypothesis, status
      )
      SELECT $1, $2, $3, 'engagement', 'growth-lab-test', '{}', $4, $5, 'draft'
      FROM tenants t
      WHERE t.id = $1
      ON CONFLICT (tenant_id, reel_code) DO UPDATE
      SET title = EXCLUDED.title,
          content_class = EXCLUDED.content_class,
          hypothesis = EXCLUDED.hypothesis,
          updated_at = now()
      WHERE videos.status IN ('draft', 'ready')
      RETURNING *
    `,
    [payload.tenantId, payload.reelCode, payload.title, payload.contentClass, payload.hypothesis]
  )

  if (!result.rows[0]) {
    throw new Error('Client was not found or this Reel code is already published')
  }
  return result.rows[0]
}

export async function listProperties({ tenantId = '', propertyId = '' } = {}) {
  if (!isDatabaseConfigured()) return { configured: false, properties: [] }

  const values = []
  const conditions = []
  if (tenantId) {
    values.push(tenantId)
    conditions.push(`p.tenant_id = $${values.length}`)
  }
  if (propertyId) {
    values.push(propertyId)
    conditions.push(`p.id = $${values.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await query(
    `
      SELECT
        p.*,
        t.name AS client_name,
        pr.name AS project_name,
        COALESCE(post_stats.post_count, 0) AS post_count,
        post_stats.views,
        post_stats.reach,
        post_stats.likes,
        post_stats.saves,
        post_stats.shares,
        COALESCE(lead_stats.lead_count, 0) AS lead_count,
        COALESCE(lead_stats.hot_leads, 0) AS hot_leads,
        COALESCE(lead_stats.warm_leads, 0) AS warm_leads
      FROM properties p
      JOIN tenants t ON t.id = p.tenant_id
      LEFT JOIN projects pr ON pr.id = p.project_id
      LEFT JOIN LATERAL (
        SELECT
          count(*)::int AS post_count,
          sum(latest.views)::bigint AS views,
          sum(latest.reach)::bigint AS reach,
          sum(latest.likes)::bigint AS likes,
          sum(latest.saves)::bigint AS saves,
          sum(latest.shares)::bigint AS shares
        FROM post_properties pp
        JOIN social_posts sp ON sp.id = pp.post_id AND sp.status = 'published'
        LEFT JOIN LATERAL (
          SELECT pms.views, pms.reach, pms.likes, pms.saves, pms.shares
          FROM post_metric_snapshots pms
          WHERE pms.post_id = sp.id
          ORDER BY pms.captured_at DESC, pms.created_at DESC
          LIMIT 1
        ) latest ON true
        WHERE pp.property_id = p.id
      ) post_stats ON true
      LEFT JOIN LATERAL (
        SELECT
          count(DISTINCT lp.lead_id)::int AS lead_count,
          count(DISTINCT lp.lead_id) FILTER (WHERE l.segment = 'hot')::int AS hot_leads,
          count(DISTINCT lp.lead_id) FILTER (WHERE l.segment = 'warm')::int AS warm_leads
        FROM lead_properties lp
        JOIN leads l ON l.lead_id = lp.lead_id
        WHERE lp.property_id = p.id
      ) lead_stats ON true
      ${where}
      ORDER BY p.updated_at DESC, p.title ASC
    `,
    values
  )

  return { configured: true, properties: rows }
}

export async function createPublishedContent({
  tenantId,
  accountId,
  reelCode,
  title,
  purpose,
  formatSlug,
  pillarSlugs,
  contentClass,
  hypothesis,
  ctaType,
  manifestPath,
  finalFilePath,
  videoNotes,
  permalink,
  platformMediaId,
  caption,
  cta,
  trackingKey,
  publishedOn,
  publishedAt,
  propertyIds,
}) {
  assertConfigured()
  const normalizedTenantId = normalizeSlug(tenantId, 'client ID')
  const normalizedPurpose = normalizePurpose(purpose)
  const normalizedContentClass = normalizeContentClass(contentClass)
  const normalizedHypothesis = normalizeGrowthHypothesis(hypothesis)
  if (normalizedHypothesis && !normalizedContentClass) {
    throw new Error('Growth Lab class is required when a hypothesis is provided')
  }
  const normalizedPropertyIds = normalizeUuidList(propertyIds || [])
  if (normalizedPurpose === 'property' && normalizedPropertyIds.length === 0) {
    throw new Error('Property Reel requires at least one object')
  }

  const payload = {
    tenantId: normalizedTenantId,
    accountId: normalizeRequiredText(accountId, 'content account', 80),
    reelCode: normalizeSlug(reelCode, 'Reel code'),
    title: normalizeRequiredText(title, 'Reel title', 240),
    purpose: normalizedPurpose,
    formatSlug: normalizeSlug(formatSlug, 'format'),
    pillarSlugs: normalizePillarSlugs(pillarSlugs),
    contentClass: normalizedContentClass,
    hypothesis: normalizedHypothesis,
    ctaType: normalizeOptionalText(ctaType, 120),
    manifestPath: normalizeOptionalText(manifestPath, 1000),
    finalFilePath: normalizeOptionalText(finalFilePath, 1000),
    videoNotes: normalizeOptionalText(videoNotes, 4000),
    permalink: normalizeInstagramPermalink(permalink),
    platformMediaId: normalizeOptionalText(platformMediaId, 200),
    caption: normalizeOptionalText(caption, 10000),
    cta: normalizeOptionalText(cta, 1000),
    trackingKey: trackingKey ? normalizeSlug(trackingKey, 'tracking key') : null,
    publishedOn: normalizeDate(publishedOn, 'publication date'),
    publishedAt: normalizeOptionalDateTime(publishedAt, 'publication time'),
    propertyIds: normalizedPropertyIds,
  }

  return withTransaction(async (client) => {
    const accountResult = await client.query(
      `
        SELECT id
        FROM content_accounts
        WHERE id = $1
          AND owner_tenant_id = $2
          AND status <> 'archived'
        LIMIT 1
      `,
      [payload.accountId, payload.tenantId]
    )
    if (!accountResult.rows[0]) throw new Error('Content account does not belong to the selected client')

    if (payload.propertyIds.length) {
      const propertyResult = await client.query(
        `SELECT id FROM properties WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [payload.tenantId, payload.propertyIds]
      )
      if (propertyResult.rows.length !== payload.propertyIds.length) {
        throw new Error('Every selected object must belong to the selected client')
      }
    }

    const existingVideoResult = await client.query(
      `SELECT * FROM videos WHERE tenant_id = $1 AND reel_code = $2 FOR UPDATE`,
      [payload.tenantId, payload.reelCode]
    )
    const existingVideo = existingVideoResult.rows[0]
    let video

    if (existingVideo) {
      if (!['draft', 'ready'].includes(existingVideo.status)) {
        throw new Error('Reel code is already published or archived')
      }
      if (existingVideo.content_class && existingVideo.content_class !== payload.contentClass) {
        throw new Error('Published class must match the preregistered Growth Lab class')
      }
      if (existingVideo.hypothesis && existingVideo.hypothesis !== payload.hypothesis) {
        throw new Error('Published hypothesis must match the preregistered Growth Lab hypothesis')
      }

      const videoResult = await client.query(
        `
          UPDATE videos
          SET title = $3,
              purpose = $4,
              format_slug = $5,
              pillar_slugs = $6,
              content_class = COALESCE(content_class, $7),
              hypothesis = COALESCE(hypothesis, $8),
              cta_type = $9,
              manifest_path = $10,
              final_file_path = $11,
              status = 'published',
              notes = $12
          WHERE tenant_id = $1 AND reel_code = $2
          RETURNING *
        `,
        [
          payload.tenantId,
          payload.reelCode,
          payload.title,
          payload.purpose,
          payload.formatSlug,
          payload.pillarSlugs,
          payload.contentClass,
          payload.hypothesis,
          payload.ctaType,
          payload.manifestPath,
          payload.finalFilePath,
          payload.videoNotes,
        ]
      )
      video = videoResult.rows[0]
    } else {
      const videoResult = await client.query(
        `
          INSERT INTO videos (
            tenant_id, reel_code, title, purpose, format_slug, pillar_slugs,
            content_class, hypothesis, cta_type, manifest_path, final_file_path,
            status, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published', $12)
          RETURNING *
        `,
        [
          payload.tenantId,
          payload.reelCode,
          payload.title,
          payload.purpose,
          payload.formatSlug,
          payload.pillarSlugs,
          payload.contentClass,
          payload.hypothesis,
          payload.ctaType,
          payload.manifestPath,
          payload.finalFilePath,
          payload.videoNotes,
        ]
      )
      video = videoResult.rows[0]
    }

    const postResult = await client.query(
      `
        INSERT INTO social_posts (
          tenant_id, account_id, video_id, permalink, platform_media_id,
          caption, cta, tracking_key, published_on, published_at,
          publish_method, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'manual', 'published')
        RETURNING *
      `,
      [
        payload.tenantId,
        payload.accountId,
        video.id,
        payload.permalink,
        payload.platformMediaId,
        payload.caption,
        payload.cta,
        payload.trackingKey,
        payload.publishedOn,
        payload.publishedAt,
      ]
    )
    const post = postResult.rows[0]

    for (const propertyId of payload.propertyIds) {
      await client.query(
        `INSERT INTO post_properties (post_id, property_id, tenant_id) VALUES ($1, $2, $3)`,
        [post.id, propertyId, payload.tenantId]
      )
    }

    return { video, post }
  })
}

export async function listContentPosts({ tenantId = '', purpose = '', propertyId = '', postId = '' } = {}) {
  if (!isDatabaseConfigured()) return { configured: false, posts: [] }

  const values = []
  const conditions = [`sp.status <> 'archived'`]
  if (tenantId) {
    values.push(tenantId)
    conditions.push(`sp.tenant_id = $${values.length}`)
  }
  if (purpose) {
    values.push(purpose)
    conditions.push(`v.purpose = $${values.length}`)
  }
  if (propertyId) {
    values.push(propertyId)
    conditions.push(`EXISTS (SELECT 1 FROM post_properties ppf WHERE ppf.post_id = sp.id AND ppf.property_id = $${values.length})`)
  }
  if (postId) {
    values.push(postId)
    conditions.push(`sp.id = $${values.length}`)
  }

  const { rows } = await query(
    `
      SELECT
        sp.*,
        v.reel_code,
        v.title,
        v.purpose,
        v.format_slug,
        v.pillar_slugs,
        v.content_class,
        v.hypothesis,
        v.cta_type,
        v.manifest_path,
        v.final_file_path,
        ca.handle AS account_handle,
        t.name AS client_name,
        COALESCE(property_links.properties, '[]'::json) AS properties,
        latest.captured_at AS metrics_captured_at,
        latest.window_label AS metrics_window,
        latest.views,
        latest.reach,
        latest.likes,
        latest.comments,
        latest.saves,
        latest.shares,
        latest.follows,
        latest.profile_activity,
        latest.website_clicks,
        COALESCE(lead_stats.lead_count, 0) AS lead_count
      FROM social_posts sp
      JOIN videos v ON v.id = sp.video_id
      JOIN content_accounts ca ON ca.id = sp.account_id
      JOIN tenants t ON t.id = sp.tenant_id
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object(
          'id', p.id,
          'external_key', p.external_key,
          'title', p.title,
          'status', p.status
        ) ORDER BY p.title) AS properties
        FROM post_properties pp
        JOIN properties p ON p.id = pp.property_id
        WHERE pp.post_id = sp.id
      ) property_links ON true
      LEFT JOIN LATERAL (
        SELECT pms.*
        FROM post_metric_snapshots pms
        WHERE pms.post_id = sp.id
        ORDER BY pms.captured_at DESC, pms.created_at DESC
        LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT count(DISTINCT lp.lead_id)::int AS lead_count
        FROM post_properties pp
        JOIN lead_properties lp
          ON lp.property_id = pp.property_id
         AND lp.tenant_id = pp.tenant_id
        WHERE pp.post_id = sp.id
      ) lead_stats ON true
      WHERE ${conditions.join(' AND ')}
      ORDER BY sp.published_on DESC, sp.created_at DESC
    `,
    values
  )

  return { configured: true, posts: rows }
}

export async function getContentPost(postId) {
  assertConfigured()
  const listResult = await listContentPosts({ postId })
  const post = listResult.posts[0]
  if (!post) return null

  const [metricsResult, leadsResult] = await Promise.all([
    query(
      `
        SELECT *
        FROM post_metric_snapshots
        WHERE post_id = $1
        ORDER BY captured_at DESC, created_at DESC
      `,
      [postId]
    ),
    query(
      `
        SELECT DISTINCT
          l.lead_id, l.name, l.email, l.phone, l.segment, l.priority,
          l.status, l.created_at, l.wohnung_label
        FROM post_properties pp
        JOIN lead_properties lp
          ON lp.property_id = pp.property_id
         AND lp.tenant_id = pp.tenant_id
        JOIN leads l ON l.lead_id = lp.lead_id
        WHERE pp.post_id = $1
        ORDER BY l.created_at DESC
      `,
      [postId]
    ),
  ])

  return { ...post, metrics: metricsResult.rows, leads: leadsResult.rows }
}

export async function addMetricSnapshot({ postId, capturedAt, windowLabel, metrics, source, note }) {
  assertConfigured()
  const parsedMetrics = {
    views: parseNullableNonNegativeInteger(metrics.views, 'views'),
    reach: parseNullableNonNegativeInteger(metrics.reach, 'reach'),
    likes: parseNullableNonNegativeInteger(metrics.likes, 'likes'),
    comments: parseNullableNonNegativeInteger(metrics.comments, 'comments'),
    saves: parseNullableNonNegativeInteger(metrics.saves, 'saves'),
    shares: parseNullableNonNegativeInteger(metrics.shares, 'shares'),
    follows: parseNullableNonNegativeInteger(metrics.follows, 'follows'),
    profileActivity: parseNullableNonNegativeInteger(metrics.profileActivity, 'profile activity'),
    websiteClicks: parseNullableNonNegativeInteger(metrics.websiteClicks, 'website clicks'),
    watchTimeSeconds: parseNullableNonNegativeNumber(metrics.watchTimeSeconds, 'watch time'),
    averageWatchTimeSeconds: parseNullableNonNegativeNumber(metrics.averageWatchTimeSeconds, 'average watch time'),
  }

  if (Object.values(parsedMetrics).every((value) => value === null)) {
    throw new Error('Enter at least one metric')
  }

  const result = await query(
    `
      INSERT INTO post_metric_snapshots (
        post_id, captured_at, window_label, views, reach, likes, comments,
        saves, shares, follows, profile_activity, website_clicks,
        watch_time_seconds, average_watch_time_seconds, source, note
      )
      SELECT
        sp.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      FROM social_posts sp
      WHERE sp.id = $1
      RETURNING *
    `,
    [
      postId,
      normalizeOptionalDateTime(capturedAt, 'capture time') || new Date().toISOString(),
      normalizeMetricWindow(windowLabel),
      parsedMetrics.views,
      parsedMetrics.reach,
      parsedMetrics.likes,
      parsedMetrics.comments,
      parsedMetrics.saves,
      parsedMetrics.shares,
      parsedMetrics.follows,
      parsedMetrics.profileActivity,
      parsedMetrics.websiteClicks,
      parsedMetrics.watchTimeSeconds,
      parsedMetrics.averageWatchTimeSeconds,
      normalizeOptionalText(source, 120) || 'manual_insights',
      normalizeOptionalText(note, 2000),
    ]
  )

  if (!result.rows[0]) throw new Error('Content post was not found')
  return result.rows[0]
}

export async function getPropertyDetail(propertyId) {
  const propertyResult = await listProperties({ propertyId })
  const property = propertyResult.properties[0]
  if (!property) return null

  const [postsResult, leadsResult, photosResult, confirmationsResult] = await Promise.all([
    listContentPosts({ propertyId }),
    query(
      `
        SELECT l.*
        FROM lead_properties lp
        JOIN leads l ON l.lead_id = lp.lead_id
        WHERE lp.property_id = $1
        ORDER BY l.created_at DESC
      `,
      [propertyId]
    ),
    query(
      `
        SELECT
          id, original_filename, content_type, byte_size,
          blob_pathname, uploaded_at
        FROM property_photos
        WHERE property_id = $1
          AND upload_status = 'ready'
        ORDER BY uploaded_at DESC
      `,
      [propertyId]
    ),
    query(
      `
        SELECT
          id, confirmed_by_name, confirmed_by_email, confirmed_at,
          text_version, confirmation_text, material_usage
        FROM property_rights_confirmations
        WHERE property_id = $1
        ORDER BY confirmed_at DESC
      `,
      [propertyId]
    ),
  ])

  return {
    ...property,
    posts: postsResult.posts,
    leads: leadsResult.rows,
    photos: photosResult.rows,
    rightsConfirmations: confirmationsResult.rows,
  }
}

export async function linkLeadToPropertiesByExternalKeys({ leadId, tenantId, externalKeys, source = 'quiz_selection' }) {
  if (!isDatabaseConfigured() || !externalKeys?.length) {
    return { linked: [], missing: externalKeys || [] }
  }

  const uniqueKeys = [...new Set(externalKeys.map((key) => normalizeSlug(key, 'object key')))]
  return withTransaction(async (client) => {
    const propertyResult = await client.query(
      `SELECT id, external_key FROM properties WHERE tenant_id = $1 AND external_key = ANY($2::text[])`,
      [tenantId, uniqueKeys]
    )
    const foundKeys = new Set(propertyResult.rows.map((row) => row.external_key))
    const missing = uniqueKeys.filter((key) => !foundKeys.has(key))

    for (const property of propertyResult.rows) {
      await client.query(
        `
          INSERT INTO lead_properties (lead_id, property_id, tenant_id, source)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (lead_id, property_id) DO NOTHING
        `,
        [leadId, property.id, tenantId, source]
      )
    }

    return { linked: propertyResult.rows, missing }
  })
}
