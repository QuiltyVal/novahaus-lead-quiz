'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trackEvent } from '@/lib/tracking'
import { calculateLeadScore } from '@/lib/leadScoring'
import { DEMO_SCENARIOS, getDemoScenario } from '@/lib/demoScenarios'
import {
  IconGarden,
  IconSun,
  IconCheck,
  IconLock,
  QUIZ_ICONS,
} from './icons'

/* ============================================
   PHONE INPUT — Country codes + formatting
   ============================================ */
const COUNTRIES = [
  { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Deutschland', format: '### ########', minDigits: 10, maxDigits: 12 },
  { code: 'AT', dial: '+43', flag: '🇦🇹', name: 'Österreich', format: '### #######', minDigits: 9, maxDigits: 11 },
  { code: 'CH', dial: '+41', flag: '🇨🇭', name: 'Schweiz', format: '## ### ## ##', minDigits: 9, maxDigits: 10 },
  { code: 'PL', dial: '+48', flag: '🇵🇱', name: 'Polska', format: '### ### ###', minDigits: 9, maxDigits: 9 },
  { code: 'CZ', dial: '+420', flag: '🇨🇿', name: 'Česko', format: '### ### ###', minDigits: 9, maxDigits: 9 },
  { code: 'NL', dial: '+31', flag: '🇳🇱', name: 'Nederland', format: '# ########', minDigits: 9, maxDigits: 10 },
  { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France', format: '# ## ## ## ##', minDigits: 9, maxDigits: 10 },
  { code: 'IT', dial: '+39', flag: '🇮🇹', name: 'Italia', format: '### #######', minDigits: 9, maxDigits: 11 },
  { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'España', format: '### ### ###', minDigits: 9, maxDigits: 9 },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom', format: '#### ######', minDigits: 10, maxDigits: 11 },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States', format: '(###) ###-####', minDigits: 10, maxDigits: 10 },
  { code: 'RU', dial: '+7', flag: '🇷🇺', name: 'Россия', format: '### ###-##-##', minDigits: 10, maxDigits: 10 },
  { code: 'UA', dial: '+380', flag: '🇺🇦', name: 'Україна', format: '## ### ## ##', minDigits: 9, maxDigits: 9 },
  { code: 'TR', dial: '+90', flag: '🇹🇷', name: 'Türkiye', format: '### ### ## ##', minDigits: 10, maxDigits: 10 },
]

const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map(c => [c.code, c]))

function parsePhoneValue(phoneValue) {
  const value = String(phoneValue || '').trim()
  if (!value) return null

  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((candidate) => value.startsWith(candidate.dial))

  if (!match) return null

  return {
    country: match,
    localNumber: value.slice(match.dial.length).trim(),
  }
}

function PhoneInput({ value, onChange, hasError, onClearError }) {
  const [country, setCountry] = useState(COUNTRIES[0]) // default DE
  const [localNumber, setLocalNumber] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const wrapperRef = useRef(null)

  /* Auto-detect country on mount via timezone (no network needed) */
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      const tzMap = {
        'Europe/Berlin': 'DE', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH',
        'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Amsterdam': 'NL',
        'Europe/Paris': 'FR', 'Europe/Rome': 'IT', 'Europe/Madrid': 'ES',
        'Europe/London': 'GB', 'America/New_York': 'US', 'America/Chicago': 'US',
        'America/Los_Angeles': 'US', 'Europe/Moscow': 'RU', 'Europe/Kiev': 'UA',
        'Europe/Istanbul': 'TR',
      }
      const detected = tzMap[tz]
      if (detected && COUNTRY_BY_CODE[detected]) {
        setCountry(COUNTRY_BY_CODE[detected])
      }
    } catch {}
  }, [])

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* Demo mode can provide a prefilled full phone value. */
  useEffect(() => {
    if (!value || localNumber) return
    const parsed = parsePhoneValue(value)
    if (!parsed) return
    setCountry(parsed.country)
    setLocalNumber(parsed.localNumber)
  }, [value, localNumber])

  /* Sync full phone value to parent */
  useEffect(() => {
    const digits = localNumber.replace(/\D/g, '')
    if (digits.length > 0) {
      onChange(`${country.dial} ${localNumber.trim()}`)
    } else {
      onChange('')
    }
  }, [country, localNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Format as user types */
  const handleInput = (e) => {
    let raw = e.target.value.replace(/[^\d\s\-()]/g, '') // allow digits, spaces, dashes, parens
    // Strip leading zero (common in DE: 0170... → 170...)
    const digits = raw.replace(/\D/g, '')
    if (digits.length > country.maxDigits) {
      raw = raw.slice(0, raw.length - 1)
    }
    setLocalNumber(raw)
    if (onClearError) onClearError()
  }

  const selectCountry = (c) => {
    setCountry(c)
    setDropdownOpen(false)
    if (onClearError) onClearError()
  }

  const digits = localNumber.replace(/\D/g, '')
  const isValidLength = digits.length >= country.minDigits && digits.length <= country.maxDigits

  return (
    <div className="phone-input-wrapper" ref={wrapperRef}>
      <div className={`phone-input-container${hasError ? ' error' : ''}`}>
        <button
          type="button"
          className="phone-country-btn"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label="Land wählen"
        >
          <span className="phone-flag">{country.flag}</span>
          <span className="phone-dial">{country.dial}</span>
          <span className="phone-arrow">{dropdownOpen ? '▲' : '▼'}</span>
        </button>
        <input
          type="tel"
          id="phone"
          className="phone-number-input"
          placeholder={country.format.replace(/#/g, '0')}
          value={localNumber}
          onChange={handleInput}
          autoComplete="tel-national"
        />
      </div>
      {dropdownOpen && (
        <div className="phone-dropdown">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              className={`phone-dropdown-item${c.code === country.code ? ' active' : ''}`}
              onClick={() => selectCountry(c)}
            >
              <span className="phone-flag">{c.flag}</span>
              <span className="phone-dropdown-name">{c.name}</span>
              <span className="phone-dropdown-dial">{c.dial}</span>
            </button>
          ))}
        </div>
      )}
      {localNumber && !isValidLength && (
        <span className="phone-hint">
          {digits.length < country.minDigits
            ? `Noch ${country.minDigits - digits.length} Ziffern`
            : 'Nummer zu lang'}
        </span>
      )}
    </div>
  )
}

/* ============================================
   QUIZ DATA CONFIG
   ============================================ */
const OBJECTS = [
  {
    value: '3-zimmer',
    Icon: IconGarden,
    title: '3-Zimmer mit Garten',
    details: '92 m² • €329.000 • Bezugsfrei 03/2026',
  },
  {
    value: '4-zimmer',
    Icon: IconSun,
    title: '4-Zimmer mit Dachterrasse',
    details: '105 m² • €359.000 • Bezugsfrei 04/2026',
  },
  {
    value: 'beide',
    Icon: (props) => QUIZ_ICONS.document(props),
    title: 'Beide Wohnungen',
    details: 'Ich möchte beide Exposés',
  },
]

const ZEITRAHMEN = [
  { value: 'sofort', icon: 'fire', text: 'So schnell wie möglich' },
  { value: '3-6-monate', icon: 'calendar', text: 'In den nächsten 3–6 Monaten' },
  { value: 'informieren', icon: 'lightbulb', text: 'Ich informiere mich erst' },
]

const EIGENKAPITAL = [
  { value: 'unter-30k', icon: 'money', text: 'Unter 30.000 €' },
  { value: '30-50k', icon: 'money', text: '30.000 – 50.000 €' },
  { value: '50-80k', icon: 'money', text: '50.000 – 80.000 €' },
  { value: 'ueber-80k', icon: 'bank', text: 'Über 80.000 €' },
  { value: 'keine-angabe', icon: 'lock', text: 'Keine Angabe' },
]

const FINANZIERUNG = [
  { value: 'vorhanden', icon: 'check', text: 'Ja, bereits vorhanden' },
  { value: 'in-planung', icon: 'document', text: 'Nein, aber in Planung' },
  { value: 'benoetigt-hilfe', icon: 'handshake', text: 'Nein, brauche Unterstützung' },
]

const TOTAL_STEPS = 5
const AUTO_ADVANCE_DELAY = 350 // ms — brief flash to show selection

/* ============================================
   Reusable Radio Option with SVG Icon
   ============================================ */
function RadioOption({ iconKey, text, selected, onClick }) {
  const IconFn = QUIZ_ICONS[iconKey]
  return (
    <div
      className={`radio-option${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
      <div className="radio-option-icon">
        {IconFn ? IconFn({ size: 22, strokeWidth: 1.5 }) : null}
      </div>
      <div className="radio-option-text">{text}</div>
      <div className="radio-dot" />
    </div>
  )
}

/* ============================================
   QUIZ COMPONENT
   ============================================ */
/* Valid wohnung values for URL pre-selection */
const VALID_WOHNUNG = ['3-zimmer', '4-zimmer', 'beide']

export default function Quiz() {
  const router = useRouter()
  const searchParams = useSearchParams()

  /* Check if a wohnung was pre-selected via URL (e.g. from FloorPlans click) */
  const preselected = searchParams.get('wohnung')
  const isPreselected = preselected && VALID_WOHNUNG.includes(preselected)
  const demoParam = searchParams.get('demo')
  const demoScenario = DEMO_SCENARIOS[demoParam] ? getDemoScenario(demoParam) : null
  const isDemoMode = Boolean(demoScenario)

  const [step, setStep] = useState(isPreselected ? 2 : 1)
  const [answers, setAnswers] = useState({
    wohnung: demoScenario?.wohnung || (isPreselected ? preselected : null),
    zeitrahmen: demoScenario?.zeitrahmen || null,
    eigenkapital: demoScenario?.eigenkapital || null,
    finanzierung: demoScenario?.finanzierung || null,
  })
  const [formData, setFormData] = useState({
    firstName: demoScenario?.firstName || '',
    lastName: demoScenario?.lastName || '',
    email: demoScenario?.email || '',
    phone: demoScenario?.phone || '',
    consent: false,
  })
  const [errors, setErrors] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [underqualified, setUnderqualified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  /* ---------- Navigation ---------- */
  const goToStep = useCallback((newStep) => {
    setStep(newStep)
    setAnimKey((k) => k + 1)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  /* ---------- Auto-advance helpers ---------- */
  const selectAndAdvance = (key, value, nextStep) => {
    setAnswers((a) => ({ ...a, [key]: value }))
    setTimeout(() => goToStep(nextStep), AUTO_ADVANCE_DELAY)
  }

  /* Step 1 — click card → select + go to step 2 */
  const handleObjectClick = (value) => {
    selectAndAdvance('wohnung', value, 2)
  }

  /* Step 2 — click option → select + go to step 3 */
  const handleZeitrahmenClick = (value) => {
    selectAndAdvance('zeitrahmen', value, 3)
  }

  /* Step 3 — click option → select + check soft disqualification */
  const handleEigenkapitalClick = (value) => {
    setAnswers((a) => ({ ...a, eigenkapital: value }))
    setTimeout(() => {
      if (value === 'unter-30k') {
        setShowModal(true)
      } else {
        goToStep(4)
      }
    }, AUTO_ADVANCE_DELAY)
  }

  /* Step 4 — click option → select + go to step 5 */
  const handleFinanzierungClick = (value) => {
    selectAndAdvance('finanzierung', value, 5)
  }

  /* ---------- Modal handlers ---------- */
  const modalContinue = () => {
    setUnderqualified(true)
    setShowModal(false)
    goToStep(4)
  }

  const modalAlternative = () => {
    setUnderqualified(true)
    setShowModal(false)
    goToStep(5)
  }

  /* ---------- Form validation ---------- */
  const validateForm = () => {
    const errs = {}
    if (!formData.firstName.trim()) errs.firstName = true
    if (!formData.lastName.trim()) errs.lastName = true
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errs.email = true
    // Phone: must have country code + at least 7 digits
    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (!formData.phone.trim() || phoneDigits.length < 7) errs.phone = true
    if (!formData.consent) errs.consent = true
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  /* ---------- Submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)

    const leadScore = calculateLeadScore(answers)

    const source = getUTMParams()
    const demoSource = isDemoMode
      ? {
          utm_source: source.utm_source || 'portfolio_demo',
          utm_medium: source.utm_medium || 'recording',
          utm_campaign: source.utm_campaign || `novahaus_demo_${demoScenario.key}`,
          utm_content: source.utm_content || demoScenario.key,
          utm_term: source.utm_term || 'demo_safe',
        }
      : source

    const resolvedDemoScenario = isDemoMode ? leadScore : ''

    const leadData = {
      ...answers,
      ...formData,
      lead_score: leadScore,
      underqualified,
      source: demoSource,
      demo_mode: isDemoMode,
      demo_scenario: resolvedDemoScenario,
      timestamp: new Date().toISOString(),
    }

    const leadValue =
      answers.wohnung === '4-zimmer'
        ? 359000
        : answers.wohnung === 'beide'
        ? 688000
        : 329000

    trackEvent(
      'Lead',
      {
        content_name: answers.wohnung,
        lead_score: leadScore,
        value: leadValue,
        currency: 'EUR',
      },
      {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      }
    )

    try {
      sessionStorage.setItem('novahaus_lead', JSON.stringify(leadData))
    } catch {}

    // Demo-safe runs are for recording and do not need to wait for n8n/Gmail.
    if (!isDemoMode) {
      try {
        await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
        })
      } catch (err) {
        console.warn('Lead API error (non-blocking):', err)
      }
    }

    try {
      await router.push('/danke')
    } catch {
      setSubmitting(false)
    }
  }

  /* ---------- Progress ---------- */
  const pct = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <>
      <section className="quiz-section" id="quiz">
        <div className="quiz-container">
          {isDemoMode && (
            <div className="demo-mode-banner">
              <span>Demo-Modus</span>
              <strong>{demoScenario.label}</strong>
              <p>
                Der passende Demo-Pfad ist vorausgewählt. Klicke die markierten
                Antworten durch; danach zeigt die Backend-Konsole den E-Mail-Draft.
              </p>
            </div>
          )}

          {/* Progress Bar — at the top */}
          <div className="progress-wrapper">
            <div className="progress-label">
              <span>Schritt {step} von {TOTAL_STEPS}</span>
              <span>{pct} %</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* ===== STEP 1 — Objektauswahl ===== */}
          {step === 1 && (
            <div className="quiz-step" key={`s1-${animKey}`}>
              <h3>Welche Wohnung interessiert Sie?</h3>
              <div className="object-cards">
                {OBJECTS.map((obj) => (
                  <div
                    key={obj.value}
                    className={`object-card${answers.wohnung === obj.value ? ' selected' : ''}`}
                    onClick={() => handleObjectClick(obj.value)}
                  >
                    <div className="object-card-icon">
                      <obj.Icon size={26} strokeWidth={1.5} />
                    </div>
                    <div className="object-card-content">
                      <h4>{obj.title}</h4>
                      <p>{obj.details}</p>
                    </div>
                    <div className="object-card-check">
                      {answers.wohnung === obj.value && (
                        <IconCheck size={14} strokeWidth={2.5} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== STEP 2 — Zeitrahmen ===== */}
          {step === 2 && (
            <div className="quiz-step" key={`s2-${animKey}`}>
              <h3>Wann planen Sie den Kauf?</h3>
              <div className="radio-options">
                {ZEITRAHMEN.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    iconKey={opt.icon}
                    text={opt.text}
                    selected={answers.zeitrahmen === opt.value}
                    onClick={() => handleZeitrahmenClick(opt.value)}
                  />
                ))}
              </div>
              <div className="quiz-nav-compact">
                <button className="btn-back-sm" onClick={() => goToStep(1)}>← Zurück</button>
              </div>
            </div>
          )}

          {/* ===== STEP 3 — Eigenkapital ===== */}
          {step === 3 && (
            <div className="quiz-step" key={`s3-${animKey}`}>
              <h3>Wie viel Eigenkapital haben Sie?</h3>
              <div className="radio-options">
                {EIGENKAPITAL.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    iconKey={opt.icon}
                    text={opt.text}
                    selected={answers.eigenkapital === opt.value}
                    onClick={() => handleEigenkapitalClick(opt.value)}
                  />
                ))}
              </div>
              <div className="quiz-nav-compact">
                <button className="btn-back-sm" onClick={() => goToStep(2)}>← Zurück</button>
              </div>
            </div>
          )}

          {/* ===== STEP 4 — Finanzierung ===== */}
          {step === 4 && (
            <div className="quiz-step" key={`s4-${animKey}`}>
              <h3>Haben Sie eine Finanzierungszusage?</h3>
              <div className="radio-options">
                {FINANZIERUNG.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    iconKey={opt.icon}
                    text={opt.text}
                    selected={answers.finanzierung === opt.value}
                    onClick={() => handleFinanzierungClick(opt.value)}
                  />
                ))}
              </div>
              <div className="quiz-nav-compact">
                <button className="btn-back-sm" onClick={() => goToStep(3)}>← Zurück</button>
              </div>
            </div>
          )}

          {/* ===== STEP 5 — Kontaktdaten ===== */}
          {step === 5 && (
            <div className="quiz-step" key={`s5-${animKey}`}>
              <h3>Wohin dürfen wir Ihr Exposé senden?</h3>
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="firstName">Vorname *</label>
                    <input
                      type="text" id="firstName" placeholder="Max"
                      className={errors.firstName ? 'error' : ''}
                      value={formData.firstName}
                      onChange={(e) => { setFormData((f) => ({ ...f, firstName: e.target.value })); setErrors((er) => ({ ...er, firstName: false })) }}
                    />
                    <span className="error-text">Bitte Vornamen eingeben</span>
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Nachname *</label>
                    <input
                      type="text" id="lastName" placeholder="Mustermann"
                      className={errors.lastName ? 'error' : ''}
                      value={formData.lastName}
                      onChange={(e) => { setFormData((f) => ({ ...f, lastName: e.target.value })); setErrors((er) => ({ ...er, lastName: false })) }}
                    />
                    <span className="error-text">Bitte Nachnamen eingeben</span>
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">E-Mail *</label>
                    <input
                      type="email" id="email" placeholder="max@beispiel.de"
                      className={errors.email ? 'error' : ''}
                      value={formData.email}
                      onChange={(e) => { setFormData((f) => ({ ...f, email: e.target.value })); setErrors((er) => ({ ...er, email: false })) }}
                    />
                    <span className="error-text">Bitte gültige E-Mail eingeben</span>
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Telefon *</label>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(val) => setFormData((f) => ({ ...f, phone: val }))}
                      hasError={errors.phone}
                      onClearError={() => setErrors((er) => ({ ...er, phone: false }))}
                    />
                    {errors.phone && (
                      <span className="error-text" style={{ display: 'block' }}>Bitte gültige Telefonnummer eingeben</span>
                    )}
                  </div>
                  <div className="form-group full-width">
                    <div className="checkbox-group">
                      <input
                        type="checkbox" id="consent"
                        checked={formData.consent}
                        onChange={(e) => { setFormData((f) => ({ ...f, consent: e.target.checked })); setErrors((er) => ({ ...er, consent: false })) }}
                      />
                      <label htmlFor="consent">
                        Ich stimme der{' '}
                        <a href="/datenschutz" target="_blank" rel="noopener noreferrer">Datenschutzerklärung</a>{' '}
                        zu und möchte kontaktiert werden. *
                      </label>
                    </div>
                    {errors.consent && (
                      <p style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>
                        Bitte stimmen Sie der Datenschutzerklärung zu.
                      </p>
                    )}
                  </div>
                </div>
                <div className="quiz-nav" style={{ flexDirection: 'column', gap: 0 }}>
                  <button type="submit" className="btn-submit" disabled={submitting}>
                    {submitting ? 'Wird gesendet...' : 'Exposé kostenlos anfordern →'}
                  </button>
                  <p className="submit-trust">
                    <span className="submit-trust-icon">
                      <IconLock size={14} strokeWidth={1.5} />
                    </span>
                    Ihre Daten sind sicher. Kein Spam.
                  </p>
                </div>
              </form>
              <div className="quiz-nav-compact" style={{ marginTop: 6 }}>
                <button className="btn-back-sm" onClick={() => goToStep(underqualified && !answers.finanzierung ? 3 : 4)}>
                  ← Zurück
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== SOFT DISQUALIFICATION MODAL ===== */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Vielen Dank für Ihr Interesse!</h3>
            <p>
              Für unsere Wohnungen (ab €329.000) empfehlen wir ein
              Eigenkapital von mindestens <strong>€50.000</strong>.
            </p>
            <p>Gerne informieren wir Sie über:</p>
            <ul>
              <li>Alternative Objekte in Ihrer Preisklasse</li>
              <li>Möglichkeiten zur Finanzierung</li>
            </ul>
            <div className="modal-buttons">
              <button className="modal-btn-primary" onClick={modalContinue}>
                Trotzdem Exposé anfordern
              </button>
              <button className="modal-btn-secondary" onClick={modalAlternative}>
                Beratung zu Alternativen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ============================================
   UTM Helper
   ============================================ */
function getUTMParams() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
  }
}
