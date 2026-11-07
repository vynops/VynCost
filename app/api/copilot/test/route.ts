import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { requireRole } from '@/lib/auth-server'
import { loadSettings } from '@/lib/settings-store'
import { GROQ_DEFAULT_MODEL, GROQ_RETIRED_MODELS } from '@/lib/copilot-models'

const PROVIDERS = ['groq', 'openai', 'anthropic', 'google', 'custom'] as const
type Provider = typeof PROVIDERS[number]
const TEST_MAX_OUTPUT_TOKENS = 128

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth) return auth

  try {
    const body = await req.json() as { provider?: Provider; apiKey?: string; model?: string; baseUrl?: string }
    const settings = loadSettings()
    const provider = body.provider || settings.aiProvider
    const requestedApiKey = body.apiKey === '***configured***' ? '' : body.apiKey
    const apiKey = requestedApiKey || (provider === 'groq' ? settings.aiApiKey || settings.groqApiKey || process.env.GROQ_API_KEY : settings.aiApiKey) || ''
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

    if (provider === 'groq' && GROQ_RETIRED_MODELS.has(model)) {
      return NextResponse.json({
        ok: false,
        message: `Groq model ${model} is retired. Use ${GROQ_DEFAULT_MODEL} or enter another current model ID.`,
      }, { status: 400 })
    }

    const started = Date.now()
    const resolvedModel = await testModel(provider, apiKey, model, baseUrl)
    return NextResponse.json({
      ok: true,
      message: `Test prompt completed with ${providerLabel(provider)}`,
      model: resolvedModel,
      latencyMs: Date.now() - started,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'AI connection test failed' }, { status: 502 })
  }
}

async function testModel(provider: Provider, apiKey: string, model: string, baseUrl: string): Promise<string> {
  const prompt = 'Reply with OK only.'

  if (provider === 'groq') {
    const completion = await new Groq({ apiKey }).chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_tokens: TEST_MAX_OUTPUT_TOKENS,
      temperature: 0,
    })
    const choice = completion.choices[0]
    if (!choice?.message?.content?.trim()) {
      const reason = choice?.finish_reason ? ` (finish reason: ${choice.finish_reason})` : ''
      throw new Error(`Groq returned no visible text${reason}`)
    }
    return completion.model || model
  }

  if (provider === 'google') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: TEST_MAX_OUTPUT_TOKENS, temperature: 0 } }),
      signal: AbortSignal.timeout(15000),
    })
    const data = await readResponse(response)
    if (!data.candidates?.[0]?.content?.parts?.some(part => part.text)) throw new Error('Model returned an empty response')
    return data.modelVersion || model
  }

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: TEST_MAX_OUTPUT_TOKENS, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(15000),
    })
    const data = await readResponse(response)
    if (!data.content?.some(item => item.type === 'text' && item.text)) throw new Error('Model returned an empty response')
    return data.model || model
  }

  const root = provider === 'openai' ? 'https://api.openai.com/v1' : baseUrl.replace(/\/$/, '')
  const response = await fetch(`${root}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: TEST_MAX_OUTPUT_TOKENS, temperature: 0 }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await readResponse(response)
  if (!data.choices?.[0]?.message?.content) throw new Error('Model returned an empty response')
  return data.model || model
}

type TestResponse = {
  error?: { message?: string }
  message?: string
  model?: string
  modelVersion?: string
  content?: Array<{ type?: string; text?: string }>
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  choices?: Array<{ message?: { content?: string } }>
}

async function readResponse(response: Response): Promise<TestResponse> {
  const data = await response.json().catch(() => ({})) as TestResponse
  if (!response.ok) throw new Error(data.error?.message || data.message || `Provider returned HTTP ${response.status}`)
  return data
}

function providerLabel(provider: Provider) {
  return provider === 'google' ? 'Google Gemini' : provider === 'custom' ? 'custom endpoint' : provider[0].toUpperCase() + provider.slice(1)
}
