import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { loadSettings } from '@/lib/settings-store'

const PROVIDERS = ['groq', 'openai', 'anthropic', 'google', 'custom'] as const
type Provider = typeof PROVIDERS[number]

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth) return auth

  try {
    const body = await req.json() as { provider?: Provider; apiKey?: string; model?: string; baseUrl?: string }
    const settings = loadSettings()
    const provider = body.provider || settings.aiProvider
    const requestedApiKey = body.apiKey === '***configured***' ? '' : body.apiKey
    const apiKey = requestedApiKey || (provider === 'groq' ? settings.groqApiKey || process.env.GROQ_API_KEY : settings.aiApiKey) || ''
    const model = body.model || settings.aiModel
    const baseUrl = body.baseUrl || settings.aiBaseUrl

    if (!PROVIDERS.includes(provider) || !model) {
      return NextResponse.json({ ok: false, message: 'Provider and model are required' }, { status: 400 })
    }
    if (provider !== 'custom' && !apiKey) {
      return NextResponse.json({ ok: false, message: 'API key is required' }, { status: 400 })
    }
    if (provider === 'custom' && !baseUrl) {
      return NextResponse.json({ ok: false, message: 'Custom provider requires a base URL' }, { status: 400 })
    }

    const started = Date.now()
    const response = await providerRequest(provider, apiKey, model, baseUrl)
    return NextResponse.json({
      ok: response.ok,
      message: response.ok ? `Connected to ${providerLabel(provider)} (${model})` : `${providerLabel(provider)} returned HTTP ${response.status}`,
      latencyMs: Date.now() - started,
    }, { status: response.ok ? 200 : 502 })
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'AI connection test failed' }, { status: 502 })
  }
}

async function providerRequest(provider: Provider, apiKey: string, model: string, baseUrl: string) {
  if (provider === 'google') {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}?key=${encodeURIComponent(apiKey)}`)
  }
  if (provider === 'anthropic') {
    return fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } })
  }
  const root = provider === 'groq' ? 'https://api.groq.com/openai/v1' : provider === 'openai' ? 'https://api.openai.com/v1' : baseUrl.replace(/\/$/, '')
  return fetch(`${root}/models`, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined })
}

function providerLabel(provider: Provider) {
  return provider === 'google' ? 'Google Gemini' : provider === 'custom' ? 'custom endpoint' : provider[0].toUpperCase() + provider.slice(1)
}
