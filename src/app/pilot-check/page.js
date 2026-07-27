import { Suspense } from 'react'
import Header from '@/components/Header'
import Quiz from '@/components/Quiz'
import { MAKLER_TENANT_CONFIG } from '@/lib/tenantConfig'

export const metadata = {
  title: 'Objekt-Pilot prüfen | NovaHaus',
  description:
    'Fünf kurze Fragen zu Ihrem Objektbestand und Ihrer Anfragenbearbeitung. Sie erhalten die Einschätzung und den Pilot-Umfang schriftlich — ohne Verkaufstermin.',
}

export default function PilotCheckPage() {
  return (
    <>
      <Header />
      <main className="quiz-page-main">
        <Suspense fallback={<QuizLoading />}>
          <Quiz tenantConfig={MAKLER_TENANT_CONFIG} />
        </Suspense>
      </main>
    </>
  )
}

function QuizLoading() {
  return (
    <section className="quiz-section">
      <div className="quiz-loading-card">
        <span>NovaHaus</span>
        <h1>Pilot-Check wird geladen</h1>
        <p>Wenn die Seite nicht sofort erscheint, laden Sie sie bitte neu.</p>
        <a href="/pilot-check">Seite neu öffnen</a>
      </div>
    </section>
  )
}
