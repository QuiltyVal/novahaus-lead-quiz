import { Suspense } from 'react'
import Header from '@/components/Header'
import Quiz from '@/components/Quiz'

export const metadata = {
  title: 'Quiz — Finden Sie Ihre Wohnung | NovaHaus Immobilien',
  description: 'Beantworten Sie 5 kurze Fragen und erhalten Sie Ihr persönliches Exposé.',
}

export default function QuizPage() {
  return (
    <>
      <Header />
      <main className="quiz-page-main">
        <Suspense fallback={<QuizLoading />}>
          <Quiz />
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
        <h1>Quiz wird geladen</h1>
        <p>Wenn die Seite nicht sofort erscheint, laden Sie sie bitte neu.</p>
        <a href="/quiz">Quiz neu öffnen</a>
      </div>
    </section>
  )
}
