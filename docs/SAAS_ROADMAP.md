# NovaHaus Lead-to-Call SaaS Roadmap

This repo currently contains one working demo tenant: `novahaus`.

The SaaS version should be built in small layers, so the demo keeps working while the product becomes configurable.

## Current Baseline

Flow:

```text
Landing page + quiz -> /api/lead -> Postgres Lead Inbox -> Resend customer email
                                 -> optional n8n -> Google Sheets -> Gmail Draft
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

## Phase 0.5: `/api/lead` Hardening Backlog

Source: Fable/Claude audit, saved on 2026-06-09.

Scope:

- `src/app/api/lead/route.js`
- `src/components/Quiz.jsx`
- lead scoring and qualification helpers used by the quiz/API flow

Constraint: the real visitor quiz behavior must not change. These changes should only make the lead endpoint safer, more predictable, and easier to test.

Acceptance checklist:

- [x] Validate input before any side effects: email format, non-empty `firstName`, and `wohnung` / `zeitrahmen` / `eigenkapital` / `finanzierung` values restricted to `tenantConfig`.
- [x] Return `400` for invalid requests and do not save the lead or send any email.
- [x] Add IP-based rate limiting for `/api/lead`: around 5 requests per minute, returning `429` above the limit. MVP implementation can use an in-memory `Map` without external services.
- [x] Add a hidden honeypot field to `Quiz.jsx`. If filled, return `200` but skip lead processing so the bot does not learn the rule.
- [x] Stop hardcoding `consent_contact` and `consent_data_processing` as `true` in `buildLeadRecord`.
- [x] Pass the actual quiz consent checkbox value from `Quiz.jsx`; without consent, return `400`.
- [x] Deduplicate by `email + tenant_id` within 24 hours: save the new record with a duplicate marker, but do not send another customer email.
- [x] Remove PII from logs: do not log lead name, email, phone, or private-key diagnostics. Log only `lead_id`, segment, and non-sensitive status.
- [x] In `LEAD_EMAIL_MODE=send`, send only the safe template email from `buildEmailDraft`.
- [x] Keep AI-generated text limited to human-reviewed Gmail Drafts through n8n; never use AI-generated copy for direct auto-send.
- [x] Add tests for `calculateLeadScore` and `getSalesQualification` so duplicated scoring logic cannot silently diverge.

Implementation note: prioritize validation, consent, log cleanup, and direct-email safety first because they reduce live endpoint risk without changing the user-facing quiz flow.

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
