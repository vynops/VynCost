'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { TrendingDown, ChevronDown, ChevronUp, Copy, Check, Filter, Download } from 'lucide-react'
import { fmtUsdFull, riskColor, providerLabel, exportCsv } from '@/lib/utils'
import type { Recommendation } from '@/lib/mock-data'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'rightsize', label: 'Rightsize' },
  { value: 'idle', label: 'Idle / Shutdown' },
  { value: 'reserved', label: 'Reserved / Savings Plans' },
  { value: 'spot', label: 'Spot Migration' },
  { value: 'storage', label: 'Storage' },
]

const RISK_OPTIONS = ['', 'Low', 'Medium', 'High']

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  )
}

function RecCard({ rec, expanded, onToggle, onStatusChange, statusPending }: {
  rec: Recommendation
  expanded: boolean
  onToggle: () => void
  onStatusChange: (status: 'applied' | 'dismissed') => void
  statusPending: boolean
}) {
  const saving = rec.savingsPerMonth
  const riskCls = riskColor(rec.risk)

  return (
    <div className={`bg-[#111827] border rounded-2xl overflow-hidden transition-all ${
      rec.status === 'applied' ? 'border-green-500/20 opacity-60' :
      rec.status === 'dismissed' ? 'border-slate-800/30 opacity-50' :
      'border-slate-800/60 hover:border-orange-500/20'
    }`}>
      <button onClick={onToggle} className="w-full text-left p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                rec.provider === 'aws' ? 'bg-orange-500/10 text-orange-400' :
                rec.provider === 'gcp' ? 'bg-blue-500/10 text-blue-400' :
                'bg-sky-500/10 text-sky-400'
              }`}>{providerLabel(rec.provider)}</span>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded uppercase">{rec.resourceType}</span>
              <span className={`text-[10px] font-bold ${riskCls}`}>● {rec.risk} risk</span>
              {rec.status === 'applied' && <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Applied</span>}
            </div>
            <div className="text-sm font-bold text-white truncate">{rec.resourceName}</div>
            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{rec.issue}</div>
          </div>

          {/* Savings */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div className="text-center">
              <div className="text-[10px] text-slate-500">Current</div>
              <div className="text-sm font-bold text-white">{fmtUsdFull(rec.currentCostPerMonth)}</div>
              <div className="text-[10px] text-slate-600">/mo</div>
            </div>
            <div className="flex flex-col items-center">
              <TrendingDown size={14} className="text-green-400" />
              <div className="text-xs font-bold text-green-400">{rec.savingsPercent.toFixed(0)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-500">Optimised</div>
              <div className="text-sm font-bold text-green-400">{fmtUsdFull(rec.optimisedCostPerMonth)}</div>
              <div className="text-[10px] text-slate-600">/mo</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-[10px] text-slate-500">Save</div>
              <div className="text-sm font-black text-green-400">${saving.toFixed(0)}</div>
              <div className="text-[10px] text-slate-600">/mo</div>
            </div>
            {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-slate-800/40 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Current Configuration</div>
              <div className="text-sm text-white font-medium">{rec.currentConfig}</div>
              <div className="text-xs text-red-400 mt-1 font-mono">{fmtUsdFull(rec.currentCostPerMonth)}/mo</div>
            </div>
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
              <div className="text-[10px] text-green-400/70 uppercase font-bold mb-2">Recommended Configuration</div>
              <div className="text-sm text-white font-medium">{rec.recommendedConfig}</div>
              <div className="text-xs text-green-400 mt-1 font-mono">{fmtUsdFull(rec.optimisedCostPerMonth)}/mo → saves ${saving.toFixed(0)}/mo</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span><strong className="text-slate-400">Region:</strong> {rec.region}</span>
            <span><strong className="text-slate-400">Account:</strong> {rec.accountName}</span>
            <span><strong className="text-slate-400">Confidence:</strong> <span className="text-white">{rec.confidence}%</span></span>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-2">
              Apply Command
              <CopyButton text={rec.applyCommand} />
            </div>
            <pre className="bg-slate-950 rounded-xl p-3 text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {rec.applyCommand}
            </pre>
          </div>

          {rec.status === 'open' && (
            <div className="flex gap-2">
              <button type="button" disabled={statusPending} onClick={() => onStatusChange('applied')} className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                Mark as Applied
              </button>
              <button type="button" disabled={statusPending} onClick={() => onStatusChange('dismissed')} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-medium hover:text-white transition-colors disabled:opacity-50">
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RecommendationsPage() {
  const [category, setCategory] = useState('')
  const [risk, setRisk] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { data = [], isLoading, mutate } = useSWR<Recommendation[]>(
    `/api/recommendations?category=${category}&provider=`,
    fetcher, { refreshInterval: 60000 }
  )

  async function updateStatus(id: string, status: 'applied' | 'dismissed') {
    setActionError('')
    setUpdatingId(id)
    try {
      const response = await fetch(`/api/recommendations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update recommendation')
      await mutate()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update recommendation')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = data.filter(r => !risk || r.risk === risk)
  const openRecs = filtered.filter(r => r.status === 'open')
  const totalSavings = openRecs.reduce((s, r) => s + r.savingsPerMonth, 0)

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Open Recommendations</div>
          <div className="text-2xl font-black text-white">{openRecs.length}</div>
        </div>
        <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4">
          <div className="text-xs text-green-400/70 mb-1">Total Savings Found</div>
          <div className="text-2xl font-black text-green-400">${totalSavings.toFixed(0)}<span className="text-sm font-medium text-green-400/60">/mo</span></div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Annual Potential</div>
          <div className="text-2xl font-black text-white">${(totalSavings * 12).toFixed(0)}</div>
        </div>
      </div>

      {/* Filters + export */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={12} className="text-slate-500" />
        <div className="flex gap-1 bg-[#111827] border border-slate-800 rounded-xl p-1">
          {CATEGORY_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setCategory(o.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === o.value ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}>{o.label}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-[#111827] border border-slate-800 rounded-xl p-1">
          {RISK_OPTIONS.map(o => (
            <button key={o} onClick={() => setRisk(o)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                risk === o ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}>{o || 'Any Risk'}</button>
          ))}
        </div>
        <button onClick={() => exportCsv(filtered.map(r => ({ Issue: r.issue, Provider: providerLabel(r.provider), Resource: r.resourceName, Type: r.resourceType, Risk: r.risk, Category: r.category, Account: r.accountName, Region: r.region, 'Current $/mo': r.currentCostPerMonth.toFixed(2), 'Optimised $/mo': r.optimisedCostPerMonth.toFixed(2), 'Savings $/mo': r.savingsPerMonth.toFixed(2), 'Savings %': r.savingsPercent.toFixed(1), Status: r.status })), 'vyncost-recommendations.csv')}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs transition-colors">
          <Download size={12} /> Export CSV
        </button>
      </div>

      {actionError && <p role="alert" className="text-xs text-red-400">{actionError}</p>}

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm animate-pulse">Loading recommendations…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <TrendingDown size={32} className="mx-auto mb-3 opacity-30" />
          <div className="text-sm">No recommendations match your filters</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => (
            <RecCard key={rec.id} rec={rec}
              expanded={expanded === rec.id}
              onToggle={() => setExpanded(expanded === rec.id ? null : rec.id)}
              onStatusChange={status => void updateStatus(rec.id, status)}
              statusPending={updatingId === rec.id} />
          ))}
        </div>
      )}
    </div>
  )
}
