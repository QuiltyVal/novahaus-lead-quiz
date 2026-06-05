export const DEFAULT_TENANT_ID = 'novahaus'

export const TENANT_CONFIGS = {
  novahaus: {
    tenantId: 'novahaus',
    projectId: 'leipzig-owner-apartments',
    brand: {
      name: 'NovaHaus Immobilien',
      language: 'de-DE',
      market: 'DE',
    },
    quiz: {
      source: 'novahaus_quiz',
      version: 'novahaus_object_quiz_v1',
      totalSteps: 5,
      propertyOptions: [
        {
          value: '3-zimmer',
          icon: 'garden',
          title: '3-Zimmer mit Garten',
          details: '92 m² • €329.000 • Bezugsfrei 03/2026',
          label: '3-Zimmer mit Garten (92 m², €329.000)',
          valueEur: 329000,
        },
        {
          value: '4-zimmer',
          icon: 'sun',
          title: '4-Zimmer mit Dachterrasse',
          details: '105 m² • €359.000 • Bezugsfrei 04/2026',
          label: '4-Zimmer Dachterrasse (105 m², €359.000)',
          valueEur: 359000,
        },
        {
          value: 'beide',
          icon: 'document',
          title: 'Beide Wohnungen',
          details: 'Ich möchte beide Exposés',
          label: 'Beide Wohnungen (€688.000)',
          valueEur: 688000,
        },
      ],
      purchaseTimelineOptions: [
        { value: 'sofort', icon: 'fire', text: 'So schnell wie möglich', label: 'So schnell wie möglich' },
        { value: '3-6-monate', icon: 'calendar', text: 'In den nächsten 3–6 Monaten', label: 'In 3–6 Monaten' },
        { value: 'informieren', icon: 'lightbulb', text: 'Ich informiere mich erst', label: 'Informiert sich erst' },
      ],
      equityBucketOptions: [
        { value: 'unter-30k', icon: 'money', text: 'Unter 30.000 €', label: 'Unter €30.000' },
        { value: '30-50k', icon: 'money', text: '30.000 – 50.000 €', label: '€30.000 – €50.000' },
        { value: '50-80k', icon: 'money', text: '50.000 – 80.000 €', label: '€50.000 – €80.000' },
        { value: 'ueber-80k', icon: 'bank', text: 'Über 80.000 €', label: 'Über €80.000' },
        { value: 'keine-angabe', icon: 'lock', text: 'Keine Angabe', label: 'Keine Angabe' },
      ],
      financingStatusOptions: [
        { value: 'vorhanden', icon: 'check', text: 'Ja, bereits vorhanden', label: 'Ja, vorhanden' },
        { value: 'in-planung', icon: 'document', text: 'Nein, aber in Planung', label: 'In Planung' },
        { value: 'benoetigt-hilfe', icon: 'handshake', text: 'Nein, brauche Unterstützung', label: 'Braucht Unterstützung' },
      ],
      softDisqualification: {
        triggerEquityBucket: 'unter-30k',
        recommendedMinimumEquity: '€50.000',
        alternativeTopics: [
          'Alternative Objekte in Ihrer Preisklasse',
          'Möglichkeiten zur Finanzierung',
        ],
      },
    },
    scoring: {
      notQualified: {
        equityBuckets: ['unter-30k'],
      },
      hot: {
        purchaseTimeline: 'sofort',
        equityBuckets: ['50-80k', 'ueber-80k'],
        financingStatus: 'vorhanden',
      },
      warm: {
        purchaseTimelines: ['sofort', '3-6-monate'],
        equityBuckets: ['30-50k', '50-80k', 'ueber-80k'],
      },
    },
    workflow: {
      segments: {
        not_qualified: {
          segment: 'not_qualified',
          status: 'not_qualified',
          priority: 'P4',
          nextAction: 'send_soft_disqualification_or_financing_options',
          assignedTo: 'ai_agent',
          followupMinutes: 60 * 24 * 3,
          handoffRequired: false,
          handoffReason: '',
          qualificationReason: 'minimum_equity_not_met',
        },
        hot: {
          segment: 'hot',
          status: 'ready_for_call',
          priority: 'P1',
          nextAction: 'call_center_call_within_15min_and_send_expose',
          assignedTo: 'call_center',
          followupMinutes: 15,
          handoffRequired: true,
          handoffReason: 'hot_lead_ready_for_call',
          qualificationReason: 'urgent_timeline_capital_and_financing_ready',
        },
        warm: {
          segment: 'warm',
          status: 'ai_follow_up',
          priority: 'P2',
          nextAction: 'send_clarifying_question_and_offer_call',
          assignedTo: 'ai_agent',
          followupMinutes: 120,
          handoffRequired: false,
          handoffReason: '',
          qualificationReason: 'active_buyer_but_financing_or_timing_needs_clarity',
        },
        cold: {
          segment: 'cold',
          status: 'nurture',
          priority: 'P3',
          nextAction: 'send_nurture_email',
          assignedTo: 'nurture_agent',
          followupMinutes: 60 * 24,
          handoffRequired: false,
          handoffReason: '',
          qualificationReason: 'early_research_or_missing_financing_signal',
        },
      },
    },
    email: {
      signature: 'NovaHaus Immobilien',
      systemInstructionSegments: {
        hot: 'confirm interest, offer a same-day short call, mention next steps and viewing coordination.',
        warm: 'ask one financing clarification and offer a short call.',
        cold: 'keep it helpful and low-pressure; invite reply when timing becomes concrete.',
        not_qualified: 'respond softly; suggest financing preparation or alternative options.',
      },
    },
  },
}

export const DEFAULT_TENANT_CONFIG = TENANT_CONFIGS[DEFAULT_TENANT_ID]

export function getTenantConfig(tenantId = DEFAULT_TENANT_ID) {
  return TENANT_CONFIGS[tenantId] || DEFAULT_TENANT_CONFIG
}

export function optionMap(options, labelKey = 'text') {
  return Object.fromEntries(options.map((option) => [option.value, option[labelKey] || option.text || option.title]))
}
