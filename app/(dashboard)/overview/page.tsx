'use client'
import useSWR from 'swr'
import { Area, AreaChart, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis, BarChart, Bar, Cell } from 'recharts'
import { TrendingDown, TrendingUp, DollarSign, AlertTriangle, Zap, Trash2, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { fmtUsd, fmtCurrency, fmtPct, providerLabel, trendColor } from '@/lib/utils'
import type { OverviewData } from '@/lib/mock-data'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PROVIDER_COLORS: Record<string, string> = { aws: '#f97316', gcp: '#60a5fa', azure: '#38bdf8', oci: '#f87171' }

function StatCard({ label, value, sub, icon: Icon, color = 'orange', trend }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string; trend?: number
}) {
  const colors: Record<string, string> = {
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  }
  const [textC, bgC] = colors[color].split(' ')
  return (
    <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl ${bgC} border flex items-center justify-center shrink-0`}>
          <Icon size={16} className={textC} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trendColor(trend)}`}>
            {trend > 0 ? <ChevronUp size={12} /> : trend < 0 ? <ChevronDown size={12} /> : null}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-xl sm:text-2xl font-black text-white">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-slate-600 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

export default function OverviewPage() {
  const { data, isLoading } = useSWR<OverviewData>('/api/overview', fetcher, { refreshInterval: 30000 })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 text-sm animate-pulse">Loading cost data…</div>
      </div>
    )
  }

  const topDay = [...data.dailyTrend].sort((a, b) => b.amountUsd - a.amountUsd)[0]
  const chartData = data.dailyTrend.map(d => ({
    date: d.date.slice(5),
    cost: d.amountUsd,
  }))

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/explorer" className="block hover:scale-[1.02] transition-transform">
          <StatCard label="Month-to-Date Spend" value={fmtCurrency(data.totalMtd, data.currency, true)}
            sub={`Projected: ${fmtCurrency(data.projectedEom, data.currency, true)} EOM`} icon={DollarSign} color="orange" />
        </Link>
        <Link href="/recommendations" className="block hover:scale-[1.02] transition-transform">
          <StatCard label="Savings Found" value={fmtCurrency(data.savingsFound, data.currency, true)}
            sub={`${fmtCurrency(data.savingsApplied, data.currency, true)} already applied`} icon={TrendingDown} color="green" />
        </Link>
        <Link href="/waste" className="block hover:scale-[1.02] transition-transform">
          <StatCard label="Waste Detected" value={`${data.wasteCount} resources`}
            sub="Idle or orphaned" icon={Trash2} color="red" />
        </Link>
        <Link href="/settings" className="block hover:scale-[1.02] transition-transform">
          <StatCard label="Connected Accounts" value={`${data.accountCount}`}
            sub={data.byProvider.map(p => providerLabel(p.provider)).join(' · ') || 'No accounts'} icon={Zap} color="blue" />
        </Link>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map(a => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
              a.severity === 'critical' ? 'bg-red-500/5 border-red-500/20 text-red-300' :
              a.severity === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300' :
              'bg-blue-500/5 border-blue-500/20 text-blue-300'
            }`}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">{a.message}</span>
              <span className="text-[11px] text-slate-600 shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Spend trend */}
        <div className="xl:col-span-2 bg-[#111827] border border-slate-800/60 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Daily Spend — Last 30 Days</h2>
              <p className="text-xs text-slate-500 mt-0.5">Peak day: {topDay?.date} ({fmtCurrency(topDay?.amountUsd ?? 0, data.currency)})</p>
            </div>
            <Link href="/explorer" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
              Explorer <ArrowRight size={11} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} tickFormatter={v => fmtCurrency(v as number, data.currency, true).replace(/,/g, '')} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v) => [fmtCurrency(v as number, data.currency), 'Cost']}
              />
              <Area type="monotone" dataKey="cost" stroke="#f97316" strokeWidth={2} fill="url(#costGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* By provider */}
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4 sm:p-6">
          <h2 className="text-sm font-bold text-white mb-4">Spend by Provider</h2>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data.byProvider.map(p => ({ name: providerLabel(p.provider), cost: p.amountUsd, fill: PROVIDER_COLORS[p.provider] }))}
              layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: 10, fontSize: 12 }}
                formatter={(v, _n, props) => [fmtCurrency(v as number, props?.payload?.currency), 'Spend']} />
              <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
                {data.byProvider.map((p) => (
                  <Cell key={p.provider} fill={PROVIDER_COLORS[p.provider] || '#f97316'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {data.byProvider.map(p => (
              <div key={p.provider} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: PROVIDER_COLORS[p.provider] }} />
                  <span className="text-slate-400">{providerLabel(p.provider)}</span>
                </div>
                <span className="font-mono font-bold text-white">{fmtCurrency(p.amountUsd, p.currency, true)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top services */}
      <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Top Cost Drivers This Month</h2>
          <Link href="/explorer" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
            See all <ArrowRight size={11} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800/60">
                <th className="text-left pb-2 font-medium">Service</th>
                <th className="text-left pb-2 font-medium hidden sm:table-cell">Provider</th>
                <th className="text-left pb-2 font-medium hidden md:table-cell">Account</th>
                <th className="text-left pb-2 font-medium hidden lg:table-cell">Region</th>
                <th className="text-right pb-2 font-medium">Cost</th>
                <th className="text-right pb-2 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {data.topServices.slice(0, 8).map((s, i) => (
                <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-2.5 font-medium text-white">{s.service}</td>
                  <td className="py-2.5 hidden sm:table-cell">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.provider === 'aws' ? 'bg-orange-500/10 text-orange-400' :
                      s.provider === 'gcp' ? 'bg-blue-500/10 text-blue-400' :
                      s.provider === 'oci' ? 'bg-red-500/10 text-red-400' :
                      'bg-sky-500/10 text-sky-400'
                    }`}>{s.provider}</span>
                  </td>
                  <td className="py-2.5 text-slate-400 hidden md:table-cell">{s.accountName}</td>
                  <td className="py-2.5 text-slate-500 font-mono hidden lg:table-cell">{s.region}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-white">{fmtCurrency(s.amountUsd, s.currency)}</td>
                  <td className={`py-2.5 text-right font-medium ${trendColor(s.trend)}`}>
                    {fmtPct(s.trend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/recommendations', label: 'View Recommendations', sub: `${fmtUsd(data.savingsFound, true)}/mo savings`, color: 'green' },
          { href: '/waste', label: 'Clean Up Waste', sub: `${data.wasteCount} resources found`, color: 'red' },
          { href: '/copilot', label: 'Ask AI Copilot', sub: 'Get instant FinOps insights', color: 'purple' },
          { href: '/settings', label: 'Connect Account', sub: 'Add AWS · GCP · Azure', color: 'blue' },
        ].map(({ href, label, sub, color }) => (
          <Link key={href} href={href}
            className={`p-4 rounded-xl border transition-all group ${
              color === 'green' ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40' :
              color === 'red' ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40' :
              color === 'purple' ? 'bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40' :
              'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40'
            }`}>
            <div className="text-xs font-bold text-white mb-1 group-hover:text-white flex items-center gap-1">
              {label} <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[11px] text-slate-500">{sub}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

