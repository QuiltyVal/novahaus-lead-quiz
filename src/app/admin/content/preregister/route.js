import { adminErrorMessage, adminRedirect, assertSameOrigin } from '@/lib/adminRequest'
import { preregisterContentExperiment } from '@/lib/contentStore'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const formData = await request.formData()
    const experiment = await preregisterContentExperiment({
      tenantId: formData.get('tenant_id'),
      reelCode: formData.get('reel_code'),
      title: formData.get('title'),
      contentClass: formData.get('content_class'),
      hypothesis: formData.get('hypothesis'),
    })
    return adminRedirect(request, '/admin/content', { preregistered: experiment.reel_code })
  } catch (error) {
    console.error('Admin Growth Lab preregistration failed:', error)
    return adminRedirect(request, '/admin/content', { error: adminErrorMessage(error) })
  }
}
