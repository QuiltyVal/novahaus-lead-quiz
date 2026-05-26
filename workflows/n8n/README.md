# NovaHaus n8n Workflows

## Workflow

Import this file into n8n:

```text
workflows/n8n/novahaus-lead-collector-mvp.json
```

The workflow does:

```text
Webhook -> Verify secret -> Normalize + qualify lead -> Append Leads row -> Route by segment -> Append Email Queue row -> Create Gmail Draft -> Respond OK
```

## n8n Environment Variables

Set these on the n8n instance:

```bash
N8N_LEAD_WEBHOOK_SECRET=your-shared-secret
NOVAHAUS_LEADS_SHEET_ID=google-sheet-id
NOVAHAUS_LEADS_SHEET_TAB=Leads
```

Use the same `N8N_LEAD_WEBHOOK_SECRET` in the NovaHaus app:

```bash
N8N_LEAD_WEBHOOK_SECRET=your-shared-secret
```

## NovaHaus App Environment Variables

After importing and activating the workflow, copy the production webhook URL from n8n and set it in the NovaHaus app:

```bash
N8N_LEAD_WEBHOOK_URL=https://your-n8n-domain/webhook/novahaus-lead
N8N_LEAD_WEBHOOK_SECRET=your-shared-secret
```

## Google Sheet

Create tabs named `Leads` and `Email Queue`.

Use the header rows from:

```text
workflows/n8n/novahaus-leads-sheet-header.csv
workflows/n8n/novahaus-email-queue-header.csv
```

The sales-ops columns added in the MVP are:

- `priority`
- `next_action`
- `followup_due_at`
- `assigned_to`
- `qualification_reason`
- `lead_summary`
- `email_subject`
- `email_draft`

The workflow keeps the original columns first and appends these fields at the end, so old rows remain readable.

## Email Queue And Gmail Drafts

The workflow creates review-ready email rows in the `Email Queue` tab and, when Gmail credentials are connected, creates a matching Gmail draft. If the app sends `email_subject` and `email_draft` from AI generation, n8n uses those values; otherwise it falls back to the segment templates in `Validate + Normalize Lead`.

Supported app-side AI modes:

- `AI_EMAIL_PROVIDER=template`
- `AI_EMAIL_PROVIDER=gemini`
- `AI_EMAIL_PROVIDER=openrouter`
- `AI_EMAIL_PROVIDER=openrouter_auto_free`

`openrouter_auto_free` resolves the current model from `FREE_LLM_MODELS_URL` and falls back to `FREE_LLM_FALLBACK_MODEL`.

- `email_status=draft_ready`
- `approval_status=needs_review`
- `subject` and `body` are generated from the lead segment
- no email is sent automatically in the MVP

For portfolio demos, the draft proves the automation works while keeping the final send action under human control.

## Gmail Credential

After import, open the `Create Gmail Draft` node and select your Gmail OAuth2 credential.

Google Cloud must have the Gmail API enabled for the same OAuth project.

## Google Sheets Credential

After import, open the `Append Lead to Google Sheet` node and select your Google Sheets credential.

If the imported node shows placeholder credentials, replace them manually in n8n UI.

## Current Placeholder Nodes

The workflow routes by segment:

- `hot`
- `warm`
- `cold`
- `not_qualified`

For MVP stage 1, the branch nodes only annotate the path before responding to the website.

Next iterations:

- replace `Hot Lead Task Placeholder` with Slack/Telegram/CRM/call-center task
- replace `Warm Lead Email Placeholder` with AI email draft/send
- replace `Cold Lead Nurture Placeholder` with nurture sequence
- replace `Not Qualified Placeholder` with financing/alternative-object follow-up

## Test Payload

```bash
curl -X POST "https://your-n8n-domain/webhook-test/novahaus-lead" \
  -H "Content-Type: application/json" \
  -H "x-lead-webhook-secret: your-shared-secret" \
  --data '{
    "lead_id": "test-lead-1",
    "created_at": "2026-05-21T10:00:00.000Z",
    "first_name": "Test",
    "last_name": "Lead",
    "name": "Test Lead",
    "email": "test@example.com",
    "phone": "+49 151 12345678",
    "wohnung": "3-zimmer",
    "wohnung_label": "3-Zimmer mit Garten (92 m², €329.000)",
    "purchase_timeline": "sofort",
    "purchase_timeline_label": "So schnell wie möglich",
    "equity_bucket": "50-80k",
    "equity_bucket_label": "€50.000 – €80.000",
    "financing_status": "vorhanden",
    "financing_status_label": "Ja, vorhanden",
    "segment": "hot",
    "score": "hot",
    "handoff_required": true,
    "handoff_reason": "hot_lead",
    "next_best_action": "handoff_to_call_center_and_send_call_email",
    "consent_contact": true,
    "consent_data_processing": true,
    "utm_source": "test"
  }'
```
