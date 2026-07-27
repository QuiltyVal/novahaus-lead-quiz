import { adminErrorMessage, adminRedirect, assertSameOrigin } from '@/lib/adminRequest'
import { addMetricSnapshot } from '@/lib/contentStore'
import { normalizeUuidList } from '@/lib/contentValidation'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  const { postId: rawPostId } = await params
  let postId = rawPostId

  try {
    assertSameOrigin(request)
    postId = normalizeUuidList([rawPostId])[0]
    const formData = await request.formData()
    await addMetricSnapshot({
      postId,
      capturedAt: formData.get('captured_at'),
      windowLabel: formData.get('window_label'),
      metrics: {
        views: formData.get('views'),
        reach: formData.get('reach'),
        likes: formData.get('likes'),
        comments: formData.get('comments'),
        saves: formData.get('saves'),
        shares: formData.get('shares'),
        follows: formData.get('follows'),
        profileActivity: formData.get('profile_activity'),
        websiteClicks: formData.get('website_clicks'),
        watchTimeSeconds: formData.get('watch_time_seconds'),
        averageWatchTimeSeconds: formData.get('average_watch_time_seconds'),
      },
      source: 'manual_insights',
      note: formData.get('note'),
    })
    return adminRedirect(request, `/admin/content/${postId}`, { metrics: 'saved' })
  } catch (error) {
    console.error('Admin metric create failed:', error)
    return adminRedirect(request, `/admin/content/${postId}`, { error: adminErrorMessage(error) })
  }
}
