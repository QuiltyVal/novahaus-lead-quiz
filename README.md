# NovaHaus Lead-to-Call Demo

Portfolio MVP for a real-estate lead funnel:

```mermaid
flowchart LR
  A["Landing quiz"] --> B["Next.js /api/lead"]
  B --> C["Lead qualification"]
  C --> D["Postgres Lead Inbox"]
  C --> E["Resend customer email"]
  C --> F["Optional n8n workflow"]
  F --> G["Google Sheet: Leads"]
  F --> H["Gmail draft"]
  C --> I["Call-center handoff path"]
```

The project demonstrates a fast-response sales operations workflow: a quiz captures intent, the lead is qualified, stored in an internal Lead Inbox, and routed to either direct email follow-up, human-reviewed drafts, or a call-center handoff.

## Administration

Operational notes for Vercel, DNS, n8n, Google Sheets, Gmail drafts, and production checks are in:

```text
docs/ADMIN_RUNBOOK.md
```

Sales positioning, demo flow, packages, and outreach copy are in:

```text
docs/SALES_PLAYBOOK.md
```

SaaS planning and the `/api/lead` security hardening backlog are in:

```text
docs/SAAS_ROADMAP.md
```

B2B sales landing page:

```text
/system
```

Demo-safe recording mode:

```text
/demo
```

Use `/demo` when recording portfolio videos or presenting to prospects without
showing private n8n, Google, Gmail, or browser account data. The quiz supports
scenario links like `/quiz?demo=hot`, pre-fills fake contact details, tags the
lead as demo traffic, and links the thank-you page to `/demo/ops`.

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Required Environment

Create `.env.local` from `.env.local.example` and set:

```bash
N8N_LEAD_WEBHOOK_URL=https://workflows.example.com/webhook/novahaus-lead
N8N_LEAD_WEBHOOK_SECRET=shared-secret
```

The same secret must be configured on the n8n instance.

Optional internal Lead Inbox:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong-password
```

Run `db/schema.sql` once on the Postgres database before enabling the inbox in production. Without `DATABASE_URL`, the existing n8n/Google Sheets workflow continues to work.

## Marketing Trackers

Tracking slots are built in but disabled until env variables are set:

```bash
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=your-meta-pixel-id
META_ACCESS_TOKEN=your-meta-conversions-api-token
META_TEST_EVENT_CODE=
```

`NEXT_PUBLIC_GTM_ID` and `NEXT_PUBLIC_META_PIXEL_ID` are public browser IDs. Never put API keys in `NEXT_PUBLIC_*` variables. Google Tag Manager and Meta Pixel load only after the visitor accepts marketing cookies. Meta Conversions API runs server-side only when `META_ACCESS_TOKEN` is configured.

## Demo Seed Leads

Run four portfolio demo scenarios:

```bash
npm run demo:leads
```

This sends:

- `hot`: ready for call-center handoff
- `warm`: needs a clarifying financing email
- `cold`: goes into nurture
- `not_qualified`: softly filtered because minimum equity is not met

Useful options:

```bash
npm run demo:leads -- --dry-run
npm run demo:leads -- --scenario=warm
DEMO_LEAD_TARGET_EMAIL=you@example.com npm run demo:leads
DEMO_LEAD_API_URL=https://your-site.example.com/api/lead npm run demo:leads
```

By default, demo leads use reserved `example.com` addresses and do not send real customer emails.
If direct email sending is enabled, use `DEMO_LEAD_TARGET_EMAIL` so demo emails can only go to a controlled inbox.

## AI Email Drafts

Static templates are the default safe mode:

```bash
AI_EMAIL_PROVIDER=template
```

Available providers:

```bash
AI_EMAIL_PROVIDER=template
AI_EMAIL_PROVIDER=gemini
AI_EMAIL_PROVIDER=openrouter
AI_EMAIL_PROVIDER=openrouter_auto_free
```

Use a fixed OpenRouter model:

```bash
AI_EMAIL_PROVIDER=openrouter
AI_EMAIL_MODEL=openrouter/free
OPENROUTER_API_KEY=your-key
```

Use the daily free-model switcher:

```bash
AI_EMAIL_PROVIDER=openrouter_auto_free
OPENROUTER_API_KEY=your-key
FREE_LLM_MODELS_URL=https://shir-man.com/api/free-llm/top-models
FREE_LLM_FALLBACK_MODEL=openrouter/free
```

Use Gemini:

```bash
AI_EMAIL_PROVIDER=gemini
AI_EMAIL_MODEL=gemini-3.5-flash
GEMINI_API_KEY=your-key
```

If the selected provider is not configured or returns invalid content, `/api/lead` falls back to the static draft so the pipeline still writes the lead, appends the email queue row, and creates a Gmail draft.

When `DATABASE_URL` is configured, every lead also stores an email draft in the internal Lead Inbox. If `AI_EMAIL_PROVIDER` is not `template`, the AI-generated draft is saved for human review at `/admin/leads/{lead_id}`. It is not used for automatic direct sending.

## Direct Customer Email

The app can send the prepared follow-up email directly from `/api/lead`, independent from n8n, Google Sheets, or Gmail OAuth.

Default safe mode:

```bash
LEAD_EMAIL_MODE=off
```

Enable direct sending after the sender domain is verified:

```bash
LEAD_EMAIL_MODE=send
LEAD_EMAIL_PROVIDER=resend
RESEND_API_KEY=your-key
LEAD_EMAIL_FROM="NovaHaus Immobilien <leads@mail.valquilty.com>"
LEAD_EMAIL_REPLY_TO=me@valquilty.com
```

SMTP is also supported:

```bash
LEAD_EMAIL_MODE=send
LEAD_EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
LEAD_EMAIL_FROM="NovaHaus Immobilien <leads@novahaus.valquilty.com>"
```

Demo or reserved `example.com` leads are skipped unless `DEMO_LEAD_TARGET_EMAIL` is set. This prevents test/demo leads from sending to fake addresses.

Direct customer email always uses the safe template draft. AI-generated copy is only shown in the admin Lead Inbox and can be sent manually after review.

## Resend Inbound Replies

Inbound replies let a lead answer the reviewed email and appear back in the Lead Inbox without Gmail or n8n.

Environment:

```bash
LEAD_EMAIL_REPLY_TO=leads@reply.valquilty.com
RESEND_INBOUND_WEBHOOK_SECRET=whsec_...
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Manual setup:

1. In Resend, open **Domains** and add a receiving subdomain such as `reply.valquilty.com`. Use a subdomain so the existing Zoho/Gmail/other mailbox MX records for the root domain stay untouched.
2. In Cloudflare/DNS, add the MX record shown by Resend:
   - Type: `MX`
   - Name: `reply`
   - Mail server/value: copy the exact Resend receiving target from the dashboard, for example `inbound-smtp.us-east-1.amazonaws.com`
   - Priority: copy Resend's value, usually `10`
   - TTL: `Auto`
   - Proxy: DNS only
3. In Resend, open **Webhooks** and create a webhook:
   - URL: `https://novahaus.valquilty.com/api/inbound-email`
   - Event: `email.received`
4. Copy the webhook signing secret from the Resend webhook details into `RESEND_INBOUND_WEBHOOK_SECRET` in Vercel.
5. Set `LEAD_EMAIL_REPLY_TO` in Vercel to an address on the receiving subdomain, for example `leads@reply.valquilty.com`. Any local part is fine as long as the receiving domain is verified in Resend.
6. Optional: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to receive a small notification when a lead replies. If either value is missing, Telegram is skipped silently.
7. Redeploy the Vercel app after changing env variables.

Test:

1. Submit the quiz with an email address you can access.
2. Open `/admin/leads/{lead_id}`, review the generated draft, and send it.
3. Reply to the received email.
4. In Resend Webhooks, confirm the `email.received` delivery returns `2xx`.
5. Open the same lead card in `/admin/leads/{lead_id}`. The lead status should be `replied`, and the reply should appear under **Antworten**.

The webhook validates Resend's Svix signature before doing any work. Resend's `email.received` webhook only contains metadata, so `/api/inbound-email` fetches the full email body through the Resend Received Emails API before saving `reply_received` into `lead_events`.

## n8n Workflow

The workflow files and setup notes are in:

```text
workflows/n8n/
```

Current workflow:

```text
Webhook -> Verify secret -> Normalize + qualify lead -> Append Leads row -> Route by segment -> Append Email Queue row -> Create Gmail Draft -> Respond OK
```

## Portfolio Notes

This is intentionally scoped as a portfolio/prototype system, not a production CRM:

- Direct customer email is disabled by default and must be explicitly enabled with `LEAD_EMAIL_MODE=send`.
- Gmail/n8n drafts are optional workflow automation, not the core storage path.
- The call-center step is represented as a structured handoff path.
- AI-generated email drafts are supported through `AI_EMAIL_PROVIDER=gemini`, `openrouter`, or `openrouter_auto_free`.
