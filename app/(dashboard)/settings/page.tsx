'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Plus, Trash2, Pencil, CheckCircle, AlertCircle, Clock, X, Eye, EyeOff, Loader2, Mail, Users, Webhook, Send } from 'lucide-react'
import { providerLabel, providerBg } from '@/lib/utils'
import type { CloudAccount, CloudProvider } from '@/lib/account-store'
import type { AppSettings } from '@/lib/settings-store'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PROVIDER_LOGOS: Record<CloudProvider, string> = {
  aws: '🟠', gcp: '🔵', azure: '🔷', oci: '🔴',
}

const PROVIDER_NAMES: Record<CloudProvider, string> = {
  aws: 'Amazon Web Services', gcp: 'Google Cloud Platform', azure: 'Microsoft Azure', oci: 'Oracle Cloud',
}

function StatusBadge({ status }: { status: CloudAccount['status'] }) {
  if (status === 'active') return <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold"><CheckCircle size={10} /> Active</span>
  if (status === 'error') return <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold"><AlertCircle size={10} /> Error</span>
  return <span className="flex items-center gap-1 text-yellow-400 text-[10px] font-bold"><Clock size={10} /> Pending</span>
}

function AccountFormModal({
  onClose,
  onSave,
  existing,
}: {
  onClose: () => void
  onSave: (data: Partial<CloudAccount>) => void
  existing?: Partial<CloudAccount>
}) {
  const isEdit = !!existing
  const [step, setStep] = useState<'pick' | 'form'>(isEdit ? 'form' : 'pick')
  const [provider, setProvider] = useState<CloudProvider>(existing?.provider ?? 'aws')
  const [form, setForm] = useState<Record<string, string>>(
    isEdit
      ? Object.fromEntries(Object.entries(existing!).map(([k, v]) => [k, String(v ?? '')]))
      : { name: '', currency: 'USD' }
  )
  const [showSecret, setShowSecret] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    const res = await fetch('/api/accounts/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, ...form }),
    })
    setTestResult(await res.json())
    setTesting(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const status = testResult?.ok ? 'active' : (existing?.status ?? 'pending')
    onSave({ provider, ...form, status } as Partial<CloudAccount>)
    onClose()
  }

  if (step === 'pick') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Connect Cloud Account</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['aws', 'gcp', 'azure', 'oci'] as CloudProvider[]).map(p => (
              <button key={p} onClick={() => { setProvider(p); setStep('form') }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-700 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all group">
                <span className="text-2xl">{PROVIDER_LOGOS[p]}</span>
                <span className="text-xs font-bold text-white">{providerLabel(p)}</span>
                <span className="text-[10px] text-slate-500 text-center leading-tight">{PROVIDER_NAMES[p]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const FIELDS: Record<CloudProvider, { label: string; key: string; placeholder: string; secret?: boolean }[]> = {
    aws: [
      { label: 'Account Name', key: 'name', placeholder: 'e.g. AWS Production' },
      { label: 'AWS Account ID', key: 'awsAccountId', placeholder: '123456789012' },
      { label: 'Access Key ID', key: 'awsAccessKeyId', placeholder: 'AKIA...' },
      { label: 'Secret Access Key', key: 'awsSecretAccessKey', placeholder: '••••••••••••••••', secret: true },
      { label: 'Default Region', key: 'awsRegion', placeholder: 'eu-west-1' },
    ],
    gcp: [
      { label: 'Account Name', key: 'name', placeholder: 'e.g. GCP Core' },
      { label: 'Project ID', key: 'gcpProjectId', placeholder: 'my-project-id' },
      { label: 'Service Account JSON', key: 'gcpServiceAccountJson', placeholder: 'Paste JSON content...', secret: true },
    ],
    azure: [
      { label: 'Account Name', key: 'name', placeholder: 'e.g. Azure Production' },
      { label: 'Subscription ID', key: 'azureSubscriptionId', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { label: 'Tenant ID', key: 'azureTenantId', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { label: 'Client ID', key: 'azureClientId', placeholder: 'App Registration Client ID' },
      { label: 'Client Secret', key: 'azureClientSecret', placeholder: '••••••••••••••••', secret: true },
    ],
    oci: [
      { label: 'Account Name', key: 'name', placeholder: 'e.g. OCI Production' },
      { label: 'Tenancy OCID', key: 'ociTenancyOcid', placeholder: 'ocid1.tenancy.oc1...' },
      { label: 'User OCID', key: 'ociUserOcid', placeholder: 'ocid1.user.oc1...' },
      { label: 'Fingerprint', key: 'ociFingerprint', placeholder: 'xx:xx:xx:...' },
      { label: 'Private Key (PEM)', key: 'ociPrivateKey', placeholder: '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----', secret: true },
      { label: 'Region', key: 'ociRegion', placeholder: 'eu-frankfurt-1' },
    ],
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {!isEdit && <button onClick={() => setStep('pick')} className="text-slate-500 hover:text-white text-xs">← Back</button>}
            {!isEdit && <span className="text-xs text-slate-600">/</span>}
            <h2 className="text-sm font-bold text-white">{PROVIDER_LOGOS[provider]} {isEdit ? `Edit ${providerLabel(provider)} Account` : providerLabel(provider)}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {FIELDS[provider].map(f => (
            <div key={f.key}>
              <label className="text-xs text-slate-400 font-medium block mb-1">{f.label}</label>
              <div className="relative">
                {(f.key === 'gcpServiceAccountJson' || f.key === 'ociPrivateKey') ? (
                  <textarea rows={f.key === 'ociPrivateKey' ? 5 : 3} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-orange-500/60 resize-y" />
                ) : (
                  <input type={f.secret && !showSecret ? 'password' : 'text'}
                    value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder} required={f.key === 'name'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                )}
                {f.secret && f.key !== 'gcpServiceAccountJson' && (
                  <button type="button" onClick={() => setShowSecret(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {testResult && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs border ${
              testResult.ok ? 'bg-green-500/5 border-green-500/20 text-green-300' : 'bg-red-500/5 border-red-500/20 text-red-300'
            }`}>
              {testResult.ok ? <CheckCircle size={12} className="mt-0.5 shrink-0" /> : <AlertCircle size={12} className="mt-0.5 shrink-0" />}
              {testResult.message || testResult.error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={testConnection} disabled={testing}
              className="flex-1 py-2 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
              {testing ? <Loader2 size={12} className="animate-spin" /> : null}
              Test Connection
            </button>
            <button type="submit"
              className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition-colors">
              {isEdit ? 'Update Account' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const AI_PROVIDERS = [
  {
    value: 'groq', label: 'Groq', keyLabel: 'Groq API Key', placeholder: 'gsk_...', defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (recommended)' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast)' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32k context)' },
      { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    ],
  },
  {
    value: 'openai', label: 'OpenAI', keyLabel: 'OpenAI API Key', placeholder: 'sk-...', defaultModel: 'gpt-4o-mini',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
  },
  {
    value: 'anthropic', label: 'Anthropic (Claude)', keyLabel: 'Anthropic API Key', placeholder: 'sk-ant-...', defaultModel: 'claude-3-5-sonnet-latest',
    models: [
      { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (fast)' },
    ],
  },
  {
    value: 'google', label: 'Google (Gemini)', keyLabel: 'Gemini API Key', placeholder: 'AIza...', defaultModel: 'gemini-2.0-flash',
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
  {
    value: 'custom', label: 'Custom / Self-Hosted', keyLabel: 'API Key', placeholder: 'Optional API key', defaultModel: '', models: [],
  },
]

export default function SettingsPage() {
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Partial<CloudAccount> | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAiKey, setShowAiKey] = useState(false)
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)
  const [testingChannel, setTestingChannel] = useState<string | null>(null)
  const [channelTests, setChannelTests] = useState<Record<string, { ok: boolean; message: string }>>({})
  const [testEmailTo, setTestEmailTo] = useState('')
  const [testingEmail, setTestingEmail] = useState(false)
  const [emailTest, setEmailTest] = useState<{ ok: boolean; message: string } | null>(null)
  const [testingAi, setTestingAi] = useState(false)
  const [aiTest, setAiTest] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null)

  const { data: accounts = [], mutate: mutateAccounts } = useSWR<Partial<CloudAccount>[]>('/api/accounts', fetcher)
  const { data: settings, mutate: mutateSettings } = useSWR<AppSettings & { adminEmail?: string }>('/api/settings', fetcher)
  const { data: copilotUsage, mutate: mutateCopilotUsage } = useSWR<{ today: { requests: number; promptTokens: number; completionTokens: number; totalTokens: number } }>('/api/copilot/usage', fetcher, { refreshInterval: 30000 })
  const [localSettings, setLocalSettings] = useState<Partial<AppSettings>>({})

  const merged = { ...settings, ...localSettings }
  const setS = (k: string, v: string | number | boolean) => setLocalSettings(prev => ({ ...prev, [k]: v }))

  async function testNotification(channel: 'slackWebhookUrl' | 'teamsWebhookUrl' | 'customWebhookUrl') {
    const url = String(merged[channel] || '').trim()
    if (!url) {
      setChannelTests(prev => ({ ...prev, [channel]: { ok: false, message: 'Enter a URL first' } }))
      return
    }
    setTestingChannel(channel)
    try {
      const response = await fetch('/api/settings/test-notification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, url }),
      })
      const data = await response.json() as { ok?: boolean; message?: string; error?: string }
      setChannelTests(prev => ({ ...prev, [channel]: { ok: response.ok && data.ok === true, message: data.message || data.error || 'Test failed' } }))
    } catch (error) {
      setChannelTests(prev => ({ ...prev, [channel]: { ok: false, message: error instanceof Error ? error.message : 'Test failed' } }))
    } finally {
      setTestingChannel(null)
    }
  }

  async function testEmail() {
    if (!testEmailTo.trim()) {
      setEmailTest({ ok: false, message: 'Enter a recipient email first' })
      return
    }
    setTestingEmail(true)
    try {
      const response = await fetch('/api/settings/test-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testEmailTo.trim() }),
      })
      const data = await response.json() as { ok?: boolean; message?: string }
      setEmailTest({ ok: response.ok && data.ok === true, message: data.message || 'Email test failed' })
    } catch (error) {
      setEmailTest({ ok: false, message: error instanceof Error ? error.message : 'Email test failed' })
    } finally {
      setTestingEmail(false)
    }
  }

  async function testAiConnection() {
    const provider = merged.aiProvider || 'groq'
    const apiKey = merged.aiApiKey || (provider === 'groq' ? merged.groqApiKey : '')
    if (provider !== 'custom' && !apiKey) {
      setAiTest({ ok: false, message: 'Enter an API key first' })
      return
    }
    if (provider === 'custom' && !merged.aiBaseUrl) {
      setAiTest({ ok: false, message: 'Enter a custom base URL first' })
      return
    }
    setTestingAi(true)
    try {
      const response = await fetch('/api/copilot/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model: merged.aiModel, baseUrl: merged.aiBaseUrl }),
      })
      const data = await response.json() as { ok?: boolean; message?: string; latencyMs?: number }
      setAiTest({ ok: response.ok && data.ok === true, message: data.message || 'AI connection test failed', latencyMs: data.latencyMs })
    } catch (error) {
      setAiTest({ ok: false, message: error instanceof Error ? error.message : 'AI connection test failed' })
    } finally {
      setTestingAi(false)
    }
  }

  async function saveSettings() {
    setSavingSettings(true)
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(localSettings) })
    mutateSettings()
    setSavingSettings(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addAccount(data: Partial<CloudAccount>) {
    await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    mutateAccounts()
  }

  async function editAccount(data: Partial<CloudAccount>) {
    if (!data.id) return
    await fetch(`/api/accounts/${data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    mutateAccounts()
  }

  async function deleteAccount(id: string) {
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    mutateAccounts()
  }

  const byProvider: Record<CloudProvider, Partial<CloudAccount>[]> = { aws: [], gcp: [], azure: [], oci: [] }
  accounts.forEach(a => { if (a.provider) byProvider[a.provider].push(a) })

  const isDemo = accounts.length === 0

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Data Source Status — always visible */}
      <section className={`flex items-start gap-4 px-5 py-4 rounded-2xl border ${
        isDemo
          ? 'bg-blue-500/5 border-blue-500/20'
          : 'bg-green-500/5 border-green-500/20'
      }`}>
        <div className={`mt-0.5 text-xl`}>{isDemo ? '🧪' : '☁️'}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${isDemo ? 'text-blue-300' : 'text-green-300'}`}>
            {isDemo ? 'Demo Mode — Simulated Data' : `Live Mode — ${accounts.length} Account${accounts.length !== 1 ? 's' : ''} Connected`}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {isDemo
              ? 'No cloud accounts connected. All charts and figures use deterministic simulated data across AWS, GCP, Azure and OCI. Add a real account below to switch to live data.'
              : `Connected to ${accounts.length} real cloud account${accounts.length !== 1 ? 's' : ''}. Cost data is pulled from your provider APIs.`}
          </div>
        </div>
        {isDemo && (
          <button onClick={() => setShowAddAccount(true)}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition-colors">
            Connect Account
          </button>
        )}
      </section>

      {/* Cloud Accounts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Cloud Accounts</h2>
            <p className="text-xs text-slate-500 mt-0.5">Connect multiple accounts per provider. Credentials stored locally, never shared.</p>
          </div>
          <button onClick={() => setShowAddAccount(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors">
            <Plus size={13} /> Add Account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-[#111827] border border-dashed border-slate-700 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-2">☁️</div>
            <div className="text-sm text-slate-400">No cloud accounts connected yet</div>
            <div className="text-xs text-slate-600 mt-1">Add AWS, GCP, Azure, or OCI accounts to start tracking costs</div>
            <button onClick={() => setShowAddAccount(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold">
              Connect First Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {(['aws', 'gcp', 'azure', 'oci'] as CloudProvider[]).map(p => {
              const pAccounts = byProvider[p]
              if (pAccounts.length === 0) return null
              return (
                <div key={p}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{PROVIDER_LOGOS[p]}</span>
                    <span className="text-xs font-bold text-slate-300">{providerLabel(p)}</span>
                    <span className="text-[10px] text-slate-600">({pAccounts.length} account{pAccounts.length > 1 ? 's' : ''})</span>
                  </div>
                  <div className="space-y-2 pl-4">
                    {pAccounts.map(a => (
                      <div key={a.id} className={`flex items-center gap-3 bg-[#111827] border rounded-xl px-4 py-3 ${providerBg(p)}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{a.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {p === 'aws' && a.awsAccountId && `Account: ${a.awsAccountId}`}
                            {p === 'gcp' && (a as Partial<CloudAccount>).gcpProjectId && `Project: ${(a as Partial<CloudAccount>).gcpProjectId}`}
                            {p === 'azure' && (a as Partial<CloudAccount>).azureSubscriptionId && `Sub: ${(a as Partial<CloudAccount>).azureSubscriptionId?.slice(0, 8)}...`}
                            {p === 'oci' && (a as Partial<CloudAccount>).ociTenancyOcid && `Tenancy: ...${(a as Partial<CloudAccount>).ociTenancyOcid!.slice(-12)}`}
                          </div>
                        </div>
                        <StatusBadge status={a.status || 'pending'} />
                        <button onClick={() => setEditingAccount(a)}
                          title="Edit account"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => a.id && deleteAccount(a.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <button onClick={() => setShowAddAccount(true)}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-slate-700 hover:border-orange-500/40 text-slate-500 hover:text-orange-400 text-xs transition-colors">
              <Plus size={12} /> Add another account
            </button>
          </div>
        )}
      </section>

      {/* App Settings */}
      {settings && (
        <section className="bg-[#111827] border border-slate-800/60 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">General Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Admin Email</label>
              <input value={settings.adminEmail || ''} readOnly
                className="w-full px-3 py-2 rounded-xl bg-slate-900/50 border border-slate-700 text-sm text-slate-500 cursor-not-allowed" />
              <div className="text-[11px] text-slate-600 mt-1">Set via VYNCOST_ADMIN_EMAIL in .env.local</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Default Date Range</label>
                <select value={merged.defaultDateRange || '30d'} onChange={e => setS('defaultDateRange', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60">
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Cost Spike Alert (%)</label>
                <input type="number" min={5} max={100} value={merged.costSpikeThresholdPct ?? 20}
                  onChange={e => setS('costSpikeThresholdPct', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                <div className="text-[11px] text-slate-600 mt-1">Alert when any service spikes by this %</div>
              </div>
            </div>
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2">
                <Webhook size={14} className="text-orange-400" />
                <div className="text-xs font-bold text-white">Notification Channels</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs text-slate-400 font-medium">Slack Webhook URL</label>
                  <button type="button" onClick={() => testNotification('slackWebhookUrl')} disabled={testingChannel === 'slackWebhookUrl'}
                    className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-300 hover:border-orange-500/40 disabled:opacity-50">
                    {testingChannel === 'slackWebhookUrl' ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />} Test
                  </button>
                </div>
                <input type="url" value={merged.slackWebhookUrl || ''} onChange={e => setS('slackWebhookUrl', e.target.value)} placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                {channelTests.slackWebhookUrl && <div className={`text-[11px] mt-1 ${channelTests.slackWebhookUrl.ok ? 'text-green-400' : 'text-red-400'}`}>{channelTests.slackWebhookUrl.message}</div>}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs text-slate-400 font-medium">Microsoft Teams Webhook URL</label>
                  <button type="button" onClick={() => testNotification('teamsWebhookUrl')} disabled={testingChannel === 'teamsWebhookUrl'}
                    className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-300 hover:border-orange-500/40 disabled:opacity-50">
                    {testingChannel === 'teamsWebhookUrl' ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />} Test
                  </button>
                </div>
                <input type="url" value={merged.teamsWebhookUrl || ''} onChange={e => setS('teamsWebhookUrl', e.target.value)} placeholder="https://outlook.webhook.office.com/webhookb2/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                {channelTests.teamsWebhookUrl && <div className={`text-[11px] mt-1 ${channelTests.teamsWebhookUrl.ok ? 'text-green-400' : 'text-red-400'}`}>{channelTests.teamsWebhookUrl.message}</div>}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs text-slate-400 font-medium">Custom Webhook URL</label>
                  <button type="button" onClick={() => testNotification('customWebhookUrl')} disabled={testingChannel === 'customWebhookUrl'}
                    className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-300 hover:border-orange-500/40 disabled:opacity-50">
                    {testingChannel === 'customWebhookUrl' ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />} Test
                  </button>
                </div>
                <input type="url" value={merged.customWebhookUrl || ''} onChange={e => setS('customWebhookUrl', e.target.value)} placeholder="https://your-endpoint.example/alerts"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                <div className="text-[11px] text-slate-600 mt-1">Receives alert details as a JSON POST request.</div>
                {channelTests.customWebhookUrl && <div className={`text-[11px] mt-1 ${channelTests.customWebhookUrl.ok ? 'text-green-400' : 'text-red-400'}`}>{channelTests.customWebhookUrl.message}</div>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1"><Mail size={11} className="inline mr-1" />Email Alert Recipients</label>
                  <input type="email" value={merged.emailAlerts || ''} onChange={e => setS('emailAlerts', e.target.value)}
                    placeholder="finops@example.com, team@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                  <div className="text-[11px] text-slate-600 mt-1">Use commas for multiple recipients.</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1"><Users size={11} className="inline mr-1" />Notification Team</label>
                  <input type="text" value={merged.notificationTeam || ''} onChange={e => setS('notificationTeam', e.target.value)}
                    placeholder="FinOps / Platform Operations"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                  <div className="text-[11px] text-slate-600 mt-1">Team or on-call group attached to notifications.</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={merged.smtpHost || ''} onChange={e => setS('smtpHost', e.target.value)} placeholder="SMTP host (e.g. smtp.gmail.com)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                <input type="number" value={merged.smtpPort ?? 587} onChange={e => setS('smtpPort', parseInt(e.target.value, 10))} placeholder="SMTP port"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                <input value={merged.smtpUser || ''} onChange={e => setS('smtpUser', e.target.value)} placeholder="SMTP username"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                <div className="relative">
                  <input type={showSmtpPassword ? 'text' : 'password'} value={merged.smtpPassword || ''} onChange={e => setS('smtpPassword', e.target.value)} placeholder="SMTP password"
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                  <button type="button" onClick={() => setShowSmtpPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {showSmtpPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <input value={merged.smtpFrom || ''} onChange={e => setS('smtpFrom', e.target.value)} placeholder="From address"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
              </div>
              <div className="flex items-center gap-2">
                <input type="email" value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} placeholder="Send test email to..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
                <button type="button" onClick={testEmail} disabled={testingEmail} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:border-orange-500/40 disabled:opacity-50">
                  {testingEmail ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Test Email
                </button>
              </div>
              {emailTest && <div className={`text-[11px] ${emailTest.ok ? 'text-green-400' : 'text-red-400'}`}>{emailTest.message}</div>}
            </div>
            <div className="flex items-center justify-between py-2 border-t border-slate-800">
              <div>
                <div className="text-xs font-medium text-white">Waste Auto-Detect</div>
                <div className="text-[11px] text-slate-500">Auto-scan for idle resources every 24h</div>
              </div>
              <button onClick={() => setS('wasteAutoDetect', !merged.wasteAutoDetect)}
                className={`w-10 h-5 rounded-full transition-colors relative ${merged.wasteAutoDetect ? 'bg-orange-500' : 'bg-slate-700'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${merged.wasteAutoDetect ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <button onClick={saveSettings} disabled={savingSettings}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-colors">
              {savingSettings ? <Loader2 size={12} className="animate-spin" /> : null}
              {saved ? '✓ Saved' : 'Save Settings'}
            </button>
          </div>
        </section>
      )}

      {/* AI Copilot */}
      {settings && (
        <section className="bg-[#111827] border border-slate-800/60 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🤖</span>
            <h2 className="text-sm font-bold text-white">AI Copilot</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Choose an AI provider for Copilot. Groq, OpenAI, Anthropic, Google Gemini, and OpenAI-compatible self-hosted endpoints are supported.</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">AI Provider</label>
              <select
                value={merged.aiProvider || 'groq'}
                onChange={e => {
                  const provider = AI_PROVIDERS.find(p => p.value === e.target.value) || AI_PROVIDERS[0]
                  setS('aiProvider', provider.value)
                  setS('aiModel', provider.defaultModel)
                  setS('aiApiKey', '')
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60">
                {AI_PROVIDERS.map(provider => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
              </select>
            </div>
            {(() => {
              const provider = AI_PROVIDERS.find(p => p.value === merged.aiProvider) || AI_PROVIDERS[0]
              const models = provider.models
              return <>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">{provider.keyLabel}</label>
              <div className="relative">
                <input
                  type={showAiKey ? 'text' : 'password'}
                  value={merged.aiApiKey || (merged.aiProvider === 'groq' ? merged.groqApiKey : '')}
                  onChange={e => setS('aiApiKey', e.target.value)}
                  placeholder={provider.placeholder}
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60 font-mono"
                />
                <button type="button" onClick={() => setShowAiKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="text-[11px] text-slate-600 mt-1">Stored locally in settings. Environment variables remain supported for Groq.</div>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">AI Model</label>
              {models.length > 0 ? <select value={merged.aiModel || provider.defaultModel} onChange={e => setS('aiModel', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60">
                {models.map(model => <option key={model.value} value={model.value}>{model.label}</option>)}
              </select> : <input value={merged.aiModel || ''} onChange={e => setS('aiModel', e.target.value)} placeholder="your-model-id"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60 font-mono" />}
            </div>
            {provider.value === 'custom' && <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">OpenAI-Compatible Base URL</label>
              <input value={merged.aiBaseUrl || ''} onChange={e => setS('aiBaseUrl', e.target.value)} placeholder="https://api.example.com/v1"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60 font-mono" />
            </div>}
            <div className="flex items-center gap-2">
              <button type="button" onClick={testAiConnection} disabled={testingAi}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:border-orange-500/40 disabled:opacity-50">
                {testingAi ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Test Connection
              </button>
              {aiTest && <span className={`text-[11px] ${aiTest.ok ? 'text-green-400' : 'text-red-400'}`}>
                {aiTest.message}{aiTest.latencyMs !== undefined ? ` (${aiTest.latencyMs}ms)` : ''}
              </span>}
            </div>
              </>
            })()}
            {copilotUsage
              ? <div className="border-t border-slate-800 pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Today&apos;s Usage</span>
                    <button type="button" onClick={() => mutateCopilotUsage()} className="text-[10px] text-slate-600 hover:text-slate-400">Refresh</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                      <div className="text-xl font-bold text-white">{copilotUsage.today.requests}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Requests</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                      <div className="text-xl font-bold text-white">{copilotUsage.today.promptTokens.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Prompt Tokens</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                      <div className="text-xl font-bold text-orange-400">{copilotUsage.today.completionTokens.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Completion</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Total tokens today</span>
                    <span className="font-mono text-slate-400">{copilotUsage.today.totalTokens.toLocaleString()}</span>
                  </div>
                </div>
              : null}
            <button onClick={saveSettings} disabled={savingSettings}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-colors">
              {savingSettings ? <Loader2 size={12} className="animate-spin" /> : null}
              {saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </section>
      )}

      {showAddAccount && (
        <AccountFormModal
          onClose={() => setShowAddAccount(false)}
          onSave={data => { setShowAddAccount(false); addAccount(data) }}
        />
      )}
      {editingAccount && (
        <AccountFormModal
          existing={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={data => { setEditingAccount(null); editAccount(data) }}
        />
      )}
    </div>
  )
}
