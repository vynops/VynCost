import fs from 'fs'
import path from 'path'

export type ActionKind = 'recommendations' | 'anomalies'
export type ActionStatus = 'applied' | 'dismissed' | 'acknowledged'

export interface SavedAction {
  status: ActionStatus
  updatedAt: string
  updatedBy: string
}

type ActionData = Record<ActionKind, Record<string, SavedAction>>

const DATA_DIR = path.join(process.cwd(), 'data')
const ACTIONS_FILE = path.join(DATA_DIR, 'action-state.json')

function read(): ActionData {
  try {
    if (!fs.existsSync(ACTIONS_FILE)) return { recommendations: {}, anomalies: {} }
    const data = JSON.parse(fs.readFileSync(ACTIONS_FILE, 'utf8')) as Partial<ActionData>
    return {
      recommendations: data.recommendations ?? {},
      anomalies: data.anomalies ?? {},
    }
  } catch {
    return { recommendations: {}, anomalies: {} }
  }
}

function write(data: ActionData) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(ACTIONS_FILE, JSON.stringify(data, null, 2), 'utf8')
}

export function listActionStates(kind: ActionKind): Record<string, SavedAction> {
  return read()[kind]
}

export function saveActionState(
  kind: ActionKind,
  id: string,
  status: ActionStatus,
  updatedBy: string
): SavedAction {
  const data = read()
  const action = { status, updatedAt: new Date().toISOString(), updatedBy }
  data[kind][id] = action
  write(data)
  return action
}