import Header from '@/components/Header'
import Hero from '@/components/Hero'
import KeyBenefits from '@/components/KeyBenefits'
import FloorPlans from '@/components/FloorPlans'
import MapSection from '@/components/MapSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <KeyBenefits />
        <FloorPlans />
        <MapSection />
      </main>
      <Footer />
    </>
  )
}
