# NovaHaus Lead-to-Call SaaS Roadmap

This repo currently contains one working demo tenant: `novahaus`.

The SaaS version should be built in small layers, so the demo keeps working while the product becomes configurable.

## Current Baseline

Flow:

```text
Landing page + quiz -> /api/lead -> n8n -> Google Sheets -> Gmail Draft
```

The first SaaS foundation is now `src/lib/tenantConfig.js`.
It centralizes:

- tenant and project IDs
- brand name and language
- quiz version
- property options
- answer options
- lead scoring rules
- workflow segment rules
- email signature and AI drafting rules

## Phase 1: Productized Service

Goal: sell and operate the system manually for 1-3 companies.

Build:

- one tenant config per client
- deployment per client or URL-based tenant selection
- lead sheet and n8n workflow per client
- manual onboarding checklist
- sales playbook and offer page

Do not build billing, self-service onboarding, or a complex admin UI yet.

## Phase 2: Internal Admin

Goal: let the operator manage clients without editing code.

Build:

- database: tenants, projects, properties, quiz options, lead rules, leads
- internal `/admin` area
- tenant/project switcher
- lead inbox
- rule editor for hot/warm/cold/not qualified
- email template editor
- integration status screen

Recommended stack:

- Vercel + Next.js
- Postgres via Neon or Supabase
- Auth via Clerk/Auth.js/Supabase Auth
- n8n for external workflows until the workflow engine is moved in-app

## Phase 3: Client Portal

Goal: a real estate company can use the system without operator intervention.

Build:

- company accounts
- roles: owner, admin, sales agent
- Gmail/Outlook OAuth
- Google Sheets/CRM integrations
- editable quiz branding
- lead status workflow
- email draft approval flow
- audit log

Keep AI human-reviewed by default.

## Phase 4: SaaS

Goal: self-service product.

Build:

- Stripe billing
- plan limits
- usage tracking
- onboarding wizard
- templates by use case
- embed snippet
- CRM marketplace integrations
- monitoring and error recovery

## Next Technical Step

Add persistent storage and an internal lead inbox.

Minimum schema:

```text
tenants
projects
properties
quiz_options
lead_rules
leads
lead_events
email_drafts
integrations
```

The first useful UI is not billing. It is a lead inbox that replaces Google Sheets as the primary operational surface.
