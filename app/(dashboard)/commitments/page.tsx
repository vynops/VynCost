'use client'
import useSWR from 'swr'
import { fmtUsd, providerLabel, exportCsv } from '@/lib/utils'
import { Download, AlertTriangle, Clock } from 'lucide-react'
import type { RiCoverageItem } from '@/lib/simulation'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_STYLES = {
  active:         { badge: 'bg-green-500/10 text-green-400',   label: 'Active' },
  expiring_soon:  { badge: 'bg-yellow-500/10 text-yellow-400', label: 'Expiring Soon' },
  expired:        { badge: 'bg-red-500/10 text-red-400',       label: 'Expired' },
}

const PROVIDER_COLORS: Record<string, string> = {
  aws: 'bg-orange-500/10 text-orange-400', gcp: 'bg-blue-500/10 text-blue-400',
  azure: 'bg-sky-500/10 text-sky-400', oci: 'bg-red-500/10 text-red-400',
}

function UsageBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? ((total - used) / total) * 100 : 0
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold w-8 text-right" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function CommitmentsPage() {
  const { data = [], isLoading } = useSWR<RiCoverageItem[]>('/api/commitments', fetcher, { refreshInterval: 120000 })

  const active        = data.filter(r => r.status === 'active')
  const expiringSoon  = data.filter(r => r.status === 'expiring_soon')
  const totalMonthly  = data.reduce((s, r) => s + r.monthlyCost, 0)
  const totalWasted   = data.reduce((s, r) => s + r.wastedMonthly, 0)
  const avgCoverage   = data.length > 0 ? data.reduce((s, r) => s + r.coveragePct, 0) / data.length : 0

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Total Commitments</div>
          <div className="text-2xl font-black text-white">{data.length}</div>
          <div className="text-[11px] text-slate-600 mt-0.5">{active.length} active</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Monthly Committed</div>
          <div className="text-2xl font-black text-white">{fmtUsd(totalMonthly)}</div>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
          <div className="text-xs text-red-400/70 mb-1">Wasted (unused)</div>
          <div className="text-2xl font-black text-red-400">{fmtUsd(totalWasted)}</div>
          <div className="text-[11px] text-red-400/50 mt-0.5">/month</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Avg Coverage</div>
          <div className="text-2xl font-black text-white">{avgCoverage.toFixed(0)}%</div>
          <div className="text-[11px] text-slate-600 mt-0.5">of on-demand spend covered</div>
        </div>
      </div>

      {/* Alerts */}
      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 text-xs">
          <Clock size={14} className="text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-yellow-400">{expiringSoon.length} commitment{expiringSoon.length > 1 ? 's' : ''} expiring within 2 months. </span>
            <span className="text-slate-400">Review and renew to avoid reverting to on-demand pricing.</span>
          </div>
        </div>
      )}
      {totalWasted > 500 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-500/5 border border-red-500/20 text-xs">
          <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-red-400">{fmtUsd(totalWasted)}/month is going unused. </span>
            <span className="text-slate-400">Consider resizing or selling unused reservations on the AWS Marketplace or via GCP commitment modifications.</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">All Commitments</h2>
          <button onClick={() => exportCsv(data.map(r => ({
            Provider: providerLabel(r.provider), Account: r.accountName, Type: r.commitmentType,
            Service: r.service, Region: r.region, Term: r.term, Payment: r.paymentOption,
            'Hourly Cost': r.hourlyCost.toFixed(4), 'Unused Hours': r.unusedHours.toFixed(1),
            'Coverage %': r.coveragePct.toFixed(1), 'Monthly USD': r.monthlyCost.toFixed(2),
            'Wasted USD': r.wastedMonthly.toFixed(2), 'Expires': r.expiresAt, Status: r.status,
          })), 'vyncost-commitments.csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs transition-colors">
            <Download size={12} /> Export CSV
          </button>
        </div>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-slate-500 animate-pulse text-sm">Loading commitments…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left px-4 sm:px-6 py-3 font-medium">Commitment</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Account</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Region</th>
                  <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">Term</th>
                  <th className="text-right px-4 py-3 font-medium">Monthly</th>
                  <th className="text-right px-4 py-3 font-medium text-red-400/70 hidden sm:table-cell">Wasted</th>
                  <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Usage</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Expires</th>
                  <th className="text-left px-4 sm:px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {data.map(r => (
                  <tr key={r.id} className={`hover:bg-slate-800/20 transition-colors ${r.status === 'expired' ? 'opacity-50' : ''}`}>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PROVIDER_COLORS[r.provider]}`}>
                          {providerLabel(r.provider)}
                        </span>
                        <div>
                          <div className="font-medium text-white">{r.commitmentType}</div>
                          <div className="text-slate-500 text-[10px]">{r.service}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{r.accountName}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 hidden lg:table-cell">{r.region}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">{r.term}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">{fmtUsd(r.monthlyCost)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-400 hidden sm:table-cell">
                      {r.wastedMonthly > 0 ? fmtUsd(r.wastedMonthly) : <span className="text-green-400 text-[10px]">✓ None</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell w-32">
                      <UsageBar used={r.unusedHours} total={r.totalHours} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 hidden md:table-cell">{r.expiresAt}</td>
                    <td className="px-4 sm:px-6 py-3">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_STYLES[r.status].badge}`}>
                        {STATUS_STYLES[r.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
