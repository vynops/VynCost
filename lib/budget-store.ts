import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const BUDGETS_FILE = path.join(DATA_DIR, 'budgets.json')

export interface Budget {
  id: string
  name: string
  /** 'account' | 'service' | 'tag' | 'provider' */
  scope: string
  scopeValue: string
  amountUsd: number
  period: 'monthly' | 'quarterly' | 'annual'
  alertAt: number  // pct, e.g. 80
  slackWebhook?: string
  createdAt: string
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}
function read(): Budget[] {
  ensureDir()
  if (!fs.existsSync(BUDGETS_FILE)) return []
  try { return JSON.parse(fs.readFileSync(BUDGETS_FILE, 'utf8')) } catch { return [] }
}
function write(b: Budget[]) { fs.writeFileSync(BUDGETS_FILE, JSON.stringify(b, null, 2)) }

export function listBudgets() { return read() }
export function getBudget(id: string) { return read().find(b => b.id === id) }
export function createBudget(data: Omit<Budget, 'id' | 'createdAt'>): Budget {
  const budgets = read()
  const b: Budget = { ...data, id: `bgt_${Date.now().toString(36)}`, createdAt: new Date().toISOString() }
  budgets.push(b)
  write(budgets)
  return b
}
export function updateBudget(id: string, data: Partial<Budget>): Budget | null {
  const budgets = read()
  const idx = budgets.findIndex(b => b.id === id)
  if (idx === -1) return null
  budgets[idx] = { ...budgets[idx], ...data }
  write(budgets)
  return budgets[idx]
}
export function deleteBudget(id: string): boolean {
  const b = read()
  const f = b.filter(x => x.id !== id)
  if (f.length === b.length) return false
  write(f)
  return true
}
