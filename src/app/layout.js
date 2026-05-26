import SvgDefs from '@/components/SvgDefs'
import CookieConsent from '@/components/CookieConsent'
import GoogleTagManagerLoader from '@/components/GoogleTagManagerLoader'
import MetaPixelLoader from '@/components/MetaPixelLoader'
import '@/styles/globals.css'

export const metadata = {
  title: 'Kaufen statt Mieten — Wohnungen in Leipzig | NovaHaus Immobilien',
  description:
    'Provisionsfrei Eigentum erwerben in Leipzig. 3- und 4-Zimmer-Wohnungen ab €329.000. Bezugsfertig ab Frühjahr 2026.',
  openGraph: {
    title: 'Ihre Eigentumswohnung in Leipzig — NovaHaus Immobilien',
    description:
      'Kaufen statt Mieten. Für die gleiche monatliche Rate wie Miete bauen Sie Eigentum auf.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Global SVG gradient definitions for all icons */}
        <SvgDefs />

        {children}

        {/* Marketing trackers load only after cookie consent */}
        <GoogleTagManagerLoader />
        <MetaPixelLoader />

        {/* GDPR Cookie Consent Banner */}
        <CookieConsent />
      </body>
    </html>
  )
}
