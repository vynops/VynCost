'use client'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, LayoutDashboard, Search, Lightbulb, Trash2, Target, PieChart, Sparkles, Settings, RefreshCw, Bell } from 'lucide-react'
import { useState, useCallback } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import Link from 'next/link'
import { cn, providerLabel } from '@/lib/utils'
import type { CloudProvider } from '@/lib/account-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/overview':         { title: 'Overview',         subtitle: 'Cloud spend at a glance' },
  '/explorer':         { title: 'Cost Explorer',     subtitle: 'Drill into spending by service, account & tag' },
  '/recommendations':  { title: 'Recommendations',  subtitle: 'AI-generated cost-saving actions' },
  '/waste':            { title: 'Waste & Idle',      subtitle: 'Unused resources burning budget' },
  '/budgets':          { title: 'Budgets & Alerts',  subtitle: 'Spending limits & threshold notifications' },
  '/allocation':       { title: 'Cost Allocation',   subtitle: 'Tag-based charge-back & show-back' },
  '/forecast':         { title: 'Forecast',          subtitle: 'Projected spend for the next 90 days' },
  '/commitments':      { title: 'Commitments',       subtitle: 'Reserved instances & savings plans' },
  '/anomalies':        { title: 'Anomalies',         subtitle: 'Unexpected spend spikes detected' },
  '/copilot':          { title: 'AI Copilot',        subtitle: 'Ask anything about your cloud costs' },
  '/team':             { title: 'Team',              subtitle: 'User management & roles' },
  '/settings':         { title: 'Settings',          subtitle: 'API keys, model & preferences' },
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
  const { mutate } = useSWRConfig()
  const { title, subtitle } = TITLES[path] ?? { title: 'VynCost', subtitle: '' }
  const [menuOpen, setMenuOpen] = useState(false)
  const [spinning, setSpinning] = useState(false)

  const { data: accounts = [] } = useSWR<{ provider: CloudProvider; name: string }[]>('/api/accounts', fetcher, { refreshInterval: 30000 })
  const { data: anomalies = [] } = useSWR<{ id: string }[]>('/api/anomalies', fetcher, { refreshInterval: 60000 })

  const isLive = accounts.length > 0
  const providers = [...new Set(accounts.map(a => a.provider))]
  const statusLabel = isLive
    ? providers.length === 1
      ? providerLabel(providers[0])
      : `${accounts.length} Clouds`
    : 'Demo Mode'
  const dotColor = isLive ? 'bg-green-400' : 'bg-orange-400'
  const textColor = isLive ? 'text-green-400' : 'text-orange-400'
  const anomalyCount = anomalies.length

  const handleRefresh = useCallback(async () => {
    setSpinning(true)
    await mutate(() => true, undefined, { revalidate: true })
    setTimeout(() => setSpinning(false), 600)
  }, [mutate])

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

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-500 leading-tight mt-0.5 hidden sm:block">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-1">
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            title="Refresh data"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} className={spinning ? 'animate-spin' : ''} />
          </button>

          {/* Bell → anomalies */}
          <Link
            href="/anomalies"
            title={anomalyCount > 0 ? `${anomalyCount} anomalies detected` : 'No anomalies'}
            className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Bell size={14} />
            {anomalyCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 ring-1 ring-[#0e1420]" />
            )}
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} />
          </button>

          {/* Divider */}
          <span className="w-px h-5 bg-slate-700/60 mx-1 hidden sm:block" />

          {/* Status pill */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dotColor} ${isLive ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-semibold ${textColor}`}>{statusLabel}</span>
          </div>
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

