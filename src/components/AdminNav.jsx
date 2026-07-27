import Link from 'next/link'

const ITEMS = [
  { id: 'leads', href: '/admin/leads', label: 'Leads' },
  { id: 'content', href: '/admin/content', label: 'Content' },
  { id: 'objects', href: '/admin/objects', label: 'Objekte' },
  { id: 'clients', href: '/admin/clients', label: 'Kunden' },
]

export default function AdminNav({ active }) {
  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {ITEMS.map((item) => (
        <Link
          key={item.id}
          className={active === item.id ? 'admin-nav-link active' : 'admin-nav-link'}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
