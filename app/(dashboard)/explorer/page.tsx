'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronUp, ChevronDown, Minus, Download } from 'lucide-react'
import { fmtUsd, fmtPct, trendColor, exportCsv } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const GROUP_OPTIONS = [
  { value: 'service', label: 'Service' },
  { value: 'provider', label: 'Provider' },
  { value: 'region', label: 'Region' },
  { value: 'account', label: 'Account' },
]

const DATE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

const COLORS = ['#f97316', '#60a5fa', '#a78bfa', '#34d399', '#fb7185', '#fbbf24', '#22d3ee', '#818cf8', '#86efac', '#fca5a1']

const PROVIDER_COLORS: Record<string, string> = { aws: '#f97316', gcp: '#60a5fa', azure: '#38bdf8', oci: '#f87171' }

type ExplorerRow = { label: string; amountUsd: number; prev: number; region?: string; provider?: string }

export default function ExplorerPage() {
  const [groupBy, setGroupBy] = useState('service')
  const [dateRange, setDateRange] = useState('30')

  const { data = [], isLoading } = useSWR<ExplorerRow[]>(
    `/api/explorer?groupBy=${groupBy}&days=${dateRange}`,
    fetcher, { refreshInterval: 60000 }
  )

  const total = data.reduce((s, r) => s + r.amountUsd, 0)
  const prevTotal = data.reduce((s, r) => s + r.prev, 0)
  const totalTrend = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-[#111827] border border-slate-800 rounded-xl p-1">
          {GROUP_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setGroupBy(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                groupBy === o.value ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}>{o.label}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-[#111827] border border-slate-800 rounded-xl p-1">
          {DATE_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setDateRange(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                dateRange === o.value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}>{o.label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => exportCsv(data.map(r => ({ Label: r.label, Provider: r.provider || '', Region: r.region || '', 'Current USD': r.amountUsd.toFixed(2), 'Prior USD': r.prev.toFixed(2), 'Change %': prevTotal > 0 ? (((r.amountUsd - r.prev) / r.prev) * 100).toFixed(1) : '' })), `vyncost-explorer-${groupBy}.csv`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs transition-colors">
            <Download size={12} /> Export CSV
          </button>
          <div className="text-right">
            <div className="text-lg font-black text-white">{fmtUsd(total)}</div>
            <div className={`text-xs ${trendColor(totalTrend)} flex items-center justify-end gap-0.5`}>
              {totalTrend > 0 ? <ChevronUp size={11} /> : totalTrend < 0 ? <ChevronDown size={11} /> : <Minus size={11} />}
              {fmtPct(totalTrend)} vs prior period
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm animate-pulse">Loading…</div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4 sm:p-6">
            <h2 className="text-sm font-bold text-white mb-4">Cost by {GROUP_OPTIONS.find(o => o.value === groupBy)?.label}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.map((r, i) => ({
                name: r.label.length > 18 ? r.label.slice(0, 16) + '…' : r.label,
                current: r.amountUsd,
                previous: r.prev,
                fill: r.provider ? (PROVIDER_COLORS[r.provider] || COLORS[i % COLORS.length]) : COLORS[i % COLORS.length],
              }))} margin={{ top: 5, right: 5, left: 5, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [fmtUsd(v as number)]}
                />
                <Bar dataKey="current" name="Current period" radius={[4, 4, 0, 0]}>
                  {data.map((r, i) => (
                    <Cell key={i} fill={r.provider ? (PROVIDER_COLORS[r.provider] || COLORS[i % COLORS.length]) : COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-[#111827] border border-slate-800/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-500">
                    <th className="text-left px-4 sm:px-6 py-3 font-medium">{GROUP_OPTIONS.find(o => o.value === groupBy)?.label}</th>
                    {groupBy === 'service' && <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Provider</th>}
                    <th className="text-right px-4 sm:px-6 py-3 font-medium">This Period</th>
                    <th className="text-right px-4 sm:px-6 py-3 font-medium hidden md:table-cell">Prior Period</th>
                    <th className="text-right px-4 sm:px-6 py-3 font-medium">% of Total</th>
                    <th className="text-right px-4 sm:px-6 py-3 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.map((row, i) => {
                    const pct = total > 0 ? (row.amountUsd / total) * 100 : 0
                    const trend = row.prev > 0 ? ((row.amountUsd - row.prev) / row.prev) * 100 : 0
                    return (
                      <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 sm:px-6 py-3 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: row.provider ? (PROVIDER_COLORS[row.provider] || COLORS[i % COLORS.length]) : COLORS[i % COLORS.length] }} />
                            {row.label}
                          </div>
                        </td>
                        {groupBy === 'service' && (
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {row.provider && (
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                row.provider === 'aws' ? 'bg-orange-500/10 text-orange-400' :
                                row.provider === 'gcp' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-sky-500/10 text-sky-400'
                              }`}>{row.provider}</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 sm:px-6 py-3 text-right font-mono font-bold text-white">{fmtUsd(row.amountUsd)}</td>
                        <td className="px-4 sm:px-6 py-3 text-right font-mono text-slate-500 hidden md:table-cell">{fmtUsd(row.prev)}</td>
                        <td className="px-4 sm:px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: row.provider ? (PROVIDER_COLORS[row.provider] || '#f97316') : '#f97316' }} />
                            </div>
                            <span className="text-slate-400 w-8 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className={`px-4 sm:px-6 py-3 text-right font-medium ${trendColor(trend)}`}>
                          <span className="flex items-center justify-end gap-0.5">
                            {trend > 0 ? <ChevronUp size={11} /> : trend < 0 ? <ChevronDown size={11} /> : <Minus size={11} />}
                            {Math.abs(trend).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700 bg-slate-800/30">
                    <td colSpan={groupBy === 'service' ? 2 : 1} className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-300">Total</td>
                    <td className="px-4 sm:px-6 py-3 text-right font-mono font-black text-white">{fmtUsd(total)}</td>
                    <td className="px-4 sm:px-6 py-3 text-right font-mono text-slate-400 hidden md:table-cell">{fmtUsd(prevTotal)}</td>
                    <td className="px-4 sm:px-6 py-3 text-right text-slate-400">100%</td>
                    <td className={`px-4 sm:px-6 py-3 text-right font-bold ${trendColor(totalTrend)}`}>
                      <span className="flex items-center justify-end gap-0.5">
                        {totalTrend > 0 ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {Math.abs(totalTrend).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
