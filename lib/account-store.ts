import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json')

export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'oci'

export interface CloudAccount {
  id: string
  provider: CloudProvider
  name: string
  // AWS
  awsAccountId?: string
  awsAccessKeyId?: string
  awsSecretAccessKey?: string
  awsRegion?: string
  // GCP
  gcpProjectId?: string
  gcpServiceAccountJson?: string
  // Azure
  azureSubscriptionId?: string
  azureTenantId?: string
  azureClientId?: string
  azureClientSecret?: string
  // OCI
  ociTenancyOcid?: string
  ociUserOcid?: string
  ociFingerprint?: string
  ociPrivateKey?: string
  ociRegion?: string
  // Meta
  currency: string
  status: 'active' | 'error' | 'pending'
  lastSync?: string
  monthlyCost?: number
  createdAt: string
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function read(): CloudAccount[] {
  ensureDir()
  if (!fs.existsSync(ACCOUNTS_FILE)) return []
  try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')) } catch { return [] }
}

function write(accounts: CloudAccount[]) {
  ensureDir()
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2))
}

export function listAccounts(): CloudAccount[] {
  return read()
}

export function getAccount(id: string): CloudAccount | undefined {
  return read().find(a => a.id === id)
}

export function addAccount(data: Omit<CloudAccount, 'id' | 'createdAt' | 'status'>): CloudAccount {
  const accounts = read()
  const account: CloudAccount = {
    ...data,
    id: `acct_${Date.now().toString(36)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  accounts.push(account)
  write(accounts)
  return account
}

export function updateAccount(id: string, data: Partial<CloudAccount>): CloudAccount | null {
  const accounts = read()
  const idx = accounts.findIndex(a => a.id === id)
  if (idx === -1) return null
  accounts[idx] = { ...accounts[idx], ...data }
  write(accounts)
  return accounts[idx]
}

export function deleteAccount(id: string): boolean {
  const accounts = read()
  const filtered = accounts.filter(a => a.id !== id)
  if (filtered.length === accounts.length) return false
  write(filtered)
  return true
}

/** Strip secrets before sending to client */
export function sanitize(a: CloudAccount): Partial<CloudAccount> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { awsSecretAccessKey, gcpServiceAccountJson, azureClientSecret, ociPrivateKey, ...safe } = a
  return safe
}
