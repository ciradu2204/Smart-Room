import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 lg:px-12 py-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
