# NovaHaus Lead-to-Call Sales Playbook

Use this when presenting the system to real-estate firms, agencies, developers, or broker teams.

## Positioning

Do not sell this as "AI replaces sales".

Sell it as:

```text
A fast-response lead qualification system for real-estate teams.
It captures intent, qualifies the lead, prepares the follow-up, and gives sales a clear call context.
```

Core promise:

```text
Reduce lead cooling time and make every inquiry easier to act on.
```

## Demo Flow

1. Open the B2B page:

```text
https://novahaus.valquilty.com/system
```

2. Open the live consumer demo:

```text
https://novahaus.valquilty.com
```

3. Run one quiz submission:

```text
https://novahaus.valquilty.com/quiz
```

4. Show the operational backend:

```text
n8n execution -> Google Sheets row -> Email Queue row -> Gmail draft
```

5. Explain the safety layer:

```text
AI creates drafts, not automatic sends. The human reviews before sending.
```

## What To Ask A Prospect

- How many leads do you get per month?
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

- quiz landing page
- lead qualification logic
- n8n workflow
- Google Sheets or CRM sync
- Gmail draft follow-up
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
Subject: Lead response workflow for your real-estate inquiries

Hi [Name],

I built a small working demo of a real-estate lead-to-call system:
quiz landing page -> lead qualification -> workflow automation -> CRM/Sheet entry -> AI email draft -> sales handoff.

The goal is not to replace sales, but to make sure new inquiries are handled while they are still warm and sales receives useful context before calling.

Demo:
https://novahaus.valquilty.com/system

If useful, I can show how the same workflow would look for one of your current properties or lead sources.

Best,
[Your name]
```
