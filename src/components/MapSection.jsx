import { IconTram, IconTree, IconShopping } from './icons'

const MAP_DETAILS = [
  {
    Icon: IconTram,
    title: 'ÖPNV-Anbindung',
    text: 'Straßenbahn in 3 Min. Fußweg',
  },
  {
    Icon: IconTree,
    title: 'Parks & Natur',
    text: 'Grüne Wege und Parks in der Nähe',
  },
  {
    Icon: IconShopping,
    title: 'Einkaufen & Gastronomie',
    text: 'Cafés, Einkauf und Alltag schnell erreichbar',
  },
]

export default function MapSection() {
  return (
    <section className="map-section" id="lage">
      <div className="container">
        <h2>Erstklassige Lage in Leipzig</h2>
        <p className="map-section-sub">
          Leipzig Zentrum-West — urban, gut angebunden und ideal für Eigennutzer.
        </p>

        <div className="map-wrapper">
          <iframe
            src="https://maps.google.com/maps?q=Leipzig%20Zentrum-West%2C%20Germany&t=&z=13&ie=UTF8&iwloc=&output=embed"
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Standort Leipzig Zentrum-West"
          />
        </div>

        <div className="map-details">
          {MAP_DETAILS.map((d) => (
            <div className="map-detail-card" key={d.title}>
              <div className="map-detail-icon">
                <d.Icon size={24} strokeWidth={1.8} />
              </div>
              <h4>{d.title}</h4>
              <p>{d.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
