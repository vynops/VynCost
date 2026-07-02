import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

export interface AppSettings {
  currency: string
  defaultDateRange: '7d' | '30d' | '90d'
  gpuAlertEnabled: boolean
  wasteAutoDetect: boolean
  slackWebhookUrl: string
  emailAlerts: string
  costSpikeThresholdPct: number
  defaultGroupBy: string
  // AI Copilot
  aiModel: string
  groqApiKey: string
}

const DEFAULTS: AppSettings = {
  currency: 'USD',
  defaultDateRange: '30d',
  gpuAlertEnabled: true,
  wasteAutoDetect: true,
  slackWebhookUrl: '',
  emailAlerts: '',
  costSpikeThresholdPct: 20,
  defaultGroupBy: 'service',
  aiModel: 'llama-3.3-70b-versatile',
  groqApiKey: '',
}

function ensureDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }) }

export function loadSettings(): AppSettings {
  ensureDir()
  if (!fs.existsSync(SETTINGS_FILE)) return DEFAULTS
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) } } catch { return DEFAULTS }
}

export function saveSettings(data: Partial<AppSettings>): AppSettings {
  const current = loadSettings()
  const updated = { ...current, ...data }
  ensureDir()
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2))
  return updated
}
