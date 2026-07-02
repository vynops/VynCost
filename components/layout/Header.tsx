'use client'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, DollarSign, LayoutDashboard, Search, Lightbulb, Trash2, Target, PieChart, Sparkles, Settings } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const TITLES: Record<string, string> = {
  '/overview': 'Overview',
  '/explorer': 'Cost Explorer',
  '/recommendations': 'Recommendations',
  '/waste': 'Waste & Idle',
  '/budgets': 'Budgets & Alerts',
  '/allocation': 'Cost Allocation',
  '/copilot': 'AI Copilot',
  '/settings': 'Settings',
}

const MOB_NAV = [
  { href: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { href: '/explorer', icon: Search, label: 'Explorer' },
  { href: '/recommendations', icon: Lightbulb, label: 'Recs' },
  { href: '/waste', icon: Trash2, label: 'Waste' },
  { href: '/budgets', icon: Target, label: 'Budgets' },
  { href: '/allocation', icon: PieChart, label: 'Allocate' },
  { href: '/copilot', icon: Sparkles, label: 'Copilot' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Header() {
  const path = usePathname()
  const router = useRouter()
  const title = TITLES[path] ?? 'VynCost'
  const [menuOpen, setMenuOpen] = useState(false)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      <header className="fixed top-0 left-0 lg:left-56 right-0 h-14 bg-[#0e1420]/90 backdrop-blur border-b border-slate-800/60 z-20 flex items-center px-4 gap-3">
        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
          <Menu size={18} />
        </button>

        <h1 className="text-sm font-bold text-white flex-1">{title}</h1>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-xs text-orange-400 font-medium">Demo Mode</span>
          </div>
          <button onClick={logout} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Mobile slide-down nav */}
      {menuOpen && (
        <div className="lg:hidden fixed top-14 left-0 right-0 bg-[#0e1420] border-b border-slate-800/60 z-20 px-3 py-2 grid grid-cols-4 gap-1">
          {MOB_NAV.map(({ href, icon: Icon, label }) => {
            const active = path.startsWith(href)
            return (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                className={cn('flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors',
                  active ? 'text-orange-400 bg-orange-500/10' : 'text-slate-400 hover:text-white')}>
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
