import { notFound } from 'next/navigation'
import VideoReviewList from '@/components/VideoReviewList'
import { getVideoReview } from '@/lib/videoReviewStore'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const metadata = {
  title: 'Videos freigeben',
  robots: { index: false, follow: false },
}

export default async function CustomerVideoReviewPage({ params }) {
  const { token } = await params
  let review

  try {
    review = await getVideoReview(token)
  } catch {
    notFound()
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>NovaHaus × Augenblick</div>
        <div className={styles.client}>{review.tenant.name}</div>
      </header>

      <section className={styles.intro}>
        <p className={styles.eyebrow}>Freigabe</p>
        <h1>Ihre Videos</h1>
        <p>
          Sehen Sie sich jedes Video an und entscheiden Sie: freigeben oder
          ändern lassen. Ohne Ihre Freigabe wird nichts veröffentlicht.
        </p>
      </section>

      <VideoReviewList
        token={token}
        initialProperties={review.properties}
        styles={styles}
      />
    </main>
  )
}
