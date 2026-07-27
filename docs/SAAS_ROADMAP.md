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

## Deferred Object Storefront: activate after the first property client

Decision recorded on 2026-07-16.

The current Instagram phase has no real inventory. Its purpose is to prove channel growth with AI concept-property media and win the first agency contract. Fictional concept content must not be inserted into the live `properties` inventory as an active offer and must not generate pretend buyer leads.

The object storefront and buyer-routing layer remain planned, but are deferred until a client supplies real properties, confirmed facts, current availability, media rights, and a handoff owner.

### Attribution decision: object first, Reel source second

The public buyer journey must not require a visible Reel code. Asking a visitor to remember or enter `R018` creates unnecessary friction.

Primary business attribution:

```text
buyer selects property
-> property_id is carried through shortlist / enquiry / quiz
-> lead_properties links lead_id to property_id
-> the agency can see which property produced the enquiry
```

Content-source attribution stays internal and optional:

```text
videos.id / videos.reel_code
-> social_posts.id / platform_media_id
-> post_properties
-> optional leads.source_post_id and UTM metadata
```

Rules:

- `property_id` is the primary link for buyer intent and lead routing.
- `video_id`, `social_post_id`, and `reel_code` are internal analytics identifiers; they are not shown as a required user action.
- `source_post_id` may be captured automatically from a paid-ad URL, Story link, deep link, first-party session, or UTM parameters.
- A shared organic bio link cannot prove which Reel caused a profile visit. Preserve this as `unknown` instead of forcing a code-entry step or inventing attribution.
- One property may have many Reels/posts, and one lead may select several properties through `lead_properties`.
- Content performance and property demand are separate questions: Reel metrics explain audience growth; `lead_properties` explains buyer choice.

### Reporting semantics

`post_properties` means that a post featured an object. It does **not** prove that the post caused a later lead for that object.

The current content reporting path joins `post_properties -> lead_properties`, so one lead for a property may appear beside every Reel that ever featured that property. Future reporting must split these metrics:

- `object_interest_leads`: leads that selected an object featured in the post, with no causal Reel claim;
- `attributed_leads`: leads where `leads.source_post_id = social_posts.id` or another deterministic ad/deep-link touch exists;
- content performance: reach, views, saves, shares, follows and profile actions;
- acquisition source: organic Instagram, Story, Meta Ad, direct, or `unknown`.

Never label `object_interest_leads` as Reel-generated leads.

### Future public routes

Build only after real inventory exists:

```text
/objekte                  active real-property catalogue
/objekt/[public_slug]     verified object page
/merken                   shortlist
/quiz?property_id=...     buyer qualification with selected object preserved
```

The object page should carry `property_id` automatically into `ViewContent`, shortlist, enquiry, and `Lead` events. If source metadata exists, keep it alongside the object link without making it mandatory.

When implementation starts, make the `source_post_id` relation tenant-safe with a composite foreign key `(source_post_id, tenant_id) -> (social_posts.id, tenant_id)`.

Minimum future property fields:

- `property_id` and stable public slug;
- client/tenant and handoff owner;
- availability status;
- district, price, area, rooms, property type;
- verified public description and media;
- media-rights status;
- linked social posts;
- similar active properties.

If an object becomes unavailable, preserve the page as unavailable and show real alternatives rather than deleting the attribution surface or presenting stale availability.

### Phase boundary

Before the first contract:

- public CTA is follow/save/share and the B2B proof page;
- website may show a creative portfolio, but not a fake buyer catalogue;
- channel growth and production repeatability are the sales proof.

After the first contract:

- ingest real properties;
- enable object catalogue and shortlist;
- connect `property_id` to lead submission;
- add automatic source-post metadata where available;
- activate Pixel/CAPI object events and property lead campaigns.

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
