export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function fmtUsd(n: number, compact = false): string {
  if (compact && n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function fmtUsdFull(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

export function providerLabel(p: string): string {
  const map: Record<string, string> = { aws: 'AWS', gcp: 'GCP', azure: 'Azure', oci: 'OCI' }
  return map[p] ?? p.toUpperCase()
}

export function providerColor(p: string): string {
  const map: Record<string, string> = {
    aws: 'text-orange-400',
    gcp: 'text-blue-400',
    azure: 'text-sky-400',
    oci: 'text-red-400',
  }
  return map[p] ?? 'text-slate-400'
}

export function providerBg(p: string): string {
  const map: Record<string, string> = {
    aws: 'bg-orange-500/10 border-orange-500/20',
    gcp: 'bg-blue-500/10 border-blue-500/20',
    azure: 'bg-sky-500/10 border-sky-500/20',
    oci: 'bg-red-500/10 border-red-500/20',
  }
  return map[p] ?? 'bg-slate-500/10 border-slate-500/20'
}

export function riskColor(r: string): string {
  if (r === 'Low') return 'text-green-400'
  if (r === 'Medium') return 'text-yellow-400'
  return 'text-red-400'
}

export function trendColor(n: number): string {
  return n > 0 ? 'text-red-400' : n < 0 ? 'text-green-400' : 'text-slate-400'
}

export function dateRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

/** Download an array of objects as a CSV file */
export function exportCsv(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => escape(r[k])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
