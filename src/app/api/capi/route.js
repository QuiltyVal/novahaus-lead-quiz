import { NextResponse } from 'next/server'
import crypto from 'crypto'

/* ============================================
   CONFIG — from env variables
   ============================================ */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || ''
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || null
const API_VERSION = 'v21.0'
const GRAPH_API_URL = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`

/* ============================================
   Helpers
   ============================================ */
function hashValue(value) {
  if (!value) return null
  const normalized = String(value).trim().toLowerCase()
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

function normalizePhone(phone) {
  if (!phone) return null
  let cleaned = phone.replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('0')) cleaned = '+49' + cleaned.slice(1)
  if (!cleaned.startsWith('+')) cleaned = '+49' + cleaned
  return cleaned
}

function getClientIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}

/* ============================================
   POST /api/capi
   ============================================ */
export async function POST(request) {
  try {
    const body = await request.json()

    const {
      event_name,
      event_time,
      event_id,
      event_source_url,
      action_source,
      user_data = {},
      custom_data = {},
    } = body

    // Build CAPI event payload
    const eventPayload = {
      event_name,
      event_time: event_time || Math.floor(Date.now() / 1000),
      event_id: event_id || `srv_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      event_source_url,
      action_source: action_source || 'website',
      user_data: {
        client_user_agent:
          user_data.client_user_agent || request.headers.get('user-agent'),
        client_ip_address: getClientIP(request),
        fbc: user_data.fbc || undefined,
        fbp: user_data.fbp || undefined,
        // PII — SHA-256 hashed (Meta requirement)
        em: user_data.em ? [hashValue(user_data.em)] : undefined,
        ph: user_data.ph ? [hashValue(normalizePhone(user_data.ph))] : undefined,
        fn: user_data.fn ? [hashValue(user_data.fn)] : undefined,
        ln: user_data.ln ? [hashValue(user_data.ln)] : undefined,
        country: [hashValue('de')],
      },
      custom_data: {
        ...custom_data,
        currency: custom_data.currency || 'EUR',
      },
    }

    // Remove undefined values from user_data
    Object.keys(eventPayload.user_data).forEach((key) => {
      if (eventPayload.user_data[key] === undefined || eventPayload.user_data[key] === null) {
        delete eventPayload.user_data[key]
      }
    })

    // Skip sending if Meta is not configured.
    if (!PIXEL_ID) {
      console.log('CAPI: No pixel ID configured, event logged but not sent to Meta.')
      return NextResponse.json({
        success: true,
        event_id: eventPayload.event_id,
        note: 'No Meta pixel ID, event not forwarded to Meta',
      })
    }

    // Skip sending if no access token configured
    if (!ACCESS_TOKEN || ACCESS_TOKEN === 'YOUR_CONVERSIONS_API_ACCESS_TOKEN') {
      console.log('CAPI: No access token configured, event logged but not sent to Meta.')
      console.log('    Event:', event_name, '| ID:', eventPayload.event_id)
      return NextResponse.json({
        success: true,
        event_id: eventPayload.event_id,
        note: 'No access token — event not forwarded to Meta',
      })
    }

    // Send to Meta Conversions API
    const requestBody = {
      data: [eventPayload],
      ...(TEST_EVENT_CODE && { test_event_code: TEST_EVENT_CODE }),
    }

    const metaResponse = await fetch(`${GRAPH_API_URL}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const metaResult = await metaResponse.json()

    if (!metaResponse.ok) {
      console.error('❌ CAPI Error:', JSON.stringify(metaResult))
      return NextResponse.json(
        {
          success: false,
          error: metaResult.error?.message || 'CAPI request failed',
        },
        { status: 500 }
      )
    }

    console.log(`✅ CAPI Event sent: ${event_name} (ID: ${eventPayload.event_id})`)

    return NextResponse.json({
      success: true,
      event_id: eventPayload.event_id,
      events_received: metaResult.events_received || 1,
    })
  } catch (error) {
    console.error('❌ CAPI Server Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
