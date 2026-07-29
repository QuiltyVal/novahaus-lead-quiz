import { notFound } from 'next/navigation'
import DataRoomForm from '@/components/DataRoomForm'
import { getDataRoom } from '@/lib/dataRoomStore'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const metadata = {
  title: 'Objektmaterialien sicher übermitteln',
  robots: { index: false, follow: false },
}

export default async function CustomerDataRoomPage({ params }) {
  const { token } = await params
  let dataRoom

  try {
    dataRoom = await getDataRoom(token)
  } catch {
    notFound()
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>NovaHaus × Augenblick</div>
        <div className={styles.client}>{dataRoom.tenant.name}</div>
      </header>

      <section className={styles.intro}>
        <p className={styles.eyebrow}>Data Room</p>
        <h1>Objektmaterialien übermitteln</h1>
        <p>
          Objekt erfassen, Verwendungszweck festlegen und Fotos direkt vom
          Smartphone hochladen. Ihre Rechtebestätigung wird zusammen mit Name,
          E-Mail, Zeitpunkt und Textversion dokumentiert.
        </p>
      </section>

      <DataRoomForm
        token={token}
        initialProperties={dataRoom.properties}
        styles={styles}
      />
    </main>
  )
}
