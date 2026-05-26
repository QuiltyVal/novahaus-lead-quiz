#!/usr/bin/env node

const API_URL = process.env.DEMO_LEAD_API_URL || 'http://localhost:3000/api/lead'
const TARGET_EMAIL = process.env.DEMO_LEAD_TARGET_EMAIL || ''
const DELAY_MS = Number.parseInt(process.env.DEMO_LEAD_DELAY_MS || '300', 10)

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const scenarioArg = process.argv.find((arg) => arg.startsWith('--scenario='))
const selectedScenario = scenarioArg ? scenarioArg.split('=')[1] : ''

const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

const scenarios = [
  {
    scenario: 'hot',
    firstName: 'Helena',
    lastName: 'Kaufbereit',
    phone: '+49 151 10000001',
    wohnung: '4-zimmer',
    zeitrahmen: 'sofort',
    eigenkapital: 'ueber-80k',
    finanzierung: 'vorhanden',
    lead_score: 'hot',
    underqualified: false,
  },
  {
    scenario: 'warm',
    firstName: 'Martin',
    lastName: 'Finanzierung',
    phone: '+49 151 10000002',
    wohnung: '3-zimmer',
    zeitrahmen: '3-6-monate',
    eigenkapital: '50-80k',
    finanzierung: 'in-planung',
    lead_score: 'warm',
    underqualified: false,
  },
  {
    scenario: 'cold',
    firstName: 'Sofia',
    lastName: 'Recherche',
    phone: '+49 151 10000003',
    wohnung: 'beide',
    zeitrahmen: 'informieren',
    eigenkapital: 'keine-angabe',
    finanzierung: 'benoetigt-hilfe',
    lead_score: 'cold',
    underqualified: false,
  },
  {
    scenario: 'not_qualified',
    firstName: 'Lukas',
    lastName: 'Budgetcheck',
    phone: '+49 151 10000004',
    wohnung: '3-zimmer',
    zeitrahmen: 'sofort',
    eigenkapital: 'unter-30k',
    finanzierung: 'benoetigt-hilfe',
    lead_score: 'not_qualified',
    underqualified: true,
  },
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emailForScenario(scenario) {
  if (TARGET_EMAIL) return TARGET_EMAIL
  return `novahaus.demo+${scenario}.${runId}@example.com`
}

function buildPayload(seed) {
  return {
    firstName: seed.firstName,
    lastName: seed.lastName,
    email: emailForScenario(seed.scenario),
    phone: seed.phone,
    wohnung: seed.wohnung,
    zeitrahmen: seed.zeitrahmen,
    eigenkapital: seed.eigenkapital,
    finanzierung: seed.finanzierung,
    lead_score: seed.lead_score,
    underqualified: seed.underqualified,
    source: {
      utm_source: 'portfolio_demo',
      utm_medium: 'seed_script',
      utm_campaign: `novahaus_demo_${runId}`,
      utm_content: seed.scenario,
    },
    timestamp: new Date().toISOString(),
  }
}

async function postLead(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  let body

  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text }
  }

  if (!response.ok) {
    const message = body?.error || body?.raw || response.statusText
    throw new Error(`HTTP ${response.status}: ${message}`)
  }

  return body
}

async function main() {
  const selected = selectedScenario
    ? scenarios.filter((seed) => seed.scenario === selectedScenario)
    : scenarios

  if (selectedScenario && selected.length === 0) {
    console.error(`Unknown scenario "${selectedScenario}". Use: ${scenarios.map((seed) => seed.scenario).join(', ')}`)
    process.exit(1)
  }

  console.log(`NovaHaus demo lead seed`)
  console.log(`API: ${API_URL}`)
  console.log(`Run: ${runId}`)
  console.log(`Mode: ${dryRun ? 'dry-run' : 'send'}`)
  console.log(`Email: ${TARGET_EMAIL ? TARGET_EMAIL : 'scenario-specific example.com addresses'}`)
  console.log('')

  const results = []

  for (const seed of selected) {
    const payload = buildPayload(seed)

    if (dryRun) {
      results.push({
        scenario: seed.scenario,
        email: payload.email,
        status: 'dry_run',
        lead_id: '',
        segment: seed.lead_score,
        next_action: '',
      })
      continue
    }

    try {
      const result = await postLead(payload)
      results.push({
        scenario: seed.scenario,
        email: payload.email,
        status: 'ok',
        lead_id: result.lead_id || '',
        segment: result.lead_score || '',
        next_action: result.next_action || result.next_best_action || '',
      })
    } catch (error) {
      results.push({
        scenario: seed.scenario,
        email: payload.email,
        status: 'error',
        lead_id: '',
        segment: '',
        next_action: error.message,
      })
    }

    if (DELAY_MS > 0) await sleep(DELAY_MS)
  }

  console.table(results)

  const failed = results.filter((result) => result.status === 'error')
  if (failed.length > 0) {
    console.error(`\n${failed.length} demo lead(s) failed.`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
