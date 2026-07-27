import { adminErrorMessage, adminRedirect, assertSameOrigin } from '@/lib/adminRequest'
import { createPublishedContent } from '@/lib/contentStore'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const formData = await request.formData()
    const result = await createPublishedContent({
      tenantId: formData.get('tenant_id'),
      accountId: formData.get('account_id'),
      reelCode: formData.get('reel_code'),
      title: formData.get('title'),
      purpose: formData.get('purpose'),
      formatSlug: formData.get('format_slug'),
      pillarSlugs: formData.get('pillar_slugs'),
      contentClass: formData.get('content_class'),
      hypothesis: formData.get('hypothesis'),
      ctaType: formData.get('cta_type'),
      manifestPath: formData.get('manifest_path'),
      finalFilePath: formData.get('final_file_path'),
      videoNotes: formData.get('video_notes'),
      permalink: formData.get('permalink'),
      platformMediaId: formData.get('platform_media_id'),
      caption: formData.get('caption'),
      cta: formData.get('cta'),
      trackingKey: formData.get('tracking_key'),
      publishedOn: formData.get('published_on'),
      publishedAt: formData.get('published_at'),
      propertyIds: formData.getAll('property_ids'),
    })
    return adminRedirect(request, `/admin/content/${result.post.id}`, { created: '1' })
  } catch (error) {
    console.error('Admin content create failed:', error)
    return adminRedirect(request, '/admin/content', { error: adminErrorMessage(error) })
  }
}
