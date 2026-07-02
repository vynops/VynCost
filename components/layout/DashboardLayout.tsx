import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      <Sidebar />
      <Header />
      <main className="lg:pl-56 pt-14 min-h-screen">
        <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
