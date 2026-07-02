import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const USAGE_FILE = path.join(DATA_DIR, 'copilot-usage.json')

export interface DayUsage {
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function load(): Record<string, DayUsage> {
  if (!fs.existsSync(USAGE_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8')) } catch { return {} }
}

export function recordUsage(promptTokens: number, completionTokens: number) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const all = load()
  const key = today()
  const prev = all[key] ?? { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  all[key] = {
    requests: prev.requests + 1,
    promptTokens: prev.promptTokens + promptTokens,
    completionTokens: prev.completionTokens + completionTokens,
    totalTokens: prev.totalTokens + promptTokens + completionTokens,
  }
  fs.writeFileSync(USAGE_FILE, JSON.stringify(all, null, 2))
}

export function getUsageToday(): DayUsage {
  return load()[today()] ?? { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 }
}

export function getUsageLast7Days(): (DayUsage & { date: string })[] {
  const all = load()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    return { date: key, ...(all[key] ?? { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 }) }
  }).reverse()
}
