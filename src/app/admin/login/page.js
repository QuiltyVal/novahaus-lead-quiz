import AdminLoginForm from '@/components/admin/AdminLoginForm'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Administration</p>
          <h1>Anmeldung</h1>
        </div>
      </header>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Admin-Bereich</h2>
            <p>Bitte melden Sie sich mit Ihren Zugangsdaten an.</p>
          </div>
        </div>
        <AdminLoginForm hasError={params?.error === '1'} />
      </section>
    </main>
  )
}
