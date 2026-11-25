import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const USAGE_FILE = path.join(DATA_DIR, 'copilot-usage.json')

export interface DayUsage {
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  models: Record<string, ModelUsage>
}

export interface ModelUsage {
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

type StoredDayUsage = Omit<DayUsage, 'models'> & { models?: Record<string, ModelUsage> }

function emptyUsage(): DayUsage {
  return { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, models: {} }
}

function normalizeUsage(usage?: StoredDayUsage): DayUsage {
  return { ...emptyUsage(), ...usage, models: usage?.models ?? {} }
}

function load(): Record<string, StoredDayUsage> {
  if (!fs.existsSync(USAGE_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8')) } catch { return {} }
}

export function recordUsage(promptTokens: number, completionTokens: number, model = 'unknown') {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const all = load()
  const key = today()
  const prev = normalizeUsage(all[key])
  const modelKey = model.trim() || 'unknown'
  const modelPrev = prev.models[modelKey] ?? emptyUsage()
  const modelUsage = {
    requests: modelPrev.requests + 1,
    promptTokens: modelPrev.promptTokens + promptTokens,
    completionTokens: modelPrev.completionTokens + completionTokens,
    totalTokens: modelPrev.totalTokens + promptTokens + completionTokens,
  }
  all[key] = {
    requests: prev.requests + 1,
    promptTokens: prev.promptTokens + promptTokens,
    completionTokens: prev.completionTokens + completionTokens,
    totalTokens: prev.totalTokens + promptTokens + completionTokens,
    models: { ...prev.models, [modelKey]: modelUsage },
  }
  fs.writeFileSync(USAGE_FILE, JSON.stringify(all, null, 2))
}

export function getUsageToday(): DayUsage {
  return normalizeUsage(load()[today()])
}

export function getUsageLast7Days(): (DayUsage & { date: string })[] {
  const all = load()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    return { date: key, ...normalizeUsage(all[key]) }
  }).reverse()
}
