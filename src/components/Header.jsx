'use client'

import { useEffect, useState } from 'react'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`}>
      <div className="container">
        <a href="/" className="header-logo">
          <span className="header-logo-mark">NovaHaus</span>
          <span className="header-logo-sub">Immobilien</span>
        </a>
      </div>
    </header>
  )
}
