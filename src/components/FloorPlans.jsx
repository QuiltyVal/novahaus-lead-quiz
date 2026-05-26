'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PLANS = [
  {
    id: '3z',
    title: '3-Zimmer mit eigenem Garten',
    size: 'ca. 92 m²',
    price: '€329.000',
    badge: 'EG + Garten',
    image: '/plans/3zimmer.png',
    quizValue: '3-zimmer',
  },
  {
    id: '4z',
    title: '4-Zimmer Wohnung',
    size: 'ca. 105 m²',
    price: '€359.000',
    badge: 'Familienwohnung',
    image: '/plans/4zimmer.png',
    quizValue: '4-zimmer',
  },
]

export default function FloorPlans() {
  const [available, setAvailable] = useState([])
  const router = useRouter()

  useEffect(() => {
    // Check which plan images actually exist
    const checkImages = async () => {
      const results = []
      for (const plan of PLANS) {
        try {
          const res = await fetch(plan.image, { method: 'HEAD' })
          if (res.ok) results.push(plan)
        } catch {
          // Image not found, skip
        }
      }
      setAvailable(results)
    }
    checkImages()
  }, [])

  const handlePlanClick = (plan) => {
    router.push(`/quiz?wohnung=${plan.quizValue}`)
  }

  if (available.length === 0) return null

  return (
    <section className="plans-section" id="grundrisse">
      <div className="container">
        <h2 className="plans-section-title">Unsere Wohnungen</h2>
        <p className="plans-section-sub">
          Moderne Grundrisse mit durchdachter Raumaufteilung — klicken Sie auf einen Grundriss, um direkt Ihr Exposé anzufordern
        </p>

        <div className="plans-grid">
          {available.map((plan) => (
            <div
              className="plan-card plan-card--clickable"
              key={plan.id}
              onClick={() => handlePlanClick(plan)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePlanClick(plan) }}
            >
              <div className="plan-card-image">
                <Image
                  src={plan.image}
                  alt={`Grundriss ${plan.title}`}
                  width={400}
                  height={300}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div className="plan-card-body">
                <span className="plan-card-badge">{plan.badge}</span>
                <h3>{plan.title}</h3>
                <p className="plan-size">{plan.size}</p>
                <p className="plan-price">
                  {plan.price} <small>provisionsfrei</small>
                </p>
                <span className="plan-card-cta">Wohnung auswählen →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
