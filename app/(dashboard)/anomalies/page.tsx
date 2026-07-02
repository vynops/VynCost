'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { AlertTriangle, Bell, BellOff, TrendingUp, Download } from 'lucide-react'
import { fmtUsd, providerLabel, exportCsv } from '@/lib/utils'
import type { AnomalyEvent } from '@/lib/simulation'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SEVERITY_STYLES = {
  high:   { border: 'border-red-500/30',    bg: 'bg-red-500/5',    badge: 'bg-red-500/10 text-red-400',    dot: '#ef4444' },
  medium: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', badge: 'bg-yellow-500/10 text-yellow-400', dot: '#f59e0b' },
  low:    { border: 'border-blue-500/30',   bg: 'bg-blue-500/5',   badge: 'bg-blue-500/10 text-blue-400',  dot: '#60a5fa' },
}

const PROVIDER_COLORS: Record<string, string> = { aws: 'text-orange-400', gcp: 'text-blue-400', azure: 'text-sky-400', oci: 'text-red-400' }

export default function AnomaliesPage() {
  const [acked, setAcked] = useState<Set<string>>(new Set())
  const [severityFilter, setSeverityFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')

  const { data = [], isLoading } = useSWR<AnomalyEvent[]>('/api/anomalies', fetcher, { refreshInterval: 60000 })

  const visible = data
    .filter(a => !severityFilter || a.severity === severityFilter)
    .filter(a => !providerFilter || a.provider === providerFilter)

  const open   = visible.filter(a => a.status === 'open' && !acked.has(a.id))
  const closed = visible.filter(a => a.status === 'acknowledged' || acked.has(a.id))
  const totalWasted = open.reduce((s, a) => s + (a.actual - a.baseline), 0)
  const highCount   = open.filter(a => a.severity === 'high').length

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
          <div className="text-xs text-red-400/70 mb-1">Open Anomalies</div>
          <div className="text-2xl font-black text-red-400">{open.length}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">High Severity</div>
          <div className="text-2xl font-black text-white">{highCount}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Extra Spend (open)</div>
          <div className="text-2xl font-black text-white">{fmtUsd(totalWasted)}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Acknowledged</div>
          <div className="text-2xl font-black text-white">{closed.length}</div>
        </div>
      </div>

      {/* Filters + export */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-[#111827] border border-slate-800 rounded-xl p-1">
          {['', 'high', 'medium', 'low'].map(s => (
            <button key={s} onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                severityFilter === s ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-[#111827] border border-slate-800 rounded-xl p-1">
          {['', 'aws', 'gcp', 'azure', 'oci'].map(p => (
            <button key={p} onClick={() => setProviderFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                providerFilter === p ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}>{p ? providerLabel(p) : 'All'}</button>
          ))}
        </div>
        <button onClick={() => exportCsv(visible.map(a => ({
          Date: a.date, Severity: a.severity, Service: a.service, Provider: providerLabel(a.provider),
          Account: a.accountName, Region: a.region, 'Baseline $/day': a.baseline.toFixed(2),
          'Actual $/day': a.actual.toFixed(2), 'Spike %': a.spikePercent.toFixed(1),
          Status: acked.has(a.id) ? 'acknowledged' : a.status, Description: a.description,
        })), 'vyncost-anomalies.csv')}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs transition-colors">
          <Download size={12} /> Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-500 animate-pulse text-sm">Scanning for anomalies…</div>
      ) : open.length === 0 && closed.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <div className="text-sm">No anomalies detected</div>
          <div className="text-xs text-slate-600 mt-1">Spend patterns look normal across all accounts</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Open */}
          {open.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle size={12} className="text-red-400" /> Open — Needs Attention
              </h2>
              <div className="space-y-3">
                {open.map(a => {
                  const s = SEVERITY_STYLES[a.severity]
                  return (
                    <div key={a.id} className={`border rounded-2xl p-4 sm:p-5 ${s.border} ${s.bg}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${s.badge}`}>{a.severity}</span>
                            <span className={`text-[10px] font-bold uppercase ${PROVIDER_COLORS[a.provider]}`}>{providerLabel(a.provider)}</span>
                            <span className="text-[10px] text-slate-500">{a.date}</span>
                          </div>
                          <div className="text-sm font-bold text-white mb-1">{a.service} — {a.accountName}</div>
                          <div className="text-xs text-slate-400 mb-3">{a.description}</div>
                          <div className="flex flex-wrap gap-4 text-xs">
                            <div>
                              <span className="text-slate-500">Baseline: </span>
                              <span className="font-mono font-bold text-white">{fmtUsd(a.baseline)}/day</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Actual: </span>
                              <span className="font-mono font-bold text-red-400">{fmtUsd(a.actual)}/day</span>
                            </div>
                            <div className="flex items-center gap-1 text-red-400 font-bold">
                              <TrendingUp size={12} />
                              +{a.spikePercent.toFixed(0)}% spike
                            </div>
                            <div>
                              <span className="text-slate-500">Region: </span>
                              <span className="font-mono text-slate-300">{a.region}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setAcked(s => new Set([...s, a.id]))}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium transition-colors">
                          <BellOff size={12} /> Acknowledge
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Acknowledged */}
          {closed.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BellOff size={12} /> Acknowledged
              </h2>
              <div className="bg-[#111827] border border-slate-800/40 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="text-left px-4 sm:px-6 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Service / Account</th>
                      <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Spike</th>
                      <th className="text-right px-4 sm:px-6 py-3 font-medium">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {closed.map(a => (
                      <tr key={a.id} className="opacity-50 hover:opacity-70 transition-opacity">
                        <td className="px-4 sm:px-6 py-3 text-slate-500 font-mono">{a.date}</td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{a.service}</div>
                          <div className="text-slate-500">{a.accountName}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 hidden sm:table-cell">+{a.spikePercent.toFixed(0)}%</td>
                        <td className="px-4 sm:px-6 py-3 text-right">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${SEVERITY_STYLES[a.severity].badge}`}>
                            {a.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
