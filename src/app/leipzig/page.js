import { Suspense } from 'react'
import Header from '@/components/Header'
import Quiz from '@/components/Quiz'
import { LEIPZIG_TENANT_CONFIG } from '@/lib/tenantConfig'

export const metadata = {
  title: 'Leipzig-Einschätzung | Wohnen & Investieren in Leipzig',
  description:
    'Vier kurze Fragen und du erhältst eine kostenlose Einschätzung zum Leipziger Wohnungsmarkt — Viertel, Kosten und realistische Einstiegsgrößen.',
}

export default function LeipzigPage() {
  return (
    <>
      <Header />
      <main className="quiz-page-main">
        <Suspense fallback={<QuizLoading />}>
          <Quiz tenantConfig={LEIPZIG_TENANT_CONFIG} />
        </Suspense>
      </main>
    </>
  )
}

function QuizLoading() {
  return (
    <section className="quiz-section">
      <div className="quiz-loading-card">
        <span>Leipzig</span>
        <h1>Einschätzung wird geladen</h1>
        <p>Wenn die Seite nicht sofort erscheint, laden Sie sie bitte neu.</p>
        <a href="/leipzig">Seite neu öffnen</a>
      </div>
    </section>
  )
}
