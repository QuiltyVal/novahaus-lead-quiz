# NovaHaus Reel-to-Lead Sales Playbook

Use this when presenting the system to real-estate firms, agencies, developers, or broker teams.

## Positioning

Do not sell this as "AI replaces sales".

Sell it as:

```text
A measurable organic acquisition system for real-estate teams.
AI Reels turn existing property photos into attention. The quiz captures intent,
qualifies the lead, prepares the follow-up, and gives sales a clear call context.
```

Core promise:

```text
Create organic entry points repeatedly, then make every inquiry easier to act on.
```

## Demo Flow

1. Open the B2B page:

```text
https://novahaus.valquilty.com/system
```

2. Start with the demo-safe system overview:

```text
https://novahaus.valquilty.com/demo
```

3. Walk through the hot scenario without writing real data:

```text
https://novahaus.valquilty.com/quiz?demo=hot
```

4. Show the privacy-safe operational view:

```text
https://novahaus.valquilty.com/demo/ops?scenario=hot
```

5. Explain the proven private flow without opening private services:

```text
Quiz -> stable lead_id -> Postgres Lead Inbox -> reviewed email -> reply/call handoff.
AI creates drafts, not blind sends. The human reviews before sending.
```

## Demo-Safe Recording Flow

Use this for videos and first client calls, so no private accounts or real lead
data appear on screen.

1. Open:

```text
https://novahaus.valquilty.com/demo
```

2. Click `Hot Lead aufnehmen`.

3. Walk through the quiz using the visible demo scenario. The contact details
are fake and use reserved `example.com` addresses.

4. After submission, open the backend console from the thank-you page:

```text
https://novahaus.valquilty.com/demo/ops?scenario=hot
```

5. Explain that the console is the privacy-safe recording view. Do not open
private n8n, database, email, or client accounts during the SRM presentation.

Recommended talk track:

```text
This is a demo-safe run. Before the meeting, the private acceptance run verifies
that the same lead ID reaches the Lead Inbox, event history, reviewed email, and
hot-lead call task. Here I show the same operational fields without exposing
private accounts or personal data.
```

## What To Ask A Prospect

- How many leads do you get per month?
- Which Instagram account and property should the pilot use?
- Which property photos and publishing rights are available?
- Which Reel CTA should lead into the quiz?
- Which channels generate them: Meta, Google, portals, landing pages, referrals?
- How fast does a manager usually respond?
- What CRM or spreadsheet do you use?
- What makes a lead qualified for your team?
- Which questions do managers ask again and again?
- Who should receive hot leads: broker, callcenter, sales manager?
- Do you need drafts only, auto-send later, or call tasks only?

## Offer Packages

### Pilot Sprint

For one property, one market, one lead workflow.

Includes:

- a limited series of AI Reels from one property's approved material
- CTA and UTM source mapping for each Reel
- quiz landing page
- lead qualification logic
- Postgres Lead Inbox and event history
- human-reviewed email follow-up
- hot/warm/cold routing

### Implementation

For a firm that wants this as a real operating system.

Includes:

- custom copy and quiz structure
- qualification rules by property type
- CRM integration
- tracking setup with GTM and Meta
- AI email draft prompts
- handoff rules for sales or callcenter
- production deployment

### Monthly Ops

For improving the system after launch.

Includes:

- workflow monitoring
- lead quality review
- prompt improvements
- new segments
- reporting
- funnel experiments

## Objections

### "We already have a CRM."

This does not replace the CRM. It improves what happens before and around the CRM: qualification, response speed, draft preparation, and handoff context.

### "We do not want AI sending emails."

The default mode is draft-only. AI prepares the reply, and the team approves it.

### "Our leads come from portals."

The same workflow can be connected through forms, webhooks, email parsing, CSV import, or CRM triggers.

### "What about GDPR?"

The demo uses cookie consent for marketing trackers, avoids public API keys, and keeps email sending human-reviewed. A production client setup still needs legal review for their own policies and data processing agreements.

## Follow-up Email Template

```text
Subject: Reel-to-Lead pilot for one property

Hi [Name],

I built a working real-estate Reel-to-Lead demo:
property photos -> organic AI Reels -> quiz -> lead qualification -> reviewed email -> sales handoff.

The goal is not to replace sales. It is to create repeatable organic entry points,
then make sure each inquiry reaches the right next step with useful context.

Demo:
https://novahaus.valquilty.com/system

If useful, I can show how the same workflow would look for one of your current properties or lead sources.

Best,
[Your name]
```

## Contact CTA Configuration

The `/system` page uses public env vars for contact links:

```text
NEXT_PUBLIC_CONTACT_EMAIL=me@valquilty.com
NEXT_PUBLIC_CALENDLY_URL=
NEXT_PUBLIC_LINKEDIN_URL=https://www.linkedin.com/in/valentyn-havrychenko/
```

If `NEXT_PUBLIC_CALENDLY_URL` is set, the primary CTA becomes a booking link.
If it is empty, the primary CTA opens a prefilled email.
