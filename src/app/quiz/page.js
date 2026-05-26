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
        <Suspense fallback={null}>
          <Quiz />
        </Suspense>
      </main>
    </>
  )
}
