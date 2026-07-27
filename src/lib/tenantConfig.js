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
          propertyKeys: ['3-zimmer'],
        },
        {
          value: '4-zimmer',
          icon: 'sun',
          title: '4-Zimmer mit Dachterrasse',
          details: '105 m² • €359.000 • Bezugsfrei 04/2026',
          label: '4-Zimmer Dachterrasse (105 m², €359.000)',
          valueEur: 359000,
          propertyKeys: ['4-zimmer'],
        },
        {
          value: 'beide',
          icon: 'document',
          title: 'Beide Wohnungen',
          details: 'Ich möchte beide Exposés',
          label: 'Beide Wohnungen (€688.000)',
          valueEur: 688000,
          propertyKeys: ['3-zimmer', '4-zimmer'],
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

  // B2B fit check for the Objekt-Pilot. Replaces the sales call: the questions
  // an agency would be asked on a first call are asked by this form instead, so
  // the whole path from ad to enquiry works in writing.
  makler: {
    tenantId: 'makler',
    projectId: 'objekt-pilot',
    brand: {
      name: 'NovaHaus Objekt-Pilot',
      language: 'de-DE',
      market: 'DE',
    },
    quiz: {
      source: 'makler_pilot_check',
      version: 'makler_pilot_check_v1',
      totalSteps: 5,
      propertyQuestion: 'Wie viele Objekte vermarkten Sie aktuell?',
      propertyFieldLabel: 'Objektbestand',
      propertyOptions: [
        { value: '1-5', icon: 'document', title: '1–5 Objekte', details: 'Kleiner, wechselnder Bestand', label: '1–5 Objekte', valueEur: 0 },
        { value: '6-15', icon: 'garden', title: '6–15 Objekte', details: 'Regelmäßig neue Vermarktungen', label: '6–15 Objekte', valueEur: 0 },
        { value: '16-40', icon: 'sun', title: '16–40 Objekte', details: 'Laufender Objektfluss', label: '16–40 Objekte', valueEur: 0 },
        { value: 'ueber-40', icon: 'bank', title: 'Über 40 Objekte', details: 'Großer Bestand oder Projektentwicklung', label: 'Über 40 Objekte', valueEur: 0 },
      ],
      purchaseTimelineQuestion: 'Wann möchten Sie mit einem Pilotobjekt starten?',
      purchaseTimelineOptions: [
        { value: 'sofort', icon: 'fire', text: 'So schnell wie möglich', label: 'Sofort' },
        { value: '3-6-monate', icon: 'calendar', text: 'In den nächsten Wochen', label: 'In den nächsten Wochen' },
        { value: 'informieren', icon: 'lightbulb', text: 'Ich informiere mich zunächst', label: 'Informiert sich' },
      ],
      equityQuestion: 'Wie viele Anfragen erhalten Sie ungefähr pro Monat?',
      equityBucketOptions: [
        { value: 'unter-10', icon: 'document', text: 'Unter 10', label: 'Unter 10 Anfragen' },
        { value: '10-30', icon: 'chart', text: '10 – 30', label: '10–30 Anfragen' },
        { value: '30-100', icon: 'chart', text: '30 – 100', label: '30–100 Anfragen' },
        { value: 'ueber-100', icon: 'bank', text: 'Über 100', label: 'Über 100 Anfragen' },
        { value: 'keine-angabe', icon: 'lock', text: 'Keine Angabe', label: 'Keine Angabe' },
      ],
      financingQuestion: 'Wer bearbeitet eingehende Anfragen bei Ihnen?',
      financingStatusOptions: [
        { value: 'vorhanden', icon: 'check', text: 'Feste zuständige Person', label: 'Feste Person' },
        { value: 'in-planung', icon: 'handshake', text: 'Wechselnd im Team', label: 'Wechselnd im Team' },
        { value: 'benoetigt-hilfe', icon: 'document', text: 'Niemand fest zuständig', label: 'Niemand fest' },
      ],
      contactQuestion: 'Wohin dürfen wir die Pilot-Einschätzung senden?',
      submitLabel: 'Pilot-Anfrage senden →',
      consentText:
        'Ich stimme der Datenschutzerklärung zu und möchte zu meiner Pilot-Anfrage kontaktiert werden. *',
      branching: {
        // A broker leaving a phone number is welcome but never required: the
        // whole point of this funnel is that it works without a call.
        optionalPhoneFor: ['1-5', '6-15', '16-40', 'ueber-40'],
      },
      softDisqualification: {
        // Never triggers: a B2B enquiry is always worth a human answer.
        triggerEquityBucket: '__never__',
        recommendedMinimumEquity: '',
        alternativeTopics: [],
      },
    },
    scoring: {
      notQualified: { equityBuckets: [] },
      hot: { purchaseTimeline: 'sofort', equityBuckets: ['30-100', 'ueber-100'], financingStatus: 'vorhanden' },
      warm: { purchaseTimelines: ['sofort', '3-6-monate'], equityBuckets: ['10-30', '30-100', 'ueber-100'] },
    },
    workflow: {
      segments: {
        not_qualified: { segment: 'not_qualified', status: 'nurture', priority: 'P4', nextAction: 'send_written_answer', assignedTo: 'ai_agent', followupMinutes: 60 * 24, handoffRequired: false, handoffReason: '', qualificationReason: 'unclear_fit' },
        // A qualified agency enquiry is worth a dedicated alert, not just a BCC
        // copy of the confirmation mail the sender receives.
        hot: { segment: 'hot', status: 'ai_follow_up', priority: 'P1', nextAction: 'send_pilot_scope_and_invoice_details', assignedTo: 'ai_agent', followupMinutes: 60, handoffRequired: true, handoffReason: 'qualified_agency_enquiry', qualificationReason: 'object_flow_lead_volume_and_owner_in_place' },
        warm: { segment: 'warm', status: 'ai_follow_up', priority: 'P2', nextAction: 'send_pilot_scope_and_one_clarifying_question', assignedTo: 'ai_agent', followupMinutes: 120, handoffRequired: false, handoffReason: '', qualificationReason: 'fits_but_timing_or_ownership_unclear' },
        cold: { segment: 'cold', status: 'nurture', priority: 'P3', nextAction: 'send_pilot_overview', assignedTo: 'nurture_agent', followupMinutes: 60 * 24, handoffRequired: false, handoffReason: '', qualificationReason: 'early_interest' },
      },
    },
    email: {
      signature: 'NovaHaus',
      systemInstructionSegments: {
        hot: 'send the concrete Objekt-Pilot scope, what we need from them, the price and the next step in writing. Offer a call only if they ask for one.',
        warm: 'send the Objekt-Pilot scope and ask one clarifying question about the pilot object or timing. Written, no call pressure.',
        cold: 'send a short overview of the Objekt-Pilot and invite a written reply when it becomes relevant.',
        not_qualified: 'answer helpfully in writing and explain honestly which setup the pilot needs to work.',
      },
    },
  },

  // Content funnel: traffic from the public Leipzig info channel.
  // Starts with intent, never promises a specific listing or an Exposé,
  // and does not collect consent for a partner handoff that does not exist yet.
  leipzig: {
    tenantId: 'leipzig',
    projectId: 'leipzig-content-funnel',
    brand: {
      name: 'Leipzig Wohnen & Investieren',
      language: 'de-DE',
      market: 'DE',
    },
    quiz: {
      source: 'leipzig_content_quiz',
      version: 'leipzig_intent_quiz_v1',
      totalSteps: 5,
      propertyQuestion: 'Was suchst du in Leipzig?',
      propertyFieldLabel: 'Interesse',
      propertyOptions: [
        {
          value: 'eigenheim',
          icon: 'garden',
          title: 'Eine Wohnung zum Wohnen',
          details: 'Ich möchte in Leipzig selbst einziehen',
          label: 'Eigennutzung',
          valueEur: 0,
        },
        {
          value: 'kapitalanlage',
          icon: 'chart',
          title: 'Eine Kapitalanlage',
          details: 'Ich möchte in Leipzig investieren',
          label: 'Kapitalanlage',
          valueEur: 0,
        },
        {
          value: 'informieren',
          icon: 'lightbulb',
          title: 'Ich informiere mich zunächst',
          details: 'Zahlen, Viertel und Kosten verstehen',
          label: 'Informiert sich',
          valueEur: 0,
        },
      ],
      purchaseTimelineQuestion: 'Wann möchtest du handeln?',
      equityQuestion: 'Wie viel Eigenkapital steht dir zur Verfügung?',
      financingQuestion: 'Wie ist die Finanzierung geplant?',
      contactQuestion: 'Wohin dürfen wir deine Leipzig-Einschätzung senden?',
      submitLabel: 'Kostenlose Leipzig-Einschätzung erhalten →',
      consentText:
        'Ich stimme der Datenschutzerklärung zu und möchte meine Leipzig-Einschätzung per E-Mail erhalten. *',
      // Someone who is only informing themselves is not asked about capital
      // or financing: that data is not needed for an information request.
      branching: {
        skipEquityAndFinancingFor: ['informieren'],
        optionalPhoneFor: ['informieren'],
      },
      purchaseTimelineOptions: [
        { value: 'sofort', icon: 'fire', text: 'So schnell wie möglich', label: 'So schnell wie möglich' },
        { value: '3-6-monate', icon: 'calendar', text: 'In den nächsten 3–6 Monaten', label: 'In 3–6 Monaten' },
        { value: 'informieren', icon: 'lightbulb', text: 'Noch offen', label: 'Zeitrahmen offen' },
      ],
      equityBucketOptions: [
        { value: 'unter-30k', icon: 'money', text: 'Unter 30.000 €', label: 'Unter €30.000' },
        { value: '30-50k', icon: 'money', text: '30.000 – 50.000 €', label: '€30.000 – €50.000' },
        { value: '50-80k', icon: 'money', text: '50.000 – 80.000 €', label: '€50.000 – €80.000' },
        { value: 'ueber-80k', icon: 'bank', text: 'Über 80.000 €', label: 'Über €80.000' },
        { value: 'keine-angabe', icon: 'lock', text: 'Keine Angabe', label: 'Keine Angabe' },
      ],
      financingStatusOptions: [
        { value: 'vorhanden', icon: 'check', text: 'Ja, Finanzierung ist geklärt', label: 'Ja, vorhanden' },
        { value: 'in-planung', icon: 'document', text: 'In Prüfung oder Planung', label: 'In Planung' },
        { value: 'benoetigt-hilfe', icon: 'handshake', text: 'Ich brauche Unterstützung', label: 'Braucht Unterstützung' },
      ],
      softDisqualification: {
        triggerEquityBucket: 'unter-30k',
        recommendedMinimumEquity: '€50.000',
        alternativeTopics: [
          'Wie viel Eigenkapital in Leipzig realistisch nötig ist',
          'Welche Viertel im Einstiegssegment liegen',
        ],
      },
    },
    scoring: {
      notQualified: { equityBuckets: ['unter-30k'] },
      hot: { purchaseTimeline: 'sofort', equityBuckets: ['50-80k', 'ueber-80k'], financingStatus: 'vorhanden' },
      warm: { purchaseTimelines: ['sofort', '3-6-monate'], equityBuckets: ['30-50k', '50-80k', 'ueber-80k'] },
    },
    workflow: {
      segments: {
        not_qualified: { segment: 'not_qualified', status: 'not_qualified', priority: 'P4', nextAction: 'send_information_and_financing_basics', assignedTo: 'ai_agent', followupMinutes: 60 * 24 * 3, handoffRequired: false, handoffReason: '', qualificationReason: 'minimum_equity_not_met' },
        hot: { segment: 'hot', status: 'ai_follow_up', priority: 'P1', nextAction: 'send_leipzig_assessment_and_offer_written_follow_up', assignedTo: 'ai_agent', followupMinutes: 60, handoffRequired: false, handoffReason: '', qualificationReason: 'urgent_timeline_capital_and_financing_ready' },
        warm: { segment: 'warm', status: 'ai_follow_up', priority: 'P2', nextAction: 'send_leipzig_assessment_and_one_clarifying_question', assignedTo: 'ai_agent', followupMinutes: 120, handoffRequired: false, handoffReason: '', qualificationReason: 'active_interest_but_financing_or_timing_needs_clarity' },
        cold: { segment: 'cold', status: 'nurture', priority: 'P3', nextAction: 'send_leipzig_assessment', assignedTo: 'nurture_agent', followupMinutes: 60 * 24, handoffRequired: false, handoffReason: '', qualificationReason: 'early_research_or_information_request' },
      },
    },
    email: {
      signature: 'Leipzig Wohnen & Investieren',
      systemInstructionSegments: {
        hot: 'send the Leipzig assessment, name concrete next steps the reader can take alone, and offer a written follow-up. Do not promise a specific property, a viewing or a broker handoff.',
        warm: 'send the Leipzig assessment and ask one clarifying question about timing or financing. Do not promise a specific property or a broker handoff.',
        cold: 'send the Leipzig assessment, keep it purely informative and low-pressure. Do not promise a specific property or a broker handoff.',
        not_qualified: 'respond softly, explain what equity is realistically needed in Leipzig and point to financing basics. No sales pressure.',
      },
    },
  },

  investor: {
    tenantId: 'investor',
    projectId: 'kapitalanlage-check',
    brand: {
      name: 'NovaHaus Kapitalanlage-Check',
      language: 'de-DE',
      market: 'DE',
    },
    quiz: {
      source: 'investor_quiz',
      version: 'investor_quiz_v1',
      totalSteps: 5,
      propertyQuestion: 'Was ist Ihr Ziel mit der Kapitalanlage?',
      propertyFieldLabel: 'Investitionsziel',
      propertyOptions: [
        { value: 'rendite', icon: 'money', title: 'Rendite', details: 'Mieteinnahmen und laufender Cashflow', label: 'Rendite', valueEur: 0 },
        { value: 'altersvorsorge', icon: 'bank', title: 'Altersvorsorge', details: 'Langfristig Vermögen für später aufbauen', label: 'Altersvorsorge', valueEur: 0 },
        { value: 'vermoegensaufbau', icon: 'chart', title: 'Vermögensaufbau', details: 'Sachwerte und Eigenkapital strategisch nutzen', label: 'Vermögensaufbau', valueEur: 0 },
      ],
      purchaseTimelineQuestion: 'Wann möchten Sie kaufen?',
      equityQuestion: 'Wie viel Eigenkapital möchten Sie einsetzen?',
      financingQuestion: 'Wie ist Ihr Finanzierungsstatus?',
      contactQuestion: 'Wohin dürfen wir Ihre Einschätzung senden?',
      submitLabel: 'Kapitalanlage-Check anfragen →',
      consentText: 'Ich stimme der Datenschutzerklärung zu und möchte kontaktiert werden. Dies umfasst die Weitergabe meiner Daten an ein Partnerunternehmen zur Kontaktaufnahme. *',
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
        { value: 'vorhanden', icon: 'check', text: 'Ja, Finanzierung ist geklärt', label: 'Ja, vorhanden' },
        { value: 'in-planung', icon: 'document', text: 'In Prüfung oder Planung', label: 'In Planung' },
        { value: 'benoetigt-hilfe', icon: 'handshake', text: 'Ich brauche Unterstützung', label: 'Braucht Unterstützung' },
      ],
      softDisqualification: {
        triggerEquityBucket: 'unter-30k',
        recommendedMinimumEquity: '€50.000',
        alternativeTopics: ['Finanzierungsrahmen vorbereiten', 'Passende Einstiegsobjekte prüfen'],
      },
    },
    scoring: {
      notQualified: { equityBuckets: ['unter-30k'] },
      hot: { purchaseTimeline: 'sofort', equityBuckets: ['50-80k', 'ueber-80k'], financingStatus: 'vorhanden' },
      warm: { purchaseTimelines: ['sofort', '3-6-monate'], equityBuckets: ['30-50k', '50-80k', 'ueber-80k'] },
    },
    workflow: {
      segments: {
        not_qualified: { segment: 'not_qualified', status: 'not_qualified', priority: 'P4', nextAction: 'send_soft_disqualification_or_financing_options', assignedTo: 'ai_agent', followupMinutes: 60 * 24 * 3, handoffRequired: false, handoffReason: '', qualificationReason: 'minimum_equity_not_met' },
        hot: { segment: 'hot', status: 'ready_for_call', priority: 'P1', nextAction: 'partner_call_within_15min', assignedTo: 'call_center', followupMinutes: 15, handoffRequired: true, handoffReason: 'hot_investor_ready_for_call', qualificationReason: 'urgent_timeline_capital_and_financing_ready' },
        warm: { segment: 'warm', status: 'ai_follow_up', priority: 'P2', nextAction: 'send_clarifying_question_and_offer_call', assignedTo: 'ai_agent', followupMinutes: 120, handoffRequired: false, handoffReason: '', qualificationReason: 'active_investor_but_financing_or_timing_needs_clarity' },
        cold: { segment: 'cold', status: 'nurture', priority: 'P3', nextAction: 'send_nurture_email', assignedTo: 'nurture_agent', followupMinutes: 60 * 24, handoffRequired: false, handoffReason: '', qualificationReason: 'early_research_or_missing_financing_signal' },
      },
    },
    email: {
      signature: 'NovaHaus Kapitalanlage-Check',
      systemInstructionSegments: {
        hot: 'confirm interest, offer a prompt investment-fit call, mention financing and property matching as next steps.',
        warm: 'ask one financing or investment goal clarification and offer a short call.',
        cold: 'keep it helpful and low-pressure; invite reply when investment timing becomes concrete.',
        not_qualified: 'respond softly; suggest financing preparation before selecting an investment property.',
      },
    },
  },
}

export const DEFAULT_TENANT_CONFIG = TENANT_CONFIGS[DEFAULT_TENANT_ID]
export const INVESTOR_TENANT_CONFIG = TENANT_CONFIGS.investor
export const LEIPZIG_TENANT_CONFIG = TENANT_CONFIGS.leipzig
export const MAKLER_TENANT_CONFIG = TENANT_CONFIGS.makler

export function getTenantConfig(tenantId = DEFAULT_TENANT_ID) {
  return TENANT_CONFIGS[tenantId] || DEFAULT_TENANT_CONFIG
}

export function optionMap(options, labelKey = 'text') {
  return Object.fromEntries(options.map((option) => [option.value, option[labelKey] || option.text || option.title]))
}
