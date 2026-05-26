# NovaHaus Admin Runbook

This runbook explains how to operate the NovaHaus lead-to-call demo safely.

## Live Services

| Area | Service | URL |
| --- | --- | --- |
| Public site | Vercel | https://novahaus.valquilty.com |
| Backup site URL | Vercel | https://novahaus-lead-quiz.vercel.app |
| Workflow automation | n8n | https://workflows.valquilty.com |
| Workflow name | n8n | NovaHaus Lead Collector - MVP |
| Lead storage | Google Sheets | Leads tab |
| Email review | Gmail | Drafts |

## Data Flow

```mermaid
flowchart LR
  A["Visitor completes quiz"] --> B["Next.js /api/lead"]
  B --> C["n8n webhook"]
  C --> D["Normalize + qualify lead"]
  D --> E["Google Sheets: Leads"]
  D --> F["Google Sheets: Email Queue"]
  F --> G["Gmail draft"]
  D --> H["Call-center handoff signal"]
```

## Daily Operations

1. Check n8n executions for failures.
2. Check the Google Sheet `Leads` tab for new leads.
3. Check the Google Sheet `Email Queue` tab for the email draft status.
4. Review Gmail drafts before sending anything.
5. For hot leads, call or hand off to a manager within 5-15 minutes.

## Lead Segments

| Segment | Meaning | Default action |
| --- | --- | --- |
| `hot` | Buyer looks ready and has strong buying signals | Call-center handoff and draft follow-up |
| `warm` | Buyer is active but financing/timing needs clarification | AI-generated clarifying email draft |
| `cold` | Buyer is researching or not ready yet | Nurture draft |
| `not_qualified` | Minimum capital signal is missing | Soft disqualification or financing-options draft |

## Vercel Deployment

Current deployment mode is GitHub auto-deploy:

```text
GitHub repo: https://github.com/QuiltyVal/novahaus-lead-quiz
Production branch: main
Vercel project: novahaus-lead-quiz
```

Every push to `main` should create a production deployment.

Manual fallback:

```bash
vercel --prod
```

Required production environment variables live in Vercel, not in GitHub:

```text
N8N_LEAD_WEBHOOK_URL
N8N_LEAD_WEBHOOK_SECRET
AI_EMAIL_PROVIDER
OPENROUTER_API_KEY
OPENROUTER_BASE_URL
OPENROUTER_APP_NAME
FREE_LLM_MODELS_URL
FREE_LLM_FALLBACK_MODEL
```

Never commit `.env.local`.

## GitHub Auto-Deploy

The Vercel project is connected to:

```text
QuiltyVal/novahaus-lead-quiz
```

If auto-deploy stops working:

1. Open the Vercel project `novahaus-lead-quiz`.
2. Go to `Settings -> Git`.
3. Confirm repository is `QuiltyVal/novahaus-lead-quiz`.
4. Confirm production branch is `main`.
5. Confirm GitHub Actions/secrets are not required for normal Vercel Git deploys.

## DNS

Cloudflare DNS for the public site:

```text
Type: A
Name: novahaus
Value: 76.76.21.21
Proxy status: DNS only
TTL: Auto
```

Keep `workflows.valquilty.com` separate for n8n.

## n8n Checks

Open `https://workflows.valquilty.com` and inspect:

- workflow is published
- Gmail OAuth credential is connected
- Google Sheets credential is connected
- latest execution succeeds after a quiz submission
- failed executions are investigated before changing prompts or env vars

## Test A Production Lead

Send one warm demo lead to production:

```bash
DEMO_LEAD_API_URL=https://novahaus.valquilty.com/api/lead npm run demo:leads -- --scenario=warm
```

Expected result:

- CLI returns `status: ok`
- lead appears in Google Sheets
- email queue row is appended
- Gmail draft appears
- n8n execution is successful

## AI Email Provider

Default portfolio setting:

```text
AI_EMAIL_PROVIDER=openrouter_auto_free
```

Fallback behavior:

- if OpenRouter fails, the app uses static templates
- if free-model lookup fails, the app uses `FREE_LLM_FALLBACK_MODEL`
- if n8n fails, `/api/lead` returns a visible error so the workflow can be debugged

For real client work, keep Gmail in draft-only mode until legal/commercial review is complete.

## Emergency Fallback

If AI drafts fail:

```text
AI_EMAIL_PROVIDER=template
```

If n8n fails:

1. Check n8n execution logs.
2. Check `N8N_LEAD_WEBHOOK_URL`.
3. Check `N8N_LEAD_WEBHOOK_SECRET` on both Vercel and n8n.
4. Run the production demo lead command again.

If the public domain fails:

1. Test `https://novahaus-lead-quiz.vercel.app`.
2. Check Cloudflare `novahaus` A record.
3. Check Vercel domain configuration.

## Safety Rules

- Do not auto-send emails in the demo.
- Do not expose API keys in `NEXT_PUBLIC_*` variables.
- Do not commit `.env.local`.
- Do not merge production changes without `npm run build`.
- Do not treat Google Sheets as a production CRM for real client operations.
