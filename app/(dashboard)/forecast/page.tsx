'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Download } from 'lucide-react'
import { fmtUsd, exportCsv } from '@/lib/utils'
import type { ForecastData } from '@/lib/simulation'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const HORIZON_OPTIONS = [
  { value: '30', label: '30-day' },
  { value: '60', label: '60-day' },
  { value: '90', label: '90-day' },
]

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-black ${positive === undefined ? 'text-white' : positive ? 'text-green-400' : 'text-red-400'}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function ForecastPage() {
  const [horizon, setHorizon] = useState('90')
  const { data, isLoading } = useSWR<ForecastData>(`/api/forecast?horizon=${horizon}`, fetcher, { refreshInterval: 120000 })

  const today = new Date().toISOString().split('T')[0]

  // Subsample for chart (every 3rd day to keep it clean)
  const chartData = data?.points.filter((_, i) => i % 3 === 0) ?? []

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-[#111827] border border-slate-800 rounded-xl p-1">
          {HORIZON_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setHorizon(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                horizon === o.value ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}>{o.label} forecast</button>
          ))}
        </div>
        {data && (
          <button onClick={() => exportCsv(data.points.map(p => ({
            Date: p.date, 'Actual USD': p.actual?.toFixed(2) ?? '', 'Forecast USD': p.forecast.toFixed(2),
            'Lower Bound': p.lower.toFixed(2), 'Upper Bound': p.upper.toFixed(2),
          })), `vyncost-forecast-${horizon}d.csv`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs transition-colors">
            <Download size={12} /> Export CSV
          </button>
        )}
      </div>

      {isLoading || !data ? (
        <div className="h-64 flex items-center justify-center text-slate-500 animate-pulse text-sm">Building forecast…</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="MTD Actual" value={fmtUsd(data.mtdActual)} sub="this month so far" />
            <StatCard label="Projected EOM" value={fmtUsd(data.projectedEom)} sub="end of month estimate" />
            <StatCard
              label={`Next ${horizon}-day Forecast`}
              value={fmtUsd(horizon === '30' ? data.totalForecast30 : data.totalForecast90)}
              sub="total projected spend"
            />
            <StatCard
              label="MoM Growth Rate"
              value={`${data.growthRate > 0 ? '+' : ''}${data.growthRate}%`}
              sub="vs prior 30 days"
              positive={data.growthRate <= 0}
            />
          </div>

          {/* Growth alert */}
          {data.growthRate > 10 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-500/5 border border-red-500/20 text-xs">
              <TrendingUp size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-red-400">Spend acceleration detected. </span>
                <span className="text-slate-400">
                  Month-over-month growth is +{data.growthRate}%. At this rate, projected 90-day spend is {fmtUsd(data.totalForecast90)}.
                  Review recommendations to reduce growth.
                </span>
              </div>
            </div>
          )}
          {data.growthRate < -5 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-green-500/5 border border-green-500/20 text-xs">
              <TrendingDown size={14} className="text-green-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-green-400">Spend is trending down. </span>
                <span className="text-slate-400">
                  Month-over-month growth is {data.growthRate}%. Optimisations are taking effect.
                </span>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Daily Spend — Actual + Forecast</h2>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded" /> Actual</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded border-dashed" /> Forecast</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-blue-400/10 inline-block rounded" /> Confidence band</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false}
                  tickFormatter={d => d.slice(5)} interval={Math.ceil(chartData.length / 10)} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: 12, fontSize: 12 }}
                  formatter={(v, name) => [fmtUsd(v as number), name]}
                  labelFormatter={l => `Date: ${l}`}
                />
                <ReferenceLine x={today} stroke="#f97316" strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: 'Today', fill: '#f97316', fontSize: 10, position: 'top' }} />

                {/* Confidence band (upper - lower as stacked areas) */}
                <Area type="monotone" dataKey="lower" stroke="none" fill="none" legendType="none" />
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#forecastGrad)" legendType="none" />

                <Area type="monotone" dataKey="actual" name="Actual" stroke="#f97316" strokeWidth={2}
                  fill="url(#actualGrad)" dot={false} connectNulls={false} />
                <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#60a5fa" strokeWidth={2}
                  strokeDasharray="5 3" fill="none" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast table (last 10 actual + next 30 forecast days) */}
          <div className="bg-[#111827] border border-slate-800/60 rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-800/40">
              <h2 className="text-sm font-bold text-white">Daily Breakdown — Next 30 Days</h2>
            </div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0b0f1a]">
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="text-left px-4 sm:px-6 py-3 font-medium">Date</th>
                    <th className="text-right px-4 py-3 font-medium">Forecast</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Lower</th>
                    <th className="text-right px-4 sm:px-6 py-3 font-medium hidden sm:table-cell">Upper</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.points.filter(p => p.actual === null).slice(0, 30).map(p => (
                    <tr key={p.date} className="hover:bg-slate-800/20">
                      <td className="px-4 sm:px-6 py-2.5 font-mono text-slate-300">{p.date}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-400">{fmtUsd(p.forecast)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500 hidden sm:table-cell">{fmtUsd(p.lower)}</td>
                      <td className="px-4 sm:px-6 py-2.5 text-right font-mono text-slate-500 hidden sm:table-cell">{fmtUsd(p.upper)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
