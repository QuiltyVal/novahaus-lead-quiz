import { Suspense } from 'react'
import Header from '@/components/Header'
import Quiz from '@/components/Quiz'
import { INVESTOR_TENANT_CONFIG } from '@/lib/tenantConfig'

export const metadata = {
  title: 'Kapitalanlage-Check | NovaHaus Immobilien',
  description: 'Beantworten Sie 5 kurze Fragen und erhalten Sie eine erste Einschätzung für Ihre Kapitalanlage.',
}

export default function InvestPage() {
  return (
    <>
      <Header />
      <main className="quiz-page-main">
        <Suspense fallback={<QuizLoading />}>
          <Quiz tenantConfig={INVESTOR_TENANT_CONFIG} />
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
        <h1>Kapitalanlage-Check wird geladen</h1>
        <p>Wenn die Seite nicht sofort erscheint, laden Sie sie bitte neu.</p>
        <a href="/invest">Check neu öffnen</a>
      </div>
    </section>
  )
}
