import { adminErrorMessage, adminRedirect, assertSameOrigin } from '@/lib/adminRequest'
import { createClient } from '@/lib/contentStore'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const formData = await request.formData()
    const result = await createClient({
      clientId: formData.get('client_id'),
      clientName: formData.get('client_name'),
      projectId: formData.get('project_id'),
      projectName: formData.get('project_name'),
      instagramHandle: formData.get('instagram_handle'),
    })
    return adminRedirect(request, '/admin/clients', { created: result.client.id })
  } catch (error) {
    console.error('Admin client create failed:', error)
    return adminRedirect(request, '/admin/clients', { error: adminErrorMessage(error) })
  }
}
