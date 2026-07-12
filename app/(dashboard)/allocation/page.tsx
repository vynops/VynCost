'use client'
import useSWR from 'swr'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, Download } from 'lucide-react'
import { fmtUsd, trendColor, exportCsv } from '@/lib/utils'
import type { AllocationRow } from '@/lib/mock-data'
import type { CloudProvider } from '@/lib/account-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const COLORS = ['#f97316', '#60a5fa', '#a78bfa', '#34d399', '#fb7185', '#64748b']

// Per-provider terminology
const PROVIDER_LABELS: Record<string, {
  singular: string; plural: string; coverage: string
  coverageHint: (pct: number) => string; unallocated: string
}> = {
  oci:   { singular: 'Compartment', plural: 'Compartments',   coverage: 'Compartment Coverage', coverageHint: () => '✓ All spend in compartments',       unallocated: 'root' },
  gcp:   { singular: 'Project',     plural: 'Projects',        coverage: 'Project Coverage',     coverageHint: (p) => p < 90 ? '⚠ Unlinked projects' : '✓ Good coverage', unallocated: 'Unallocated' },
  azure: { singular: 'Res. Group',  plural: 'Resource Groups', coverage: 'RG Coverage',          coverageHint: (p) => p < 90 ? '⚠ Improve tagging'  : '✓ Good coverage', unallocated: 'Unallocated' },
  aws:   { singular: 'Cost Centre', plural: 'Cost Centres',    coverage: 'Tag Coverage',         coverageHint: (p) => p < 90 ? '⚠ Improve tagging'  : '✓ Good coverage', unallocated: 'Unallocated' },
  mixed: { singular: 'Team',        plural: 'Teams',           coverage: 'Tag Coverage',         coverageHint: (p) => p < 90 ? '⚠ Improve tagging'  : '✓ Good coverage', unallocated: 'Unallocated' },
}

function useProviderLabels() {
  const { data: accounts = [] } = useSWR<{ provider: CloudProvider }[]>('/api/accounts', fetcher)
  const providers = [...new Set(accounts.map(a => a.provider))]
  const key = providers.length === 1 ? providers[0] : 'mixed'
  return PROVIDER_LABELS[key] ?? PROVIDER_LABELS.mixed
}

export default function AllocationPage() {
  const { data = [], isLoading } = useSWR<AllocationRow[]>('/api/allocation', fetcher, { refreshInterval: 60000 })
  const lbl = useProviderLabels()

  const total = data.reduce((s, r) => s + r.amountUsd, 0)
  const untagged = data.find(r => r.team === lbl.unallocated || r.team === 'Unallocated')
  const coverage = total > 0 ? (1 - (untagged?.amountUsd || 0) / total) * 100 : 100

  if (isLoading) return <div className="h-64 flex items-center justify-center text-slate-500 animate-pulse text-sm">Loading allocation…</div>

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Total Allocated Spend</div>
          <div className="text-2xl font-black text-white">{fmtUsd(total, true)}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">{lbl.coverage}</div>
          <div className="text-2xl font-black text-white">{coverage.toFixed(1)}%</div>
          <div className="text-[11px] text-slate-600 mt-0.5">{lbl.coverageHint(coverage)}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-500 mb-1">{lbl.plural} Tracked</div>
          <div className="text-2xl font-black text-white">{data.filter(r => r.team !== lbl.unallocated && r.team !== 'Unallocated').length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Pie chart */}
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">Cost by {lbl.singular}</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={data} dataKey="amountUsd" nameKey="team" cx="50%" cy="50%" outerRadius={80} strokeWidth={2} stroke="#0b0f1a">
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: 10, fontSize: 12 }}
                  formatter={(v) => [fmtUsd(v as number), 'Spend']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {data.map((r, i) => (
                <div key={r.team} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 text-slate-300 truncate">{r.team}</span>
                  <span className="font-mono font-bold text-white">{(r.pct ?? 0).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">Month-over-Month by {lbl.singular}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="team" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} width={78} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [fmtUsd(v as number)]} />
              <Bar dataKey="prevAmountUsd" name="Prior month" fill="#1e2a3a" radius={[0, 4, 4, 0]} />
              <Bar dataKey="amountUsd" name="This month" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="bg-[#111827] border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{lbl.singular} Breakdown</h2>
          <button onClick={() => {
            const col = lbl.singular
            exportCsv(data.map(r => {
              const row: Record<string, string> = {}
              row[col] = r.team
              row['This Month USD'] = r.amountUsd.toFixed(2)
              row['Prior Month USD'] = r.prevAmountUsd.toFixed(2)
              row['% of Total'] = r.pct.toFixed(1)
              row['Trend %'] = r.trend.toFixed(1)
              row['Services'] = r.services.map(s => s.service).join(', ')
              return row
            }), 'vyncost-allocation.csv')
          }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs transition-colors">
            <Download size={12} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60 text-slate-500">
                <th className="text-left px-4 sm:px-6 py-3 font-medium">{lbl.singular}</th>
                <th className="text-right px-4 py-3 font-medium">This Month</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Prior Month</th>
                <th className="text-right px-4 py-3 font-medium">% of Total</th>
                <th className="text-right px-4 sm:px-6 py-3 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {data.map((r, i) => (
                <tr key={r.team} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="font-medium text-white">{r.team}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 ml-4 mt-0.5">
                      {r.services.slice(0, 2).map(s => s.service).join(' · ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-white">{fmtUsd(r.amountUsd)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500 hidden sm:table-cell">{fmtUsd(r.prevAmountUsd)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{r.pct.toFixed(1)}%</td>
                  <td className={`px-4 sm:px-6 py-3 text-right font-medium ${trendColor(r.trend)}`}>
                    <span className="flex items-center justify-end gap-0.5">
                      {r.trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {Math.abs(r.trend).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
