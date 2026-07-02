'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Trash2, AlertCircle, Download } from 'lucide-react'
import { fmtUsd, providerLabel, exportCsv } from '@/lib/utils'
import type { WasteItem } from '@/lib/mock-data'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PROVIDER_FILTER = ['', 'aws', 'gcp', 'azure', 'oci']

const TYPE_ICONS: Record<string, string> = {
  'EBS Volume': '💾', 'EBS Snapshot': '📸', 'Elastic IP': '🌐',
  'EC2 Instance': '🖥️', 'Application Load Balancer': '⚖️',
  'Persistent Disk': '💾', 'Static External IP': '🌐',
  'Managed Disk': '💾', 'Azure Virtual Machine': '🖥️',
}

export default function WastePage() {
  const [provider, setProvider] = useState('')
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const { data = [], isLoading } = useSWR<WasteItem[]>(
    `/api/waste?provider=${provider}`,
    fetcher, { refreshInterval: 60000 }
  )

  const active = data.filter(w => w.status === 'open' && !dismissed.has(w.id))
  const totalWasteCost = active.reduce((s, w) => s + w.costPerDay * 30, 0)
  const totalDaily = active.reduce((s, w) => s + w.costPerDay, 0)

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
          <div className="text-xs text-red-400/70 mb-1">Wasteful Resources</div>
          <div className="text-2xl font-black text-red-400">{active.length}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Monthly Waste Cost</div>
          <div className="text-2xl font-black text-white">{fmtUsd(totalWasteCost)}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Daily Burn</div>
          <div className="text-2xl font-black text-white">{fmtUsd(totalDaily)}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Annual Savings</div>
          <div className="text-2xl font-black text-white">{fmtUsd(totalWasteCost * 12, true)}</div>
        </div>
      </div>

      {/* Provider filter + export */}
      <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 bg-[#111827] border border-slate-800 rounded-xl p-1 w-fit">
        {PROVIDER_FILTER.map(p => (
          <button key={p} onClick={() => setProvider(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              provider === p ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>{p ? providerLabel(p) : 'All'}</button>
        ))}
      </div>
      <button onClick={() => exportCsv(active.map(w => ({ Resource: w.resourceName, Type: w.resourceType, Provider: providerLabel(w.provider), Account: w.accountName, Region: w.region, Reason: w.reason, 'Idle Days': w.idleSinceDays, 'Cost/Mo USD': (w.costPerDay * 30).toFixed(2) })), 'vyncost-waste.csv')}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs transition-colors">
        <Download size={12} /> Export CSV
      </button>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-500 animate-pulse text-sm">Scanning for waste…</div>
      ) : active.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Trash2 size={32} className="mx-auto mb-3 opacity-30" />
          <div className="text-sm">No idle or orphaned resources found</div>
          <div className="text-xs text-slate-600 mt-1">Your infrastructure looks clean!</div>
        </div>
      ) : (
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500">
                  <th className="text-left px-4 sm:px-6 py-3 font-medium">Resource</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Account</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Region</th>
                  <th className="text-left px-4 py-3 font-medium">Reason</th>
                  <th className="text-right px-4 py-3 font-medium">Idle Days</th>
                  <th className="text-right px-4 py-3 font-medium">Cost/Mo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {active.map(w => (
                  <tr key={w.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 sm:px-6 py-3">
                      <div className="font-medium text-white flex items-center gap-1.5">
                        <span>{TYPE_ICONS[w.resourceType] || '📦'}</span>
                        <span className="truncate max-w-[140px] sm:max-w-none">{w.resourceName}</span>
                      </div>
                      <div className={`text-[10px] font-bold uppercase mt-0.5 ${
                        w.provider === 'aws' ? 'text-orange-400' : w.provider === 'gcp' ? 'text-blue-400' : 'text-sky-400'
                      }`}>{providerLabel(w.provider)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{w.resourceType}</td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{w.accountName}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono hidden lg:table-cell">{w.region}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle size={11} className="text-yellow-400 mt-0.5 shrink-0" />
                        <span className="text-slate-400 line-clamp-2">{w.reason}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${w.idleSinceDays > 30 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {w.idleSinceDays}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-400">
                      {fmtUsd(w.costPerDay * 30)}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <button onClick={() => setDismissed(s => new Set([...s, w.id]))}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-medium transition-colors whitespace-nowrap">
                        Dismiss
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
