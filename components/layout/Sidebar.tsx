'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  LayoutDashboard, Search, Lightbulb, Trash2, Target,
  PieChart, Sparkles, Settings, DollarSign, ChevronRight,
  AlertTriangle, TrendingUp, BadgeDollarSign, Users, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type NavItem = { href: string; icon: React.ElementType; label: string; badge?: string }
type NavGroup = { section: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'Overview',
    items: [
      { href: '/overview', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    section: 'Cost Analysis',
    items: [
      { href: '/explorer',   icon: Search,         label: 'Cost Explorer' },
      { href: '/anomalies',  icon: AlertTriangle,  label: 'Anomalies' },
      { href: '/forecast',   icon: TrendingUp,     label: 'Forecast' },
      { href: '/allocation', icon: PieChart,       label: 'Allocation' },
    ],
  },
  {
    section: 'Optimization',
    items: [
      { href: '/recommendations', icon: Lightbulb,       label: 'Recommendations', badge: '7' },
      { href: '/waste',           icon: Trash2,          label: 'Waste & Idle',    badge: '8' },
      { href: '/commitments',     icon: BadgeDollarSign, label: 'Commitments' },
      { href: '/budgets',         icon: Target,          label: 'Budgets & Alerts' },
    ],
  },
  {
    section: 'Assistant',
    items: [
      { href: '/copilot', icon: Sparkles, label: 'AI Copilot' },
    ],
  },
  {
    section: 'Manage',
    items: [
      { href: '/team',     icon: Users,    label: 'Team' },
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export default function Sidebar() {
  const path     = usePathname()
  const router   = useRouter()
  const { data: me } = useSWR<{ name: string; email: string; role: string }>('/api/auth/me', fetcher)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[#0e1420] border-r border-slate-800/60 flex flex-col z-30 hidden lg:flex">
      {/* Logo */}
      <div className="px-4 py-3 border-b border-slate-800/60 shrink-0">
        <Link href="/overview" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
            <DollarSign size={15} className="text-orange-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-black text-sm tracking-tight text-white leading-tight">Vyn<span className="text-orange-400">Cost</span></span>
            <span className="text-[10px] text-slate-500 font-medium leading-tight tracking-wide">Cloud Cost Management</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {NAV_GROUPS.map(({ section, items }) => (
          <div key={section} className="mb-4">
            <p className="px-2.5 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map(({ href, icon: Icon, label, badge }) => {
                const active = path.startsWith(href)
                return (
                  <Link key={href} href={href}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative',
                      active
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                    )}>
                    <Icon size={14} className={active ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-300'} />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        active ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-400')}>
                        {badge}
                      </span>
                    )}
                    {active && <ChevronRight size={10} className="text-orange-400/60" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom — user + logout */}
      <div className="px-3 py-3 border-t border-slate-800/60 shrink-0 space-y-2">
        {me?.name && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-black text-orange-400 shrink-0">
              {me.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-white truncate">{me.name}</div>
              <div className="text-[9px] text-slate-500 uppercase font-bold">{me.role}</div>
            </div>
            <button onClick={logout} title="Sign out"
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-600 hover:text-slate-300 transition-colors">
              <LogOut size={12} />
            </button>
          </div>
        )}
        <div className="text-[10px] text-slate-700">Part of VynOps Suite</div>
      </div>
    </aside>
  )
}

