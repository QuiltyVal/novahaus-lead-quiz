import { adminErrorMessage, adminRedirect, assertSameOrigin } from '@/lib/adminRequest'
import { createProperty } from '@/lib/contentStore'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const formData = await request.formData()
    const property = await createProperty({
      tenantId: formData.get('tenant_id'),
      projectId: formData.get('project_id'),
      externalKey: formData.get('external_key'),
      title: formData.get('title'),
      addressLabel: formData.get('address_label'),
      district: formData.get('district'),
      city: formData.get('city'),
      status: formData.get('status'),
      photoRightsStatus: formData.get('photo_rights_status'),
      notes: formData.get('notes'),
    })
    return adminRedirect(request, `/admin/objects/${property.id}`, { created: '1' })
  } catch (error) {
    console.error('Admin object create failed:', error)
    return adminRedirect(request, '/admin/objects', { error: adminErrorMessage(error) })
  }
}
