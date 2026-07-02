'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Target, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'
import { fmtUsd } from '@/lib/utils'
import type { Budget } from '@/lib/budget-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Mock current spend per scope key
const MOCK_SPEND: Record<string, number> = {
  'AWS Production': 6200, 'GCP Core': 4010, 'Azure Dev': 2440,
  'Data & Analytics': 3610, 'ML / AI': 1760, 'production': 8500, 'staging': 2100,
}

function spendPct(budget: Budget): number {
  const spent = MOCK_SPEND[budget.scopeValue] ?? Math.random() * budget.amountUsd
  return Math.min((spent / budget.amountUsd) * 100, 110)
}

function BudgetBar({ pct, alertAt }: { pct: number; alertAt: number }) {
  const color = pct >= 100 ? '#ef4444' : pct >= alertAt ? '#f59e0b' : '#22c55e'
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (d: Omit<Budget, 'id' | 'createdAt'>) => void }) {
  const [form, setForm] = useState<{ name: string; scope: string; scopeValue: string; amountUsd: string; period: 'monthly' | 'quarterly' | 'annual'; alertAt: number; slackWebhook: string }>({ name: '', scope: 'account', scopeValue: '', amountUsd: '', period: 'monthly', alertAt: 80, slackWebhook: '' })
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onCreate({ ...form, amountUsd: parseFloat(form.amountUsd), alertAt: Number(form.alertAt) })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white">Create Budget</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: 'Budget Name', key: 'name', type: 'text', placeholder: 'e.g. AWS Production Monthly' },
            { label: 'Scope Value', key: 'scopeValue', type: 'text', placeholder: 'e.g. AWS Production, Data & Analytics' },
            { label: 'Amount (USD)', key: 'amountUsd', type: 'number', placeholder: '5000' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-slate-400 font-medium block mb-1">{f.label}</label>
              <input type={f.type} value={form[f.key as keyof typeof form]} onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder} required
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Period</label>
              <select value={form.period} onChange={e => set('period', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Alert at (%)</label>
              <input type="number" min={50} max={100} value={form.alertAt} onChange={e => set('alertAt', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Slack Webhook (optional)</label>
            <input type="url" value={form.slackWebhook} onChange={e => set('slackWebhook', e.target.value)}
              placeholder="https://hooks.slack.com/..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm">Create Budget</button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BudgetsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data: budgets = [], mutate, isLoading } = useSWR<Budget[]>('/api/budgets', fetcher)

  async function createBudget(data: Omit<Budget, 'id' | 'createdAt'>) {
    await fetch('/api/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    mutate()
  }

  async function deleteBudget(id: string) {
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
    mutate()
  }

  const overBudget = budgets.filter(b => spendPct(b) >= 100)
  const nearBudget = budgets.filter(b => { const p = spendPct(b); return p >= b.alertAt && p < 100 })

  return (
    <div className="space-y-5">
      {/* Alerts */}
      {overBudget.length > 0 && (
        <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{overBudget.length} budget{overBudget.length > 1 ? 's' : ''} exceeded: {overBudget.map(b => b.name).join(', ')}</span>
        </div>
      )}
      {nearBudget.length > 0 && (
        <div className="flex items-start gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 text-sm text-yellow-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{nearBudget.length} budget{nearBudget.length > 1 ? 's' : ''} near threshold: {nearBudget.map(b => b.name).join(', ')}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">{budgets.length} budget{budgets.length !== 1 ? 's' : ''} configured</div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors">
          <Plus size={13} /> New Budget
        </button>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-500 animate-pulse text-sm">Loading budgets…</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-20">
          <Target size={32} className="mx-auto text-slate-600 mb-3" />
          <div className="text-sm text-slate-400">No budgets yet</div>
          <div className="text-xs text-slate-600 mt-1">Create a budget to track spend against targets</div>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold">
            Create First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map(b => {
            const pct = spendPct(b)
            const spent = (pct / 100) * b.amountUsd
            const status = pct >= 100 ? 'Over' : pct >= b.alertAt ? 'Alert' : 'On Track'
            return (
              <div key={b.id} className={`bg-[#111827] border rounded-2xl p-4 sm:p-5 ${
                pct >= 100 ? 'border-red-500/30' : pct >= b.alertAt ? 'border-yellow-500/30' : 'border-slate-800/60'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-white">{b.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{b.scope}: {b.scopeValue}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      status === 'Over' ? 'bg-red-500/10 text-red-400' :
                      status === 'Alert' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>{status}</span>
                    <button onClick={() => deleteBudget(b.id)} className="p-1 rounded text-slate-600 hover:text-red-400">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                <BudgetBar pct={pct} alertAt={b.alertAt} />

                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-400">{fmtUsd(spent)} spent</span>
                  <span className="text-slate-500">of {fmtUsd(b.amountUsd)}</span>
                </div>
                <div className="text-[10px] text-slate-600 mt-1 flex items-center justify-between">
                  <span>{b.period} · alert at {b.alertAt}%</span>
                  {b.slackWebhook && <span className="text-violet-500">Slack ✓</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={createBudget} />}
    </div>
  )
}
